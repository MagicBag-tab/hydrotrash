# Puente HydroTrash ↔ WEAP desktop (con licencia)

WEAP es una app de escritorio Windows — **no corre dentro de Docker/Linux**.
Este puente conecta tu modelo WEAP real con el adapter en 3 pasos, sin romper nada.

## Flujo

```
[WEAP desktop + licencia]  exporta CSV de resultados por tramo
        │  (Results → Export to CSV)
        ▼
[HydroTrash adapter]  GET /api/weap/compare?scenarioId=integral&csv=<url|texto>
        │  compara cargas WEAP reales vs adapter
        ▼
[Frontend → pestaña WEAP]  muestra % diferencia + veredicto calibrado/no calibrado
```

## Paso 1 — Modela en WEAP desktop

1. Abre tu área `Contreras.weap` (o crea una con los 6 tramos D-01…D-07).
2. Crea escenarios con los mismos nombres que el adapter:
   `Base 2026`, `PTAR 60%`, `Biobardas`, `Reforestación 20%`, `Lluvia extrema`, `Integral`.
3. Corre el modelo y exporta resultados: `Results → Water Quality / Supply` → `Export to CSV`.

## Paso 2 — Formato CSV esperado

Cabecera mínima (nombres flexibles, insensibles a mayúsculas):

```csv
tramo,plastico,organico,caudal
D-01,12.5,8.2,1.3
D-03,20.1,9.0,1.3
D-07,35.4,15.6,1.9
```

- `tramo` = código de desfogue (`outfallCode`: D-01, D-03…).
- `plastico`, `organico`, `caudal` = cargas o concentraciones por tramo.
- Se acepta `;` como separador y coma decimal.

## Paso 3 — Compara con el adapter

```bash
# Opción A: pega el CSV como texto (URL-encoded)
curl "http://localhost:3000/api/weap/compare?scenarioId=integral&csv=tramo%2Cplastico%2Corganico%2Ccaudal%0AD-01%2C12.5%2C8.2%2C1.3"

# Opción B: el CSV vive en una URL accesible
curl "http://localhost:3000/api/weap/compare?scenarioId=integral&csvUrl=https://tu-sitio/resultados.csv"
```

Respuesta: `{ scenario, adapterTotales, weapTotales, diffPct, veredicto, detalle[] }`.
Veredicto: `calibrado` si ambas cargas difieren <25%, si no `revisar supuestos`.

## Nota para el jurado

El adapter (`src/services/weap.ts`) usa **entradas reales** de `/api/trash`
(fotos + Claude). WEAP desktop aporta la hidrología calibrada. El endpoint
`/api/weap/compare` mide la brecha entre ambos — eso es calibración honesta,
no números inventados.
