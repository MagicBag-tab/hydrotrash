import { Router } from "express"
import { listScenarios, runScenario } from "../services/weap.js"

const router = Router()

router.get("/weap/scenarios", (_req, res) => {
  res.json(listScenarios())
})

router.get("/weap/results", async (req, res) => {
  try {
    const scenarioId = String(req.query.scenarioId || "base_2026")
    const overrides = {
      ptarRemovalPct: req.query.ptar !== undefined ? Number(req.query.ptar) : undefined,
      reforestacionPct: req.query.refo !== undefined ? Number(req.query.refo) : undefined,
      lluviaFactor: req.query.lluvia !== undefined ? Number(req.query.lluvia) : undefined,
    }
    const clean = Object.fromEntries(Object.entries(overrides).filter(([, v]) => v !== undefined && Number.isFinite(v)))
    const result = await runScenario(scenarioId, clean)
    res.json(result)
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed", code: "WEAP_ERROR" })
  }
})

router.post("/weap/scenarios", async (req, res) => {
  try {
    const { base = "base_2026", ...overrides } = req.body || {}
    const result = await runScenario(String(base), overrides)
    res.json(result)
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed", code: "WEAP_ERROR" })
  }
})

export default router
