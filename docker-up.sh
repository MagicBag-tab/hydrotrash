# HydroTrash · Arranque
#
# MODO ACTUAL (recomendado): frontend en Docker + backend local.
# Por qué: la red intercepta el TLS hacia Docker Hub (x509) y `npm ci`
# dentro de Docker da ETIMEDOUT. Así evitamos ambas cosas:
#
#   1. Frontend dockerizado (imagen ya compilada, sin red):
#        docker start hydrotrash-front  (o: docker run -d --name hydrotrash-front -p 8080:80 hydrotrash-frontend:latest)
#        → http://localhost:8080
#   2. Backend local (usa tu red + tu caché de npm):
#        npm install && npm run build && npm start
#        → http://localhost:3000
#
# MODO FULL-DOCKER (cuando la red lo permita):
#   IMPORTANTE: node_modules de Windows NO sirven en Linux.
#   Regenera en WSL primero (Linux glibc, compatible con node:20-slim):
#     wsl -e bash -lc "cd /mnt/c/Users/sarah/Universidad/YO/hydrotrash && npm install && npm run build"
#   Luego frontend en Windows y compose en WSL:
#     cd frontend && npm run build && cd ..
#     wsl docker compose up --build -d
#   → backend :3000 + frontend :8080 (ver docker-compose.yml)
#
# URLs:
#   Backend  → http://localhost:3000
#   Frontend → http://localhost:8080  (Docker) o http://localhost:5173 (npm run dev)
#
# Demo Contreras (6 desfogues) + puente WEAP con licencia:
#   curl -X POST http://localhost:3000/api/demo/seed-contreras
#   curl "http://localhost:3000/api/weap/compare?scenarioId=integral&csv=tramo%2Cplastico%2Corganico%2Ccaudal%0AD-01%2C55%2C20%2C1.3"
#   (ver weap-bridge/README.md para exportar el CSV desde WEAP desktop)

docker start hydrotrash-front 2>/dev/null || docker run -d --name hydrotrash-front -p 8080:80 hydrotrash-frontend:latest
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
curl -s http://localhost:3000/health; echo
curl -s -o /dev/null -w "FRONT:%{http_code}\n" http://localhost:8080/
