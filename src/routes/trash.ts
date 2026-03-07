import { Router } from "express"
import { listTrashRecords } from "../services/trash-db.js"

const router = Router()

router.get("/trash", async (_req, res) => {
  try {
    const records = await listTrashRecords()
    const payload = records.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      latitude: r.latitude,
      longitude: r.longitude,
      glassPercentage: r.glassPercentage,
      plasticPercentage: r.plasticPercentage,
      paperPercentage: r.paperPercentage,
      organicPercentage: r.organicPercentage,
      metalPercentage: r.metalPercentage,
      otherPercentage: r.otherPercentage,
      eWastePercentage: r.eWastePercentage,
      hazardousPercentage: r.hazardousPercentage,
      specialTreatmentPercentage: r.specialTreatmentPercentage,
      description: r.description,
      suggestedCleanup: r.suggestedCleanup,
      imageUrl: r.imageUrl,
      source: r.source,
    }))
    res.json(payload)
  } catch (e) {
    console.error("List trash error:", e)
    res.status(500).json({
      error: e instanceof Error ? e.message : "Failed to list trash records",
      code: "LIST_ERROR",
    })
  }
})

export default router
