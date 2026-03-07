# AGENTS.md – Backend TrashClient

Guidelines for AI agents and developers working on this repo.

## Project overview

**Backend-TrashClient** is the API for a waste detection and collection optimization system (MVP focus):

- **Visual detection**: Claude 3.5 Sonnet analyzes images and classifies waste (including e-waste, hazardous, special treatment).
- **Geographic storage**: Records require latitude/longitude; stored in Turso (or local SQLite for dev).
- **Object storage**: Optional Cloudinary for analyzed images.
- **Heat maps**: Pre-aggregated data by geohash via `GET /api/heatmap`.
- **Route optimization** (planned): GeoJSON output for collection routes; frontend can display with Leaflet/Mapbox.
- **Time prediction**: Deferred; emphasize MVP first.

## Architecture (conceptual)

```
[Frontend] ←→ [This API] ←→ [Claude 3.5 Sonnet] (image → trash analysis)
                ↓                  ↓
           [Turso / SQLite]   [Cloudinary optional]
                ↓
           GET /api/heatmap (pre-aggregated)
           GET /api/routes/optimized (GeoJSON, stub)
```

## Tech stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript
- **API**: Express
- **DB**: Turso (libSQL) via Prisma driver adapter; fallback SQLite for local dev
- **Object storage**: Cloudinary (optional)
- **AI**: Anthropic API (Claude 3.5 Sonnet)
- **Env**: `.env` — `ANTHROPIC_API_KEY` required; `TURSO_*` and `CLOUDINARY_*` optional

## Repo structure

```
backend-trashclient/
├── AGENTS.md
├── .env.example
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── routes/         # analyze, trash, heatmap, routes/optimized
│   ├── services/      # claude, trash-db, storage (Cloudinary)
│   ├── lib/           # env, prisma (Turso adapter when configured)
│   └── types/         # TrashAnalysis, HeatmapBucket, etc.
└── prisma/
    └── schema.prisma
```

## API contract

### POST `/api/analyze-image`

- **Input**: `multipart/form-data` with `image` (file) and **required** `latitude`, `longitude` (numbers).
- **Output**: `{ trash: TrashAnalysis, id: string }`.
- **TrashAnalysis** includes: `glassPercentage`, `plasticPercentage`, `paperPercentage`, `organicPercentage`, `metalPercentage`, `otherPercentage`, `eWastePercentage`, `hazardousPercentage`, `specialTreatmentPercentage`, plus optional `description`, `suggestedCleanup`.
- **Side effect**: Always persists a record (coordinates required). If Cloudinary is configured, uploads image and sets `imageUrl`.

### GET `/api/trash`

- **Output**: List of trash records (id, createdAt, lat/lng, all percentages, description, suggestedCleanup, imageUrl, source).

### GET `/api/trash/:id`

- **Output**: Single trash record. 404 when not found.

### DELETE `/api/trash/:id`

- **Output**: 204 on success. 404 when not found.

### GET `/api/heatmap?precision=5`

- **Output**: Pre-aggregated data for heat maps: `{ precision, buckets: HeatmapBucket[] }`. Each bucket has `geohash`, `latitude`, `longitude`, `count`, and totals per waste type. `precision` 4–7 (default 5).

### GET `/api/routes/optimized`

- **Output**: GeoJSON `FeatureCollection` (MVP: empty features). Future: optimized route as LineString feature(s).
- **Frontend**: Use **Leaflet** (`L.geoJSON(data)`), **Mapbox GL JS** (`addSource` with `type: 'geojson'`), or **deck.gl** to draw the route. See README for links.

## Data model (TrashRecord)

- `id`, `createdAt`, `latitude`, `longitude`
- Percentages: glass, plastic, paper, organic, metal, other, eWaste, hazardous, specialTreatment
- Optional: `description`, `suggestedCleanup`, `imageUrl`, `source`

## Conventions for agents

1. **Env**: Never commit `.env`. Use `.env.example`. Turso and GCS are optional.
2. **Coordinates**: Required for `POST /api/analyze-image`; return 400 with `MISSING_COORDINATES` if absent.
3. **Types**: Shared types in `src/types/trash.ts` (TrashAnalysis, HeatmapBucket, etc.).
4. **Errors**: JSON `{ error: string, code?: string }` with appropriate status codes.
5. **Claude**: Model `claude-3-5-sonnet-20241022`; prompt includes e-waste, hazardous, special treatment.
6. **DB**: Prisma with driver adapter for Turso when `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are set. Migrations: use `prisma migrate diff` + `turso db shell` for Turso (see README).
7. **MVP**: Time prediction and full route optimizer are later; keep API shape (GeoJSON, heatmap) ready.

## Quick start

1. `npm install`
2. Copy `.env.example` to `.env`; set `ANTHROPIC_API_KEY`. For Turso set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`; for Cloudinary set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
3. **Local SQLite**: `npx prisma generate && npx prisma migrate dev`
4. **Turso**: `npx prisma generate`; apply schema with `prisma migrate diff` + `turso db shell` (see README).
5. `npm run dev` → `http://localhost:3000`

## Frontend: displaying GeoJSON routes

- **Leaflet**: `L.geoJSON(geojson).addTo(map)` — [Leaflet GeoJSON](https://leafletjs.com/reference.html#geojson)
- **Mapbox GL JS**: `map.addSource('route', { type: 'geojson', data: geojson })` then add a line layer — [Mapbox GeoJSON](https://docs.mapbox.com/mapbox-gl-js/example/data-driven-circle-colors/)
- **deck.gl**: Use `GeoJsonLayer` with the same GeoJSON — [deck.gl GeoJsonLayer](https://deck.gl/docs/api-reference/layers/geojson-layer)
