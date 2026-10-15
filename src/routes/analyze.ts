import { Router } from "express"
import multer from "multer"
import { analyzeImageForTrash } from "../services/claude.js"
import { createTrashRecord, updateTrashRecordImageUrl } from "../services/trash-db.js"
import { uploadTrashImage } from "../services/storage.js"
import { useCloudinary } from "../lib/env.js"
import { getDbErrorMessage } from "../lib/db-error.js"

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
    // Sin API key el servicio devuelve demo heurístico -> marcar fuente
    const isDemo = trash.description?.startsWith("Análisis DEMO") ?? false

    // HydroTrash Fase 1: contexto del punto (opcionales, no rompen clientes viejos)
    const meta = {
      siteType: typeof req.body.siteType === "string" ? req.body.siteType : null,
      outfallCode: typeof req.body.outfallCode === "string" ? req.body.outfallCode : null,
      flowObserved: typeof req.body.flowObserved === "string" ? req.body.flowObserved : null,
      notes: typeof req.body.notes === "string" ? req.body.notes : null,
    }
    const record = await createTrashRecord(trash, lat, lng, isDemo ? "demo" : "claude", null, meta)

    if (useCloudinary()) {
      try {
        const imageUrl = await uploadTrashImage(file.buffer, file.mimetype, record.id)
        await updateTrashRecordImageUrl(record.id, imageUrl)
      } catch (e) {
        console.error("Cloudinary upload failed:", e)
      }
    }

    res.json({ trash, id: record.id, demo: isDemo || undefined })
  } catch (e) {
    console.error("Analyze image error:", e)
    const dbErr = getDbErrorMessage(e)
    if (dbErr) {
      res.status(dbErr.code === "DB_NOT_READY" ? 503 : 500).json({ error: dbErr.message, code: dbErr.code })
    } else {
      res.status(500).json({
        error: e instanceof Error ? e.message : "Failed to analyze image",
        code: "ANALYZE_ERROR",
      })
    }
  }
})

export default router
