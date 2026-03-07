# AGENTS.md – Backend TrashClient

Guidelines for AI agents and developers working on this repo.

## Project overview

**Backend-TrashClient** is the API for a waste detection and collection optimization system:

- **Visual detection**: Images are analyzed (Claude 3.5 Sonnet / future YOLO) to detect trash and classify waste types.
- **Geographic storage**: Detection results are stored with coordinates for mapping and routing.
- **Time prediction** (planned): Model to predict waste accumulation over time.
- **Route optimization** (planned): Algorithm to optimize collection routes.
- **Frontend**: Dashboard consumes this API (heat maps, routes, trash records).

## Architecture (conceptual)

```
[Frontend] ←→ [This API] ←→ [Claude 3.5 Sonnet] (image → trash analysis)
                ↓
           [Database]  (trash records + lat/lng + metadata)
                ↓
           (Future: time model, route optimizer)
```

## Tech stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript
- **API**: Express
- **DB**: SQLite (dev) / PostgreSQL (prod) via Prisma
- **AI**: Anthropic API (Claude 3.5 Sonnet) for image-based trash analysis
- **Env**: `.env` for `ANTHROPIC_API_KEY` and `DATABASE_URL`

## Repo structure

```
backend-trashclient/
├── AGENTS.md           # This file
├── .env.example        # Template; copy to .env and add keys
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts        # App entry, server start
│   ├── routes/         # API routes
│   ├── services/       # Claude, DB, etc.
│   ├── lib/            # Prisma client, env validation
│   └── types/          # Shared TS types (TrashAnalysis, etc.)
└── prisma/
    └── schema.prisma   # Trash record + geo position
```

## API contract

### POST `/api/analyze-image`

- **Input**: `multipart/form-data` with `image` (file) and optional `latitude`, `longitude`.
- **Output**: `{ trash: TrashAnalysis }` where `TrashAnalysis` has:
  - `glassPercentage: number`
  - `plasticPercentage: number`
  - `paperPercentage: number`
  - `organicPercentage: number`
  - `metalPercentage: number`
  - `otherPercentage: number`
  - (and/or a short `description` / `suggestedCleanup` if needed)
- **Side effect**: Optionally persist a record to DB with geo position for frontend consumption.

### GET `/api/trash` (or `/api/trash-records`)

- **Output**: List of stored trash records (with coordinates and waste breakdown) for the dashboard/heat maps.

## Data model (Trash record for DB)

- `id`, `createdAt`
- `latitude`, `longitude`
- Percentages (or JSON): glass, plastic, paper, organic, metal, other
- Optional: `imageUrl` or stored path, `source` (e.g. "claude"), `suggestedCleanup`

## Conventions for agents

1. **Env**: Never commit `.env`. Use `.env.example` with placeholder keys; document in README.
2. **Types**: Define shared response/request types in `src/types/` and reuse (e.g. `TrashAnalysis`).
3. **Errors**: Return consistent JSON errors (e.g. `{ error: string, code?: string }`) and appropriate HTTP status codes.
4. **Claude**: Use the official `@anthropic-ai/sdk`, model `claude-3-5-sonnet-20241022` (or latest 3.5 Sonnet). Send image as base64 in the messages API.
5. **DB**: All writes go through Prisma; keep migrations in `prisma/migrations`.
6. **Future**: Keep route optimization and time-prediction logic in separate modules so they can be swapped (e.g. YOLO vs Claude) without breaking the API.

## Quick start (for humans)

1. `npm install`
2. Copy `.env.example` to `.env`, add `ANTHROPIC_API_KEY` (and `DATABASE_URL` if using PostgreSQL).
3. `npx prisma generate && npx prisma migrate dev`
4. `npm run dev` → API runs (e.g. `http://localhost:3000`).

## Questions to align with product

- **YOLO vs Claude**: Use Claude for MVP; YOLO can be added later as a separate detector and results merged.
- **Geo**: Always require lat/lng from client, or infer from image EXIF if available.
- **Auth**: Not in MVP; add when needed (e.g. API key or JWT for dashboard).

---

## Questions to clarify before implementation (for product/team)

1. **Geo required?** Should every analysis require `latitude`/`longitude` to be stored, or is it optional (analyze without saving)?
2. **More waste categories?** Do you need e-waste, hazardous, or other types beyond glass/plastic/paper/organic/metal/other?
3. **Time prediction**: Will it be a separate service (Python?) or same Node app? Same DB table or separate?
4. **Route optimizer**: Input = list of trash records + vehicle capacity? Output = ordered route (e.g. GeoJSON)?
5. **Heat maps**: Should the API expose aggregated geo data (e.g. by tile/region) or does the frontend aggregate from `/api/trash`?
