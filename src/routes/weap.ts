import { Router } from "express"
import multer from "multer"
import { z } from "zod"
import { prisma } from "../lib/prisma.js"
import { listScenarios, runScenario } from "../services/weap.js"

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } })

const rowSchema = z.object({
  elementCode: z.string().trim().min(1).max(100),
  periodStart: z.coerce.date(), periodEnd: z.coerce.date(),
  variable: z.string().trim().min(1).max(100),
  value: z.coerce.number().finite(), unit: z.string().trim().min(1).max(50),
})

function parseImportCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/)
  if (lines.length < 2 || lines.length > 5001) throw new Error("CSV vacío o con más de 5000 filas")
  const delimiter = lines[0].includes(";") ? ";" : ","
  const headers = lines[0].split(delimiter).map((x) => x.trim())
  const required = ["elementCode", "periodStart", "periodEnd", "variable", "value", "unit"]
  const indexes = Object.fromEntries(required.map((h) => [h, headers.indexOf(h)]))
  if (Object.values(indexes).some((i) => i < 0)) throw new Error(`CSV requiere: ${required.join(", ")}`)
  return lines.slice(1).map((line, n) => {
    const cells = line.split(delimiter).map((x) => x.trim().replace(/^"|"$/g, ""))
    const row = Object.fromEntries(required.map((h) => [h, cells[indexes[h]]]))
    const parsed = rowSchema.safeParse({ ...row, value: String(row.value).replace(",", ".") })
    if (!parsed.success || parsed.data.periodEnd < parsed.data.periodStart) throw new Error(`Fila ${n + 2} inválida`)
    return parsed.data
  })
}

router.post("/weap/import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Falta el archivo CSV", code: "MISSING_FILE" })
    const rows = parseImportCsv(req.file.buffer.toString("utf8"))
    const scenario = String(req.body.scenario || "sin_nombre").slice(0, 100)
    const run = await prisma.weapRun.create({
      data: { scenario, modelVersion: req.body.modelVersion || null, originalFileName: req.file.originalname,
        results: { create: rows } }, include: { results: true },
    })
    res.status(201).json({ id: run.id, scenario: run.scenario, importedAt: run.importedAt, resultCount: run.results.length, contract: "elementCode, periodStart, periodEnd, variable, value, unit" })
  } catch (e) { res.status(400).json({ error: e instanceof Error ? e.message : "CSV inválido", code: "WEAP_IMPORT_ERROR" }) }
})

router.get("/weap/runs", async (_req, res) => {
  const runs = await prisma.weapRun.findMany({ orderBy: { importedAt: "desc" }, include: { results: true } })
  res.json(runs)
})

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
      outfallCode: req.query.outfallCode ? String(req.query.outfallCode) : undefined,
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

// Puente WEAP desktop: compara CSV exportado de WEAP real vs adapter.
// GET /api/weap/compare?scenarioId=integral&csv=tramo,plastico,... (o &csvUrl=https://...)
// Ver weap-bridge/README.md para el flujo completo.
function parseWeapCsv(text: string): Array<{ code: string; plastico: number; organico: number; caudal: number }> {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) throw new Error("CSV vacío o sin filas de datos")
  const norm = (s: string) => s.trim().toLowerCase().replace(/["']/g, "")
  const head = lines[0].split(/[;,]/).map(norm)
  const iCode = head.findIndex((h) => ["tramo", "code", "outfall", "desfogue", "nodo"].includes(h))
  const iPlas = head.findIndex((h) => ["plastico", "plástico", "plastic"].includes(h))
  const iOrg = head.findIndex((h) => ["organico", "orgánico", "organic", "dbo"].includes(h))
  const iCau = head.findIndex((h) => ["caudal", "flow", "q"].includes(h))
  if (iCode < 0 || iPlas < 0) throw new Error("CSV debe tener columnas tramo y plastico (ver weap-bridge/README.md)")
  const num = (s: string) => Number(String(s ?? "").trim().replace(",", "."))
  return lines.slice(1).map((ln) => {
    const c = ln.split(/[;,]/)
    return {
      code: String(c[iCode] ?? "").trim(),
      plastico: num(c[iPlas]),
      organico: iOrg >= 0 ? num(c[iOrg]) : 0,
      caudal: iCau >= 0 ? num(c[iCau]) : 0,
    }
  }).filter((r) => r.code)
}

router.get("/weap/compare", async (req, res) => {
  try {
    const scenarioId = String(req.query.scenarioId || "base_2026")
    let csvText = typeof req.query.csv === "string" ? req.query.csv : ""
    const csvUrl = typeof req.query.csvUrl === "string" ? req.query.csvUrl : ""
    if (!csvText && csvUrl) {
      const r = await fetch(csvUrl)
      if (!r.ok) throw new Error(`No se pudo descargar el CSV (HTTP ${r.status})`)
      csvText = await r.text()
    }
    if (!csvText) {
      res.status(400).json({ error: "Pasa ?csv=<texto CSV> o ?csvUrl=<url>. Ver weap-bridge/README.md.", code: "MISSING_CSV" })
      return
    }
    const weapRows = parseWeapCsv(csvText)
    const adapter = await runScenario(scenarioId)
    const byCode = new Map(adapter.nodos.map((n) => [String(n.outfallCode || ""), n]))
    const detalle = weapRows.map((w) => {
      const a = byCode.get(w.code)
      const diff = (wv: number, av: number) => (wv !== 0 ? Number((((av - wv) / Math.abs(wv)) * 100).toFixed(1)) : null)
      return {
        code: w.code,
        weap: { plastico: w.plastico, organico: w.organico, caudal: w.caudal },
        adapter: a ? { plastico: a.cargaPlastico, organica: a.cargaOrganica, caudal: a.caudalRelativo } : null,
        diffPlasticoPct: a ? diff(w.plastico, a.cargaPlastico) : null,
      }
    })
    const sum = (rows: typeof weapRows, k: "plastico" | "organico" | "caudal") =>
      Number(rows.reduce((acc, r) => acc + (Number.isFinite(r[k]) ? r[k] : 0), 0).toFixed(2))
    const weapTotales = { plastico: sum(weapRows, "plastico"), organico: sum(weapRows, "organico"), caudal: sum(weapRows, "caudal") }
    const pct = (b: number, v: number) => (b !== 0 ? Number((((v - b) / Math.abs(b)) * 100).toFixed(1)) : null)
    const diffPct = {
      plasticoPct: pct(weapTotales.plastico, adapter.totales.plastico),
      organicoPct: pct(weapTotales.organico, adapter.totales.organico),
    }
    const maxDiff = Math.max(Math.abs(diffPct.plasticoPct ?? 999), Math.abs(diffPct.organicoPct ?? 0))
    res.json({
      scenario: adapter.scenario,
      weapTotales,
      adapterTotales: adapter.totales,
      diffPct,
      veredicto: maxDiff < 25 ? "calibrado" : "revisar supuestos",
      nota: maxDiff < 25
        ? "Adapter dentro del ±25% de WEAP desktop: supuestos aceptables para el hackatón."
        : "Brecha >25%: ajusta PTAR/biobardas/reforestación o recalibra WEAP con más reportes de campo.",
      detalle,
    })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Failed", code: "WEAP_COMPARE_ERROR" })
  }
})

export default router
