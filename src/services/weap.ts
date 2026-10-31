import { listTrashRecords } from "./trash-db.js"

// Adapter WEAP Fase 4 (mock explicable para hackatón).
// WEAP real es desktop/COM sin REST: este adapter calcula escenarios
// a partir de los promedios reales de /api/trash y deja el contrato listo
// para enchufar WEAP real después.
export interface WeapScenarioInput {
  name: string
  ptarRemovalPct?: number // 0-90: remueve orgánico
  biobardas?: boolean // atrapan plástico aguas abajo
  biobardaEfficiencyPct?: number // 0-90
  reforestacionPct?: number // 0-50: baja pico escorrentía
  lluviaFactor?: number // 0.5-1.5: multiplica arrastre
  outfallCode?: string // limita el escenario a un punto o tramo observado
}

export interface WeapNodeResult {
  outfallCode: string | null
  id: string
  cargaPlastico: number
  cargaOrganica: number
  caudalRelativo: number
}

export interface WeapResult {
  scenario: string
  supuestos: string[]
  nodos: WeapNodeResult[]
  totales: { plastico: number; organico: number; caudal: number }
  reduccionVsBase?: { plasticoPct: number; organicoPct: number }
}

const SCENARIOS: Record<string, WeapScenarioInput> = {
  base_2026: { name: "Base 2026 (sin cambios)" },
  monitoreo_actual: { name: "Monitoreo real (datos observados)" },
  control_desfogues: { name: "Control de desfogues (prioridad alta)", biobardas: true, biobardaEfficiencyPct: 35 },
  ptar_60: { name: "PTAR 60% (tratamiento)", ptarRemovalPct: 60 },
  biobardas: { name: "Biobardas inteligentes", biobardas: true, biobardaEfficiencyPct: 55 },
  reforestacion_20: { name: "Reforestación 20%", reforestacionPct: 20 },
  lluvia_extrema: { name: "Lluvia extrema +20%", lluviaFactor: 1.2 },
  integral: {
    name: "Integral (PTAR + biobardas + reforestación)",
    ptarRemovalPct: 60,
    biobardas: true,
    biobardaEfficiencyPct: 55,
    reforestacionPct: 20,
  },
}

export function listScenarios() {
  return Object.entries(SCENARIOS).map(([id, s]) => ({ id, ...s }))
}

export async function runScenario(scenarioId: string, overrides: Partial<WeapScenarioInput> = {}): Promise<WeapResult> {
  const base = SCENARIOS[scenarioId]
  if (!base) throw new Error(`Escenario desconocido: ${scenarioId}`)
  const s: WeapScenarioInput = { ...base, ...overrides }
  const allRecords = await listTrashRecords()
  const records = s.outfallCode ? allRecords.filter((r) => r.outfallCode === s.outfallCode) : allRecords

  const ptar = (s.ptarRemovalPct ?? 0) / 100
  const bio = s.biobardas ? (s.biobardaEfficiencyPct ?? 55) / 100 : 0
  const refo = (s.reforestacionPct ?? 0) / 100
  const lluvia = s.lluviaFactor ?? 1

  const flowFactor = (f: string | null) => (f === "fuerte" ? 1.3 : f === "leve" ? 1 : 0.6)

  const nodos: WeapNodeResult[] = records.map((r) => {
    const caudal = flowFactor(r.flowObserved) * (1 - refo * 0.35) * lluvia
    const plastico = r.plasticPercentage * caudal * (1 - bio * 0.8)
    const organica = r.organicPercentage * caudal * (1 - ptar * 0.9)
    return {
      outfallCode: r.outfallCode,
      id: r.id,
      cargaPlastico: Number(plastico.toFixed(2)),
      cargaOrganica: Number(organica.toFixed(2)),
      caudalRelativo: Number(caudal.toFixed(3)),
    }
  })

  const totales = {
    plastico: Number(nodos.reduce((a, n) => a + n.cargaPlastico, 0).toFixed(2)),
    organico: Number(nodos.reduce((a, n) => a + n.cargaOrganica, 0).toFixed(2)),
    caudal: Number(nodos.reduce((a, n) => a + n.caudalRelativo, 0).toFixed(3)),
  }

  let reduccionVsBase: WeapResult["reduccionVsBase"]
  if (scenarioId !== "base_2026") {
    const baseRes = await runScenario("base_2026")
    const pct = (b: number, v: number) => (b > 0 ? Number((((b - v) / b) * 100).toFixed(1)) : 0)
    reduccionVsBase = { plasticoPct: pct(baseRes.totales.plastico, totales.plastico), organicoPct: pct(baseRes.totales.organico, totales.organico) }
  }

  return {
    scenario: s.name,
    supuestos: [
      `PTAR remueve ${(ptar * 100).toFixed(0)}% de carga orgánica (módulo calidad WEAP).`,
      s.biobardas ? `Biobardas con ${(bio * 100).toFixed(0)}% de eficiencia en plásticos.` : "Sin biobardas.",
      `Reforestación ${(refo * 100).toFixed(0)}%: baja 35% del pico por cada 100% reforestado (recarga).`,
      `Factor lluvia ×${lluvia}: multiplica arrastre y caudal.`,
      `Entradas reales: ${records.length} reportes de /api/trash (promedios Claude/demo).`,
    ],
    nodos,
    totales,
    reduccionVsBase,
  }
}
