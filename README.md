# backend-trashclient

API for trash detection (Claude 3.5 Sonnet), geographic storage (Turso or SQLite), optional Cloudinary for images, pre-aggregated heat maps, and GeoJSON routes. See **AGENTS.md** for full conventions.

---

## How to run everything

### Prerequisites

- **Node.js 20+** and **npm**
- **Anthropic API key** for image analysis — get one at [console.anthropic.com](https://console.anthropic.com/)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set at least:

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | **Yes** | API key from [console.anthropic.com](https://console.anthropic.com/) (needed for `POST /api/analyze-image`) |
| `DATABASE_URL` | No | Default `file:./dev.db` for local SQLite |
| `TURSO_DATABASE_URL` | No | If set with `TURSO_AUTH_TOKEN`, app uses Turso instead of SQLite |
| `TURSO_AUTH_TOKEN` | No | From [turso.tech](https://turso.tech) when using Turso |
| `CLOUDINARY_*` | No | Cloud name, API key, API secret from [cloudinary.com/console](https://cloudinary.com/console) to upload analyzed images |
| `PORT` | No | Server port (default `3000`) |

### 3. Set up the database

**Option A – Local SQLite (simplest)**

```bash
npx prisma generate
npx prisma migrate dev
```

**Option B – Turso (remote libSQL)**

1. Create a database at [turso.tech](https://turso.tech) and get `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
2. In `.env`, set those two variables. Keep `DATABASE_URL="file:./dev.db"` so Prisma CLI still works.
3. Generate the client and apply the schema manually (Prisma Migrate does not run against Turso):

   ```bash
   npx prisma generate
   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > baseline.sql
   turso db shell <your-db-name> < baseline.sql
   ```

   Re-run the SQL only when the schema changes.

**Option C – Manual SQLite (no Prisma Migrate)**

If you can’t use `prisma migrate dev`:

```bash
npx prisma generate
# From project root (creates dev.db):
sqlite3 dev.db < prisma/init.sql
```

### 4. Run the server

**Development (watch mode, auto-reload):**

```bash
npm run dev
```

**Production (build then run):**

```bash
npm run build
npm start
```

Server base URL: **http://localhost:3000** (or the `PORT` you set).

### 5. Verify it’s running

- Open or request: **http://localhost:3000/health**  
  You should see: `{ "status": "ok" }`.

---

## API

- **POST `/api/analyze-image`**  
  Body: `multipart/form-data` with `image` (file) and **required** `latitude`, `longitude` (numbers).  
  Response: `{ trash: TrashAnalysis, id: string }`.  
  TrashAnalysis includes: glass, plastic, paper, organic, metal, other, **eWaste**, **hazardous**, **specialTreatment** percentages, plus `description` and `suggestedCleanup`.  
  A record is always saved (coordinates required). If Cloudinary is configured, the image is uploaded and `imageUrl` is stored.

- **GET `/api/trash`**  
  Returns all trash records (id, createdAt, lat/lng, all percentages, description, suggestedCleanup, imageUrl, source).

- **GET `/api/trash/:id`**  
  Returns one trash record by id. 404 when not found.

- **DELETE `/api/trash/:id`**  
  Deletes the trash record. 204 on success, 404 when not found.

- **GET `/api/heatmap?precision=5`**  
  Pre-aggregated data for heat maps. Returns `{ precision, buckets }` (geohash buckets with count and waste-type totals). `precision` 4–7, default 5.

- **GET `/api/routes/optimized`**  
  Returns a GeoJSON `FeatureCollection` (MVP: empty). Future: optimized collection route as LineString(s).

- **GET `/health`**  
  `{ "status": "ok" }`

---

## Frontend: displaying the optimized route (GeoJSON)

When the backend returns a route as GeoJSON (e.g. a `FeatureCollection` with LineString features):

- **Leaflet**: `L.geoJSON(geojson).addTo(map)` — [Leaflet GeoJSON](https://leafletjs.com/reference.html#geojson)
- **Mapbox GL JS**: `map.addSource('route', { type: 'geojson', data: geojson })` and add a line layer — [Mapbox GeoJSON](https://docs.mapbox.com/mapbox-gl-js/example/data-driven-circle-colors/)
- **deck.gl**: `GeoJsonLayer` — [deck.gl GeoJsonLayer](https://deck.gl/docs/api-reference/layers/geojson-layer)

---

## Tests

- **Run tests**: `npm test` (uses `test.db`, runs migrations then Vitest).
- **Watch mode**: `npm run test:watch`.

Covers: health, GET/POST/DELETE trash, GET trash by id, heatmap, routes/optimized, analyze-image validation (400 when image or coordinates missing).

---

## Other useful commands

| Command | Description |
|--------|-------------|
| `npm run dev` | Start dev server with watch |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled app (after `npm run build`) |
| `npm test` | Run tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npx prisma studio` | Open Prisma Studio to inspect/edit DB |

---

## Tech

- Node.js, TypeScript, Express
- Prisma with **Turso** (libSQL adapter) or SQLite
- **Cloudinary** (optional) for images
- Anthropic SDK (Claude 3.5 Sonnet)
- ngeohash for heat map aggregation
