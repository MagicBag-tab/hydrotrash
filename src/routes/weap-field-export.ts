import { Router } from "express"
import { listTrashRecords } from "../services/trash-db.js"

const router = Router()

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

// Exportación de observaciones de campo: no modifica WEAP ni la base de datos.
router.get("/weap/field-export", async (_req, res) => {
  try {
    const records = await listTrashRecords()
    const headers = [
      "elementCode", "capturedAt", "latitude", "longitude", "siteType", "flowObserved",
      "plasticPercentage", "organicPercentage", "paperPercentage", "glassPercentage",
      "metalPercentage", "eWastePercentage", "chemicalHazardousPercentage", "otherPercentage",
    ]
    const rows = records.map((record) => [
      record.outfallCode || record.id,
      record.createdAt.toISOString(),
      record.latitude,
      record.longitude,
      record.siteType,
      record.flowObserved,
      record.plasticPercentage,
      record.organicPercentage,
      record.paperPercentage,
      record.glassPercentage,
      record.metalPercentage,
      record.eWastePercentage,
      record.hazardousPercentage + record.specialTreatmentPercentage,
      record.otherPercentage,
    ])
    res.type("text/csv").send("\ufeff" + [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n"))
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Failed to export field observations", code: "FIELD_EXPORT_ERROR" })
  }
})

export default router
