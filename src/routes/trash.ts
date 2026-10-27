import { Router } from "express"
import { listTrashRecords, getTrashRecordById, deleteTrashRecord } from "../services/trash-db.js"
import { getDbErrorMessage } from "../lib/db-error.js"
import { prisma } from "../lib/prisma.js"

const router = Router()

function toRecordPayload(r: Awaited<ReturnType<typeof listTrashRecords>>[number]) {
  return {
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
    siteType: r.siteType,
    outfallCode: r.outfallCode,
    flowObserved: r.flowObserved,
    notes: r.notes,
  }
}

router.get("/trash", async (_req, res) => {
  try {
    const records = await listTrashRecords()
    res.json(records.map(toRecordPayload))
  } catch (e) {
    console.error("List trash error:", e)
    const dbErr = getDbErrorMessage(e)
    if (dbErr) {
      res.status(dbErr.code === "DB_NOT_READY" ? 503 : 500).json({ error: dbErr.message, code: dbErr.code })
    } else {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed to list trash records", code: "LIST_ERROR" })
    }
  }
})

router.get("/trash/:id", async (req, res) => {
  try {
    const record = await getTrashRecordById(req.params.id)
    if (!record) {
      res.status(404).json({ error: "Trash record not found", code: "NOT_FOUND" })
      return
    }
    const observation = record.observationId ? await prisma.observation.findUnique({ where: { id: record.observationId }, include: { review: true, point: true } }) : null
    res.json({ ...toRecordPayload(record), observation })
  } catch (e) {
    console.error("Get trash error:", e)
    const dbErr = getDbErrorMessage(e)
    if (dbErr) {
      res.status(dbErr.code === "DB_NOT_READY" ? 503 : 500).json({ error: dbErr.message, code: dbErr.code })
    } else {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed to get trash record", code: "GET_ERROR" })
    }
  }
})

router.delete("/trash/:id", async (req, res) => {
  try {
    const record = await getTrashRecordById(req.params.id)
    if (!record) {
      res.status(404).json({ error: "Trash record not found", code: "NOT_FOUND" })
      return
    }
    await deleteTrashRecord(req.params.id)
    res.status(204).send()
  } catch (e) {
    console.error("Delete trash error:", e)
    const dbErr = getDbErrorMessage(e)
    if (dbErr) {
      res.status(dbErr.code === "DB_NOT_READY" ? 503 : 500).json({ error: dbErr.message, code: dbErr.code })
    } else {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed to delete trash record", code: "DELETE_ERROR" })
    }
  }
})

// Revisión humana conservando el análisis original. La corrección es un JSON parcial de categorías visibles.
router.post("/trash/:id/review", async (req, res) => {
  try {
    const record = await getTrashRecordById(req.params.id)
    if (!record) return res.status(404).json({ error: "Trash record not found", code: "NOT_FOUND" })
    const status = String(req.body?.status || "approved")
    if (!["approved", "corrected", "rejected"].includes(status)) return res.status(400).json({ error: "status inválido", code: "INVALID_REVIEW" })
    let observation = record.observationId ? await prisma.observation.findUnique({ where: { id: record.observationId } }) : null
    if (!observation) {
      observation = await prisma.observation.create({ data: { capturedAt: record.createdAt, photoUrl: record.imageUrl, notes: record.notes, provenance: record.source || "unknown" } })
      await prisma.trashRecord.update({ where: { id: record.id }, data: { observationId: observation.id } })
    }
    const review = await prisma.humanReview.upsert({ where: { observationId: observation.id }, create: { observationId: observation.id, status, correctionsJson: JSON.stringify(req.body?.corrections || null) }, update: { status, correctionsJson: JSON.stringify(req.body?.corrections || null), reviewedAt: new Date() } })
    res.json({ id: review.id, observationId: observation.id, status: review.status, originalAiPreserved: true })
  } catch (e) { res.status(400).json({ error: e instanceof Error ? e.message : "Review failed", code: "REVIEW_ERROR" }) }
})

export default router
