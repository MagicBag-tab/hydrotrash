# backend-trashclient

API for trash detection (Claude 3.5 Sonnet), geographic storage (Turso or SQLite), optional Cloudinary for images, pre-aggregated heat maps, and GeoJSON routes. See **AGENTS.md** for full conventions.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env`
   - **Required**: `ANTHROPIC_API_KEY=sk-ant-...` from [console.anthropic.com](https://console.anthropic.com/)
   - **Optional – Turso**: `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` from [turso.tech](https://turso.tech). If set, the app uses Turso instead of local SQLite.
   - **Optional – Cloudinary**: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` from [cloudinary.com/console](https://cloudinary.com/console) to upload analyzed images.
   - **Optional**: `PORT` (default 3000), `DATABASE_URL` (default `file:./dev.db` for local SQLite).

3. **Database**
   - **Local SQLite**: `npx prisma generate && npx prisma migrate dev`
   - **Turso**: Prisma Migrate doesn’t run against Turso. Generate client and apply schema manually:
     ```bash
     npx prisma generate
     npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > baseline.sql
     turso db shell <your-db-name> < baseline.sql
     ```
     (Re-run the SQL only when the schema changes.)

4. **Run**
   ```bash
   npm run dev
   ```
   Server: `http://localhost:3000`

## API

- **POST `/api/analyze-image`**  
  - Body: `multipart/form-data` with `image` (file) and **required** `latitude`, `longitude` (numbers).  
  - Response: `{ trash: TrashAnalysis, id: string }`.  
  - TrashAnalysis includes: glass, plastic, paper, organic, metal, other, **eWaste**, **hazardous**, **specialTreatment** percentages, plus `description` and `suggestedCleanup`.  
  - A record is always saved (coordinates required). If Cloudinary is configured, the image is uploaded and `imageUrl` is stored.

- **GET `/api/trash`**  
  - Returns all trash records (id, createdAt, lat/lng, all percentages, description, suggestedCleanup, imageUrl, source).

- **GET `/api/trash/:id`**  
  - Returns one trash record by id. Responds with 404 when not found.

- **DELETE `/api/trash/:id`**  
  - Deletes the trash record. Responds with 204 on success, 404 when not found.

- **GET `/api/heatmap?precision=5`**  
  - Pre-aggregated data for heat maps. Returns `{ precision, buckets }` (geohash buckets with count and waste-type totals). `precision` 4–7, default 5.

- **GET `/api/routes/optimized`**  
  - Returns a GeoJSON `FeatureCollection` (MVP: empty). Future: optimized collection route as LineString(s).

- **GET `/health`**  
  - `{ "status": "ok" }`

## Frontend: displaying the optimized route (GeoJSON)

When the backend returns a route as GeoJSON (e.g. a `FeatureCollection` with LineString features):

- **Leaflet**: `L.geoJSON(geojson).addTo(map)` — [Leaflet GeoJSON](https://leafletjs.com/reference.html#geojson)
- **Mapbox GL JS**: `map.addSource('route', { type: 'geojson', data: geojson })` and add a line layer — [Mapbox GeoJSON](https://docs.mapbox.com/mapbox-gl-js/example/data-driven-circle-colors/)
- **deck.gl**: `GeoJsonLayer` — [deck.gl GeoJsonLayer](https://deck.gl/docs/api-reference/layers/geojson-layer)

## Tests

- **Run tests**: `npm test` (uses `test.db`, runs migrations then Vitest).
- **Watch mode**: `npm run test:watch`.
- Covers: health, GET/POST/DELETE trash, GET trash by id, heatmap, routes/optimized, analyze-image validation (400 when image or coordinates missing).

## Tech

- Node.js, TypeScript, Express
- Prisma with **Turso** (libSQL adapter) or SQLite
- **Cloudinary** (optional) for images
- Anthropic SDK (Claude 3.5 Sonnet)
- ngeohash for heat map aggregation
