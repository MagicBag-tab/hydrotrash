import { Router } from "express"
import { listTrashRecords, getTrashRecordById } from "../services/trash-db.js"
import { traceOrigin } from "../services/trace.js"
import { getDbErrorMessage } from "../lib/db-error.js"

const router = Router()

// Catálogo de desfogues con último análisis (para mapa + WEAP)
router.get("/outfalls", async (_req, res) => {
  try {
    const records = await listTrashRecords()
    const byCode = new Map<string, (typeof records)[number]>()
    for (const r of records) {
      if (!r.outfallCode) continue
      if (!byCode.has(r.outfallCode)) byCode.set(r.outfallCode, r)
    }
    res.json(
      Array.from(byCode.values()).map((r) => ({
        code: r.outfallCode,
        id: r.id,
        latitude: r.latitude,
        longitude: r.longitude,
        siteType: r.siteType,
        flowObserved: r.flowObserved,
        plasticPercentage: r.plasticPercentage,
        hazardousPercentage: r.hazardousPercentage,
        createdAt: r.createdAt.toISOString(),
      }))
    )
  } catch (e) {
    const dbErr = getDbErrorMessage(e)
    res.status(dbErr ? 500 : 500).json({ error: e instanceof Error ? e.message : "Failed", code: "OUTFALLS_ERROR" })
  }
})

// Trazabilidad: ¿de dónde viene la contaminación que llega a :toId?
router.get("/contamination/trace", async (req, res) => {
  try {
    const toId = String(req.query.toId || "")
    if (!toId) {
      res.status(400).json({ error: "toId es requerido (id del punto aguas abajo).", code: "MISSING_TOID" })
      return
    }
    const target = await getTrashRecordById(toId)
    if (!target) {
      res.status(404).json({ error: "Punto no encontrado", code: "NOT_FOUND" })
      return
    }
    const radiusKm = Math.min(10, Math.max(0.1, Number(req.query.radius) || 1.5))
    const candidates = await traceOrigin(toId, radiusKm, 3)
    res.json({
      to: { id: target.id, code: target.outfallCode, latitude: target.latitude, longitude: target.longitude },
      candidates,
      metodo: "Heurística Fase 2: distancia + similitud de firma (plástico/orgánico/peligroso) + flujo. V2 usará DEM y dirección de flujo.",
    })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Failed", code: "TRACE_ERROR" })
  }
})

export default router
