import { describe, it, expect, afterAll } from "vitest"
import request from "supertest"
import app from "../src/app.js"
import { prisma } from "../src/lib/prisma.js"

describe("WEAP bridge /api/weap/compare", () => {
  afterAll(async () => {
    await prisma.trashRecord.deleteMany({ where: { source: "test" } })
    await prisma.$disconnect()
  })

  it("compara CSV de WEAP desktop vs adapter y da veredicto", async () => {
    await prisma.trashRecord.create({
      data: {
        latitude: 14.606, longitude: -90.478,
        plasticPercentage: 50, organicPercentage: 20,
        glassPercentage: 5, paperPercentage: 8, metalPercentage: 5,
        otherPercentage: 5, eWastePercentage: 2, hazardousPercentage: 3,
        specialTreatmentPercentage: 2,
        source: "test", outfallCode: "D-03", flowObserved: "fuerte",
      },
    })
    const csv = encodeURIComponent("tramo,plastico,organico,caudal\nD-03,60,25,1.3")
    const res = await request(app).get(`/api/weap/compare?scenarioId=base_2026&csv=${csv}`)
    expect(res.status).toBe(200)
    expect(res.body.weapTotales.plastico).toBe(60)
    expect(res.body.adapterTotales).toBeDefined()
    expect(["calibrado", "revisar supuestos"]).toContain(res.body.veredicto)
    expect(res.body.detalle[0].code).toBe("D-03")
  })

  it("400 sin CSV", async () => {
    const res = await request(app).get("/api/weap/compare?scenarioId=base_2026")
    expect(res.status).toBe(400)
    expect(res.body.code).toBe("MISSING_CSV")
  })
})
