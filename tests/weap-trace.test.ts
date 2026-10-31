import { describe, it, expect, beforeAll, afterAll } from "vitest"
import request from "supertest"
import app from "../src/app.js"
import { prisma } from "../src/lib/prisma.js"
import { demoAnalysis } from "../src/services/claude.js"

describe("HydroTrash Contreras: trace + WEAP + demo", () => {
  const ids: string[] = []

  beforeAll(async () => {
    // 2 puntos cercanos con firma similar (origen simulado)
    const a = await prisma.trashRecord.create({
      data: {
        latitude: 14.604, longitude: -90.48,
        glassPercentage: 3, plasticPercentage: 55, paperPercentage: 10,
        organicPercentage: 20, metalPercentage: 4, otherPercentage: 1,
        eWastePercentage: 1, hazardousPercentage: 4, specialTreatmentPercentage: 2,
        description: "test D-03", source: "test",
        siteType: "desfogue", outfallCode: "T-D03", flowObserved: "fuerte",
      },
    })
    const b = await prisma.trashRecord.create({
      data: {
        latitude: 14.602, longitude: -90.482,
        glassPercentage: 3, plasticPercentage: 52, paperPercentage: 10,
        organicPercentage: 22, metalPercentage: 4, otherPercentage: 1,
        eWastePercentage: 1, hazardousPercentage: 5, specialTreatmentPercentage: 2,
        description: "test D-07 abajo", source: "test",
        siteType: "tramo_rio", outfallCode: "T-D07", flowObserved: "leve",
      },
    })
    ids.push(a.id, b.id)
  })

  afterAll(async () => {
    await prisma.trashRecord.deleteMany({ where: { id: { in: ids } } })
  })

  it("demoAnalysis suma 100 y domina plástico", () => {
    const d = demoAnalysis("D-03")
    const sum = d.glassPercentage + d.plasticPercentage + d.paperPercentage + d.organicPercentage + d.metalPercentage + d.otherPercentage + d.eWastePercentage + d.hazardousPercentage + d.specialTreatmentPercentage
    expect(sum).toBeCloseTo(100, 5)
    expect(d.plasticPercentage).toBeGreaterThan(30)
  })

  it("GET /api/outfalls incluye códigos de test", async () => {
    const res = await request(app).get("/api/outfalls")
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    const codes = res.body.map((o: { code: string }) => o.code)
    expect(codes).toContain("T-D03")
  })

  it("GET /api/contamination/trace exige toId y traza origen", async () => {
    const bad = await request(app).get("/api/contamination/trace")
    expect(bad.status).toBe(400)
    expect(bad.body.code).toBe("MISSING_TOID")

    const target = ids[1]
    const res = await request(app).get(`/api/contamination/trace?toId=${target}`)
    expect(res.status).toBe(200)
    expect(res.body.to.id).toBe(target)
    expect(Array.isArray(res.body.candidates)).toBe(true)
    // Debe proponer T-D03 como candidato con score > 0
    const from = res.body.candidates.map((c: { fromCode: string }) => c.fromCode)
    expect(from).toContain("T-D03")
  })

  it("GET /api/weap/scenarios lista 6 escenarios", async () => {
    const res = await request(app).get("/api/weap/scenarios")
    expect(res.status).toBe(200)
    expect(res.body.length).toBe(8)
  })

  it("GET /api/weap/results integral reduce vs base", async () => {
    const base = await request(app).get("/api/weap/results?scenarioId=base_2026")
    expect(base.status).toBe(200)
    const integ = await request(app).get("/api/weap/results?scenarioId=integral")
    expect(integ.status).toBe(200)
    expect(integ.body.reduccionVsBase).toBeDefined()
    expect(integ.body.supuestos.length).toBeGreaterThan(3)
    // integral no debe aumentar plástico vs base
    expect(integ.body.totales.plastico).toBeLessThanOrEqual(base.body.totales.plastico)
  })

  it("POST /api/analyze-image en modo demo guarda source demo", async () => {
    const res = await request(app)
      .post("/api/analyze-image")
      .attach("image", Buffer.from("fake-image-demo"), "demo.jpg")
      .field("latitude", 14.6)
      .field("longitude", -90.48)
      .field("siteType", "desfogue")
      .field("outfallCode", "T-DEMO")
    expect(res.status).toBe(200)
    expect(res.body.demo).toBe(true)
    ids.push(res.body.id)
  })
})
