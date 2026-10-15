# HydroTrash frontend — solo sirve el build local con nginx (rápido, sin npm en Docker).
# El build de Vite se hace en tu máquina (npm run build) y Docker solo copia dist/.
# Por qué: `npm ci` dentro de Docker falla con ETIMEDOUT hacia registry.npmjs.org
# desde WSL, y el contexto de 71MB (node_modules) ralentiza todo.
FROM nginx:alpine AS runtime
COPY dist /usr/share/nginx/html
EXPOSE 80
