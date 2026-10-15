import { Router } from "express"
import { prisma } from "../lib/prisma.js"
import { demoAnalysis } from "../services/claude.js"
import { createTrashRecord, listTrashRecords } from "../services/trash-db.js"
import { getDbErrorMessage } from "../lib/db-error.js"

const router = Router()

// Seed demo del Contreras: 6 desfogues encadenados (~0.4 km entre sí)
// para que la trazabilidad con radio 1.5 km muestre cadena limpia.
// Eje Santa Catarina Pinula / Zona 15.
const SEED_POINTS = [
  { code: "D-01", lat: 14.612, lng: -90.472, siteType: "desfogue", flow: "fuerte", notes: "Carretera a El Salvador, descarga directa" },
  { code: "D-02", lat: 14.609, lng: -90.475, siteType: "desfogue", flow: "leve", notes: "Residencial, arrastre plásticos" },
  { code: "D-03", lat: 14.606, lng: -90.478, siteType: "desfogue", flow: "fuerte", notes: "Vista Hermosa, probable origen" },
  { code: "A-11", lat: 14.603, lng: -90.481, siteType: "alcantarilla", flow: "leve", notes: "Alcantarilla urbana" },
  { code: "D-05", lat: 14.6, lng: -90.484, siteType: "desfogue", flow: "leve", notes: "Tramo medio" },
  { code: "D-07", lat: 14.597, lng: -90.487, siteType: "tramo_rio", flow: "fuerte", notes: "Desembocadura, punto aguas abajo" },
]

router.post("/demo/seed-contreras", async (req, res) => {
  try {
    const force = req.query.force === "1"
    if (force) {
      await prisma.trashRecord.deleteMany({ where: { OR: [{ source: "demo" }, { source: "test" }] } })
    }
    const existing = await listTrashRecords()
    if (existing.length > 0) {
      res.json({ seeded: 0, message: `Ya hay ${existing.length} reportes. Usa ?force=1 para resembrar.` })
      return
    }
    const created = []
    for (const p of SEED_POINTS) {
      const analysis = demoAnalysis(p.code)
      const r = await createTrashRecord(analysis, p.lat, p.lng, "demo", null, {
        siteType: p.siteType,
        outfallCode: p.code,
        flowObserved: p.flow,
        notes: p.notes,
      })
      created.push({ id: r.id, code: p.code })
    }
    res.json({ seeded: created.length, points: created })
  } catch (e) {
    const dbErr = getDbErrorMessage(e)
    res.status(dbErr ? 500 : 500).json({ error: e instanceof Error ? e.message : "Failed", code: "SEED_ERROR" })
  }
})

export default router
