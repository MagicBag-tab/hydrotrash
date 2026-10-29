import { describe, it, expect, beforeAll, afterAll } from "vitest"
import request from "supertest"
import app from "../src/app.js"
import { prisma } from "../src/lib/prisma.js"

describe("API endpoints", () => {
  let createdId: string

  afterAll(async () => {
    if (createdId) {
      try {
        await prisma.trashRecord.delete({ where: { id: createdId } })
      } catch {
        // ignore
      }
    }
  })

  describe("GET /health", () => {
    it("returns 200 and status ok", async () => {
      const res = await request(app).get("/health")
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ status: "ok" })
    })
  })

  describe("GET /api/trash", () => {
    it("returns 200 and array (empty or with records)", async () => {
      const res = await request(app).get("/api/trash")
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })
  })

  describe("POST /api/trash (insert via createTrashRecord)", () => {
    it("insert is done via POST /api/analyze-image; GET list returns created record after insert", async () => {
      // We insert directly with Prisma for test (analyze-image requires Claude + image)
      const record = await prisma.trashRecord.create({
        data: {
          latitude: -12.04,
          longitude: -77.04,
          glassPercentage: 10,
          plasticPercentage: 20,
          paperPercentage: 15,
          organicPercentage: 25,
          metalPercentage: 5,
          otherPercentage: 25,
          eWastePercentage: 0,
          hazardousPercentage: 0,
          specialTreatmentPercentage: 0,
          description: "Test insert",
          source: "test",
        },
      })
      createdId = record.id

      const res = await request(app).get("/api/trash")
      expect(res.status).toBe(200)
      const found = res.body.find((r: { id: string }) => r.id === record.id)
      expect(found).toBeDefined()
      expect(found.latitude).toBe(-12.04)
      expect(found.longitude).toBe(-77.04)
      expect(found.description).toBe("Test insert")
    })
  })

  describe("GET /api/trash/:id", () => {
    it("returns 200 and record when id exists", async () => {
      if (!createdId) return
      const res = await request(app).get(`/api/trash/${createdId}`)
      expect(res.status).toBe(200)
      expect(res.body.id).toBe(createdId)
      expect(res.body.latitude).toBe(-12.04)
      expect(res.body.description).toBe("Test insert")
    })

    it("returns 404 when id does not exist", async () => {
      const res = await request(app).get("/api/trash/nonexistent-id-12345")
      expect(res.status).toBe(404)
      expect(res.body.error).toContain("not found")
      expect(res.body.code).toBe("NOT_FOUND")
    })
  })

  describe("GET /api/heatmap", () => {
    it("returns 200 and precision + buckets", async () => {
      const res = await request(app).get("/api/heatmap")
      expect(res.status).toBe(200)
      expect(typeof res.body.precision).toBe("number")
      expect(Array.isArray(res.body.buckets)).toBe(true)
    })

    it("accepts precision query param", async () => {
      const res = await request(app).get("/api/heatmap?precision=6")
      expect(res.status).toBe(200)
      expect(res.body.precision).toBe(6)
    })
  })

  describe("GET /api/routes/optimized", () => {
    it("returns 200 and GeoJSON FeatureCollection", async () => {
      const res = await request(app).get("/api/routes/optimized")
      expect(res.status).toBe(200)
      expect(res.body.type).toBe("FeatureCollection")
      expect(Array.isArray(res.body.features)).toBe(true)
    })
  })

  describe("POST /api/analyze-image", () => {
    it("returns 400 when image is missing", async () => {
      const res = await request(app)
        .post("/api/analyze-image")
        .field("latitude", -12.04)
        .field("longitude", -77.04)
      expect(res.status).toBe(400)
      expect(res.body.error).toBeDefined()
    })

    it("returns 400 when latitude/longitude are missing", async () => {
      // Send a minimal image so we pass the "image required" check and hit the coordinates check
      const res = await request(app)
        .post("/api/analyze-image")
        .attach("image", Buffer.from("fake-image"), "image.jpg")
      expect(res.status).toBe(400)
      expect(res.body.code).toBe("MISSING_COORDINATES")
    })
  })

  describe("DELETE /api/trash/:id", () => {
    it("returns 404 when id does not exist", async () => {
      const res = await request(app).delete("/api/trash/nonexistent-id-12345")
      expect(res.status).toBe(404)
      expect(res.body.code).toBe("NOT_FOUND")
    })

    it("returns 204 and deletes record when id exists", async () => {
      const record = await prisma.trashRecord.create({ data: { latitude: -12.05, longitude: -77.05, source: "test-delete" } })
      const res = await request(app).delete(`/api/trash/${record.id}`)
      expect(res.status).toBe(204)

      const getRes = await request(app).get(`/api/trash/${record.id}`)
      expect(getRes.status).toBe(404)
    })
  })
})
