import { Router } from "express"
import multer from "multer"
import { analyzeImageForTrash } from "../services/claude.js"
import { createTrashRecord, updateTrashRecordImageUrl } from "../services/trash-db.js"
import { uploadTrashImage } from "../services/storage.js"
import { useGcs } from "../lib/env.js"

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
})

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const

const router = Router()

router.post("/analyze-image", upload.single("image"), async (req, res) => {
  try {
    const file = req.file
    if (!file) {
      res.status(400).json({ error: "Missing image file. Send as multipart/form-data with field 'image'." })
      return
    }
    if (!ALLOWED_TYPES.includes(file.mimetype as (typeof ALLOWED_TYPES)[number])) {
      res.status(400).json({ error: "Invalid image type. Use JPEG, PNG, GIF, or WebP." })
      return
    }

    const latRaw = req.body.latitude
    const lngRaw = req.body.longitude
    const lat = latRaw != null ? Number(latRaw) : NaN
    const lng = lngRaw != null ? Number(lngRaw) : NaN
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      res.status(400).json({
        error: "latitude and longitude are required (numbers).",
        code: "MISSING_COORDINATES",
      })
      return
    }

    const base64 = file.buffer.toString("base64")
    const mediaType = file.mimetype as "image/jpeg" | "image/png" | "image/gif" | "image/webp"

    const trash = await analyzeImageForTrash(base64, mediaType)

    const record = await createTrashRecord(trash, lat, lng, "claude", null)

    if (useGcs()) {
      try {
        const imageUrl = await uploadTrashImage(file.buffer, file.mimetype, record.id)
        await updateTrashRecordImageUrl(record.id, imageUrl)
      } catch (e) {
        console.error("GCS upload failed:", e)
      }
    }

    res.json({ trash, id: record.id })
  } catch (e) {
    console.error("Analyze image error:", e)
    res.status(500).json({
      error: e instanceof Error ? e.message : "Failed to analyze image",
      code: "ANALYZE_ERROR",
    })
  }
})

export default router
