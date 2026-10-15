import { listTrashRecords } from "./trash-db.js"

// Heurística Fase 2: ¿qué punto aguas-arriba explica la contaminación de un punto bajo?
// Sin DEM: usa distancia + similitud de firma (plástico/orgánico/peligroso) + flujo.
function distKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

function signature(r: { plasticPercentage: number; organicPercentage: number; hazardousPercentage: number }) {
  return [r.plasticPercentage, r.organicPercentage, r.hazardousPercentage]
}

function cosine(a: number[], b: number[]): number {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0)
  const na = Math.sqrt(a.reduce((s, v) => s + v * v, 0))
  const nb = Math.sqrt(b.reduce((s, v) => s + v * v, 0))
  if (!na || !nb) return 0
  return dot / (na * nb)
}

export interface TraceCandidate {
  fromId: string
  fromCode: string | null
  distanceKm: number
  similarity: number
  score: number
  reason: string
}

export async function traceOrigin(toId: string, radiusKm = 1.5, limit = 3): Promise<TraceCandidate[]> {
  const records = await listTrashRecords()
  const target = records.find((r) => r.id === toId)
  if (!target) return []
  const tSig = signature(target)
  return records
    .filter((r) => r.id !== toId)
    .map((r) => {
      const d = distKm(target.latitude, target.longitude, r.latitude, r.longitude)
      const sim = cosine(tSig, signature(r))
      // penaliza distancia, premia firma similar + flujo fuerte
      const flowBonus = r.flowObserved === "fuerte" ? 8 : r.flowObserved === "leve" ? 3 : 0
      const score = Math.max(0, Math.min(100, sim * 80 - d * 25 + flowBonus + (r.plasticPercentage > 40 ? 5 : 0)))
      return {
        fromId: r.id,
        fromCode: r.outfallCode,
        distanceKm: Number(d.toFixed(3)),
        similarity: Number(sim.toFixed(3)),
        score: Number(score.toFixed(1)),
        reason:
          d > radiusKm
            ? `Fuera de radio (${d.toFixed(2)} km) pero firma ${sim >= 0.9 ? "muy similar" : "similar"}`
            : `A ${d.toFixed(2)} km, firma ${(sim * 100).toFixed(0)}% similar, flujo ${r.flowObserved || "desconocido"}`,
      }
    })
    .filter((c) => c.distanceKm <= radiusKm || c.similarity >= 0.95)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
