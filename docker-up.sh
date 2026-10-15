# HydroTrash · Docker rápido
#
# POR QUÉ este flujo: `npm ci` dentro de Docker falla con ETIMEDOUT hacia
# registry.npmjs.org desde WSL, y mandar 71MB (node_modules) de contexto
# ralentiza todo. Así que:
#   1. Build del frontend en LOCAL (usa tu red + tu caché de npm, ~2s).
#   2. Docker solo construye el backend y sirve frontend/dist con nginx.
#
# REQUISITO: Docker Desktop abierto (la ballenita en la bandeja).
# Si `docker compose` da "cannot find the file specified", abre Docker Desktop
# y espera a que diga "Engine running", luego reintenta.
#
# PASO 1 — build local del frontend (PowerShell o WSL):
#   cd frontend; npm run build; cd ..
#
# PASO 2 — levantar todo:
#   docker compose up --build -d
#   curl http://localhost:3000/health
#   curl http://localhost:8080/          # frontend dockerizado
#
# URLs con Docker:
#   Backend  → http://localhost:3000
#   Frontend → http://localhost:8080  (sirve dist/ compilado)
#   Dev Vite → http://localhost:5173  (npm run dev, sin Docker)
#
# Si el backend vuelve a dar ETIMEDOUT de npm en su build, reintenta:
# suele ser intermitente. Opcional: precargar la imagen base:
#   docker pull node:20-alpine && docker pull nginx:alpine

docker compose up --build -d
docker compose ps
curl -s http://localhost:3000/health; echo
curl -s -o /dev/null -w "FRONT:%{http_code}\n" http://localhost:8080/

# Sembrar demo Contreras (6 desfogues) y probar puente WEAP:
curl -s -X POST http://localhost:3000/api/demo/seed-contreras; echo
curl -s "http://localhost:3000/api/weap/compare?scenarioId=base_2026&csv=tramo%2Cplastico%2Corganico%2Ccaudal%0AD-01%2C40%2C20%2C1.3%0AD-03%2C55%2C22%2C1.3"; echo
