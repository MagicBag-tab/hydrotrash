import { Router } from "express"

const router = Router()

/** GeoJSON FeatureCollection for optimized route (LineString features when implemented). */
interface RouteGeoJSON {
  type: "FeatureCollection"
  features: Array<{ type: "Feature"; geometry: { type: "LineString"; coordinates: [number, number][] }; properties?: Record<string, unknown> }>
}

/**
 * GET /api/routes/optimized
 * Returns optimized collection route as GeoJSON (MVP: stub).
 * Future: input vehicle capacity, depot; run TSP/VRP and return route.
 *
 * Frontend: use Leaflet (L.geoJSON), Mapbox GL (addSource type 'geojson'),
 * or deck.gl to display the line.
 */
router.get("/optimized", async (_req, res) => {
  try {
    // Stub: empty FeatureCollection. Replace with real optimizer later.
    const geojson: RouteGeoJSON = {
      type: "FeatureCollection",
      features: [],
    }
    res.json(geojson)
  } catch (e) {
    console.error("Routes optimized error:", e)
    res.status(500).json({
      error: e instanceof Error ? e.message : "Failed to get route",
      code: "ROUTES_ERROR",
    })
  }
})

export default router
