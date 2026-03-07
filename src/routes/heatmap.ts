import { Router } from "express"
import geohash from "ngeohash"
import { listTrashRecords } from "../services/trash-db.js"
import type { HeatmapBucket } from "../types/trash.js"

const router = Router()

/**
 * GET /api/heatmap?precision=5
 * Returns pre-aggregated data by geohash for heat maps.
 * precision: 4–7 typical (4 = large areas, 7 = finer grid). Default 5.
 */
router.get("/heatmap", async (req, res) => {
  try {
    const precision = Math.min(7, Math.max(4, Number(req.query.precision) || 5))
    const records = await listTrashRecords()

    const buckets = new Map<string, HeatmapBucket>()

    for (const r of records) {
      const hash = geohash.encode(r.latitude, r.longitude, precision)
      const existing = buckets.get(hash)
      const decoded = geohash.decode(hash)
      const lat = decoded.latitude
      const lng = decoded.longitude

      if (existing) {
        existing.count += 1
        existing.totalGlass += r.glassPercentage
        existing.totalPlastic += r.plasticPercentage
        existing.totalPaper += r.paperPercentage
        existing.totalOrganic += r.organicPercentage
        existing.totalMetal += r.metalPercentage
        existing.totalOther += r.otherPercentage
        existing.totalEWaste += r.eWastePercentage
        existing.totalHazardous += r.hazardousPercentage
        existing.totalSpecialTreatment += r.specialTreatmentPercentage
      } else {
        buckets.set(hash, {
          geohash: hash,
          latitude: lat,
          longitude: lng,
          count: 1,
          totalGlass: r.glassPercentage,
          totalPlastic: r.plasticPercentage,
          totalPaper: r.paperPercentage,
          totalOrganic: r.organicPercentage,
          totalMetal: r.metalPercentage,
          totalOther: r.otherPercentage,
          totalEWaste: r.eWastePercentage,
          totalHazardous: r.hazardousPercentage,
          totalSpecialTreatment: r.specialTreatmentPercentage,
        })
      }
    }

    const payload = Array.from(buckets.values())
    res.json({ precision, buckets: payload })
  } catch (e) {
    console.error("Heatmap error:", e)
    res.status(500).json({
      error: e instanceof Error ? e.message : "Failed to build heatmap",
      code: "HEATMAP_ERROR",
    })
  }
})

export default router
