import { Router } from "express"
import { listObservationPoints } from "../services/trash-db.js"

const router = Router()

router.get("/observation-points", async (_req, res) => {
  try {
    const points = await listObservationPoints()
    res.json(points.map((point) => ({ id: point.id, code: point.code, name: point.name, latitude: point.latitude, longitude: point.longitude, weapElementCode: point.weapElementCode, observationCount: point._count.observations, createdAt: point.createdAt.toISOString() })))
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Failed to list observation points", code: "POINTS_ERROR" })
  }
})

export default router
