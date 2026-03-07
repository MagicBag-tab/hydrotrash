# Documentación del Backend TrashClient

API para detección de residuos (Claude 3.5 Sonnet) y almacenamiento geográfico para optimización de recolección.

---

## Índice

1. [Descripción general](#1-descripción-general)
2. [Arquitectura](#2-arquitectura)
3. [Stack tecnológico](#3-stack-tecnológico)
4. [Estructura del repositorio](#4-estructura-del-repositorio)
5. [Configuración y variables de entorno](#5-configuración-y-variables-de-entorno)
6. [Modelo de datos](#6-modelo-de-datos)
7. [Tipos TypeScript](#7-tipos-typescript)
8. [API REST](#8-api-rest)
9. [Servicios](#9-servicios)
10. [Librerías internas](#10-librerías-internas)
11. [Tests](#11-tests)
12. [Scripts y comandos](#12-scripts-y-comandos)

---

## 1. Descripción general

**Backend-TrashClient** es la API del sistema de detección de residuos y optimización de recolección (enfoque MVP):

- **Detección visual**: Claude 3.5 Sonnet analiza imágenes y clasifica residuos (incluyendo e-waste, peligrosos y de tratamiento especial).
- **Almacenamiento geográfico**: Los registros requieren latitud/longitud; se guardan en Turso o SQLite local.
- **Almacenamiento de objetos**: Opcional Cloudinary para imágenes analizadas.
- **Mapas de calor**: Datos pre-agregados por geohash vía `GET /api/heatmap`.
- **Optimización de rutas** (planificado): Salida GeoJSON para rutas de recolección; el frontend puede mostrarlas con Leaflet/Mapbox.

---

## 2. Arquitectura

```
[Frontend] ←→ [Esta API] ←→ [Claude 3.5 Sonnet] (imagen → análisis de residuos)
                ↓                  ↓
           [Turso / SQLite]   [Cloudinary opcional]
                ↓
           GET /api/heatmap (pre-agregado)
           GET /api/routes/optimized (GeoJSON, stub)
```

### Flujo de una petición de análisis

1. El cliente envía `POST /api/analyze-image` con imagen (multipart) y coordenadas.
2. La API valida imagen y coordenadas.
3. Se llama a Claude con la imagen en base64; Claude devuelve un JSON con porcentajes y texto.
4. Se normalizan los porcentajes (suma 100) y se persiste un `TrashRecord` en la base de datos.
5. Si Cloudinary está configurado, se sube la imagen y se actualiza `imageUrl` del registro.
6. Se responde con `{ trash, id }`.

---

## 3. Stack tecnológico

| Componente      | Tecnología |
|-----------------|------------|
| Runtime         | Node.js 20+ |
| Lenguaje        | TypeScript |
| API             | Express |
| Base de datos   | Turso (libSQL) vía adaptador Prisma, o SQLite para desarrollo local |
| Almacenamiento  | Cloudinary (opcional) |
| IA              | Anthropic API (Claude 3.5 Sonnet) |
| Validación env  | Zod |
| Tests           | Vitest + Supertest |

---

## 4. Estructura del repositorio

```
backend-trashclient/
├── AGENTS.md           # Guía para agentes IA y desarrolladores
├── DOCUMENTATION.md    # Esta documentación
├── .env.example       # Plantilla de variables de entorno
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── prisma/
│   └── schema.prisma  # Modelo Prisma (TrashRecord)
├── src/
│   ├── index.ts       # Punto de entrada: carga env, arranca servidor
│   ├── app.ts         # Express: monta rutas y health
│   ├── routes/
│   │   ├── analyze.ts         # POST /api/analyze-image
│   │   ├── trash.ts           # GET/DELETE /api/trash, GET/DELETE /api/trash/:id
│   │   ├── heatmap.ts         # GET /api/heatmap
│   │   └── routes-optimized.ts # GET /api/routes/optimized
│   ├── services/
│   │   ├── claude.ts   # Análisis de imagen con Claude
│   │   ├── trash-db.ts # CRUD de TrashRecord
│   │   └── storage.ts  # Subida a Cloudinary
│   ├── lib/
│   │   ├── env.ts     # Carga y validación de .env (Zod)
│   │   └── prisma.ts  # Cliente Prisma (SQLite o Turso)
│   └── types/
│       └── trash.ts   # TrashAnalysis, HeatmapBucket, etc.
└── tests/
    └── api.test.ts   # Tests de endpoints
```

---

## 5. Configuración y variables de entorno

Copia `.env.example` a `.env` y rellena los valores.

### Requeridas

| Variable            | Descripción |
|---------------------|-------------|
| `ANTHROPIC_API_KEY` | Clave de API de Anthropic para Claude. Obtener en https://console.anthropic.com/ |

### Base de datos

| Variable        | Descripción |
|-----------------|-------------|
| `DATABASE_URL`  | Para desarrollo local con SQLite: `file:./dev.db` (por defecto). |

### Turso (opcional)

Si están definidas, la app usa Turso en lugar de SQLite:

| Variable              | Descripción |
|-----------------------|-------------|
| `TURSO_DATABASE_URL`  | URL de la base Turso (ej. `libsql://nombre-db-org.turso.io`) |
| `TURSO_AUTH_TOKEN`    | Token de autenticación Turso |

### Cloudinary (opcional)

Si están definidas, las imágenes analizadas se suben a Cloudinary:

| Variable                 | Descripción |
|--------------------------|-------------|
| `CLOUDINARY_CLOUD_NAME`  | Nombre de la nube |
| `CLOUDINARY_API_KEY`     | API Key |
| `CLOUDINARY_API_SECRET`  | API Secret |

Credenciales en https://cloudinary.com/console

### Servidor

| Variable | Descripción |
|----------|-------------|
| `PORT`   | Puerto del servidor (por defecto `3000`) |

---

## 6. Modelo de datos

### Prisma: `TrashRecord`

Definido en `prisma/schema.prisma`:

| Campo                         | Tipo     | Descripción |
|------------------------------|----------|-------------|
| `id`                         | String   | CUID, clave primaria |
| `createdAt`                  | DateTime | Fecha de creación |
| `latitude`                   | Float    | Latitud |
| `longitude`                  | Float    | Longitud |
| `glassPercentage`            | Float    | % vidrio (default 0) |
| `plasticPercentage`          | Float    | % plástico |
| `paperPercentage`            | Float    | % papel |
| `organicPercentage`          | Float    | % orgánico |
| `metalPercentage`            | Float    | % metal |
| `otherPercentage`            | Float    | % otros |
| `eWastePercentage`           | Float    | % e-waste |
| `hazardousPercentage`       | Float    | % peligrosos |
| `specialTreatmentPercentage` | Float    | % tratamiento especial |
| `description`                | String?  | Descripción opcional |
| `suggestedCleanup`           | String?  | Sugerencia de limpieza |
| `imageUrl`                   | String?  | URL de imagen (Cloudinary) |
| `source`                     | String?  | Origen del registro (ej. "claude", "test") |

---

## 7. Tipos TypeScript

Definidos en `src/types/trash.ts`.

### `TrashAnalysis`

Respuesta del análisis de imagen (y datos que se persisten):

```ts
interface TrashAnalysis {
  glassPercentage: number
  plasticPercentage: number
  paperPercentage: number
  organicPercentage: number
  metalPercentage: number
  otherPercentage: number
  eWastePercentage: number
  hazardousPercentage: number
  specialTreatmentPercentage: number
  description?: string
  suggestedCleanup?: string
}
```

### `TrashRecordResponse`

Registro tal como se devuelve en la API (extiende `TrashAnalysis`):

```ts
interface TrashRecordResponse extends TrashAnalysis {
  id: string
  createdAt: string   // ISO
  latitude: number
  longitude: number
  imageUrl?: string | null
  source?: string | null
}
```

### `HeatmapBucket`

Cubo de agregación para el heatmap:

```ts
interface HeatmapBucket {
  geohash: string
  latitude: number
  longitude: number
  count: number
  totalGlass: number
  totalPlastic: number
  totalPaper: number
  totalOrganic: number
  totalMetal: number
  totalOther: number
  totalEWaste: number
  totalHazardous: number
  totalSpecialTreatment: number
}
```

---

## 8. API REST

Base URL: `http://localhost:3000` (o el `PORT` configurado).

### Formato de errores

Las respuestas de error son JSON:

```json
{
  "error": "mensaje legible",
  "code": "CODIGO_OPCIONAL"
}
```

Códigos usados: `MISSING_COORDINATES`, `ANALYZE_ERROR`, `LIST_ERROR`, `GET_ERROR`, `NOT_FOUND`, `DELETE_ERROR`, `HEATMAP_ERROR`, `ROUTES_ERROR`.

---

### Health

#### `GET /health`

Comprueba que el servidor está en marcha.

**Respuesta 200**

```json
{ "status": "ok" }
```

---

### Análisis de imagen

#### `POST /api/analyze-image`

Analiza una imagen con Claude y guarda un registro con coordenadas.

**Content-Type:** `multipart/form-data`

**Campos:**

| Campo        | Tipo   | Requerido | Descripción |
|-------------|--------|-----------|-------------|
| `image`     | File   | Sí        | Imagen (JPEG, PNG, GIF, WebP). Máx. 10 MB. |
| `latitude`  | number | Sí        | Latitud |
| `longitude` | number | Sí        | Longitud |

**Respuesta 200**

```json
{
  "trash": {
    "glassPercentage": 10,
    "plasticPercentage": 20,
    "paperPercentage": 15,
    "organicPercentage": 25,
    "metalPercentage": 5,
    "otherPercentage": 25,
    "eWastePercentage": 0,
    "hazardousPercentage": 0,
    "specialTreatmentPercentage": 0,
    "description": "short description of what you see",
    "suggestedCleanup": "brief recommendation"
  },
  "id": "clxxx..."
}
```

**Errores**

- **400**: Falta `image` o tipo no permitido; mensaje en `error`.
- **400** `MISSING_COORDINATES`: Faltan o no son números `latitude`/`longitude`.
- **500** `ANALYZE_ERROR`: Fallo en Claude o en el procesamiento.

**Efectos secundarios:** Siempre se crea un `TrashRecord`. Si Cloudinary está configurado, se sube la imagen y se actualiza `imageUrl`.

---

### Registros de residuos

#### `GET /api/trash`

Lista todos los registros, ordenados por `createdAt` descendente.

**Respuesta 200**

Array de objetos con forma `TrashRecordResponse` (id, createdAt, lat/lng, todos los porcentajes, description, suggestedCleanup, imageUrl, source).

---

#### `GET /api/trash/:id`

Devuelve un registro por `id`.

**Respuesta 200**

Un objeto `TrashRecordResponse`.

**Respuesta 404**

```json
{ "error": "Trash record not found", "code": "NOT_FOUND" }
```

---

#### `DELETE /api/trash/:id`

Elimina el registro con ese `id`.

**Respuesta 204**

Sin cuerpo.

**Respuesta 404**

```json
{ "error": "Trash record not found", "code": "NOT_FOUND" }
```

---

### Heatmap

#### `GET /api/heatmap?precision=5`

Devuelve datos pre-agregados por geohash para mapas de calor.

**Query**

| Parámetro   | Tipo   | Default | Descripción |
|------------|--------|---------|-------------|
| `precision`| number | 5       | Precisión del geohash (4–7). 4 = áreas grandes, 7 = malla más fina. Se fuerza al rango 4–7. |

**Respuesta 200**

```json
{
  "precision": 5,
  "buckets": [
    {
      "geohash": "6gkzw",
      "latitude": -12.04,
      "longitude": -77.04,
      "count": 3,
      "totalGlass": 15,
      "totalPlastic": 30,
      "totalPaper": 20,
      "totalOrganic": 25,
      "totalMetal": 10,
      "totalOther": 0,
      "totalEWaste": 0,
      "totalHazardous": 0,
      "totalSpecialTreatment": 0
    }
  ]
}
```

---

### Rutas optimizadas

#### `GET /api/routes/optimized`

Devuelve la ruta de recolección optimizada en GeoJSON (MVP: stub vacío).

**Respuesta 200**

```json
{
  "type": "FeatureCollection",
  "features": []
}
```

En el futuro se devolverán features de tipo `LineString` con la ruta. El frontend puede usar Leaflet (`L.geoJSON(data)`), Mapbox GL (`addSource` con `type: 'geojson'`) o deck.gl para dibujar la ruta.

---

## 9. Servicios

### `src/services/claude.ts`

- **`analyzeImageForTrash(imageBase64, mediaType)`**  
  Envía la imagen a Claude 3.5 Sonnet (`claude-3-5-sonnet-20241022`), parsea el JSON de respuesta, normaliza los porcentajes para que sumen 100 y devuelve un `TrashAnalysis`.  
  El prompt pide clasificación estándar más e-waste, peligrosos y tratamiento especial.

### `src/services/trash-db.ts`

- **`createTrashRecord(analysis, latitude, longitude, source?, imageUrl?)`**  
  Crea un `TrashRecord` en la base de datos.
- **`updateTrashRecordImageUrl(id, imageUrl)`**  
  Actualiza solo `imageUrl` del registro.
- **`listTrashRecords()`**  
  Lista todos los registros ordenados por `createdAt` desc.
- **`getTrashRecordById(id)`**  
  Devuelve un registro por id o `null`.
- **`deleteTrashRecord(id)`**  
  Elimina el registro.

### `src/services/storage.ts`

- **`uploadTrashImage(buffer, mimeType, id)`**  
  Sube la imagen a Cloudinary en la carpeta `trash/` con `public_id` igual al `id` del registro. Devuelve la URL pública.  
  Solo tiene efecto si Cloudinary está configurado en `env`.

---

## 10. Librerías internas

### `src/lib/env.ts`

- Carga y valida variables de entorno con **Zod**.
- Exporta `env` (tipado con `Env`) y lanza si falta `ANTHROPIC_API_KEY` o la validación falla.
- **`useTurso()`**: `true` si están definidos `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`.
- **`useCloudinary()`**: `true` si están definidos los tres valores de Cloudinary.

### `src/lib/prisma.ts`

- Si `useTurso()` es verdadero, crea un cliente `@libsql/client` y usa `@prisma/adapter-libsql` para Prisma.
- Si no, usa el `PrismaClient` por defecto (SQLite con `DATABASE_URL`).
- Singleton global para no crear múltiples clientes en desarrollo.

---

## 11. Tests

- **Herramientas:** Vitest, Supertest.
- **Base de datos en tests:** `DATABASE_URL=file:./test.db` (ver `package.json` script `test`).
- **Archivo:** `tests/api.test.ts`.

Cobertura de endpoints:

- `GET /health` → 200 y `{ status: "ok" }`.
- `GET /api/trash` → 200 y array.
- Inserción vía Prisma y comprobación en `GET /api/trash`.
- `GET /api/trash/:id` → 200 con registro existente, 404 con id inexistente.
- `GET /api/heatmap` → 200 con `precision` y `buckets`; query `precision=6`.
- `GET /api/routes/optimized` → 200 y GeoJSON `FeatureCollection`.
- `POST /api/analyze-image` → 400 sin imagen; 400 con `MISSING_COORDINATES` sin coordenadas.
- `DELETE /api/trash/:id` → 404 para id inexistente, 204 y borrado efectivo para id existente.

Ejecución:

```bash
npm run test
```

Con watch:

```bash
npm run test:watch
```

---

## 12. Scripts y comandos

| Comando            | Descripción |
|--------------------|-------------|
| `npm run dev`      | Arranca el servidor con `tsx watch` (recarga al cambiar código). |
| `npm run build`    | Compila TypeScript a `dist/`. |
| `npm start`        | Ejecuta `node dist/index.js` (producción). |
| `npm run test`     | Ejecuta migraciones en `test.db` y corre Vitest. |
| `npm run test:watch` | Vitest en modo watch. |
| `npm run db:generate` | Genera el cliente Prisma. |
| `npm run db:migrate`  | Migraciones en desarrollo (SQLite). |
| `npm run db:studio`   | Abre Prisma Studio. |

### Puesta en marcha rápida

1. `npm install`
2. Copiar `.env.example` a `.env` y configurar al menos `ANTHROPIC_API_KEY`.
3. **SQLite local:**  
   `npx prisma generate && npx prisma migrate dev`
4. **Turso:**  
   `npx prisma generate` y aplicar el schema con `prisma migrate diff` + `turso db shell` (ver README/AGENTS si aplica).
5. `npm run dev` → servidor en `http://localhost:3000`

---

## Resumen de endpoints

| Método | Ruta                    | Descripción |
|--------|-------------------------|-------------|
| GET    | `/health`               | Health check |
| POST   | `/api/analyze-image`    | Analizar imagen y guardar registro |
| GET    | `/api/trash`            | Listar registros |
| GET    | `/api/trash/:id`        | Obtener un registro |
| DELETE | `/api/trash/:id`        | Eliminar un registro |
| GET    | `/api/heatmap?precision=5` | Datos para heatmap por geohash |
| GET    | `/api/routes/optimized` | GeoJSON de ruta (stub vacío) |
