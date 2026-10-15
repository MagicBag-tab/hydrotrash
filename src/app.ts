import express from "express"
import cors from "cors"
import analyzeRoutes from "./routes/analyze.js"
import trashRoutes from "./routes/trash.js"
import heatmapRoutes from "./routes/heatmap.js"
import routesOptimized from "./routes/routes-optimized.js"
import { env } from "./lib/env.js"

const app = express()
// HydroTrash frontend (Vite) corre en otro origen/puerto -> habilitar CORS
app.use(
  cors({
    origin: env.FRONTEND_URL ? env.FRONTEND_URL.split(",").map((s) => s.trim()) : true,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
)
app.use(express.json())

app.use("/api", analyzeRoutes)
app.use("/api", trashRoutes)
app.use("/api", heatmapRoutes)
app.use("/api/routes", routesOptimized)

app.get("/health", (_req, res) => {
  res.json({ status: "ok" })
})

// Central error handler: unhandled errors from routes return JSON
import { getDbErrorMessage } from "./lib/db-error.js"
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err)
  const dbErr = getDbErrorMessage(err)
  if (dbErr) {
    res.status(dbErr.code === "DB_NOT_READY" ? 503 : 500).json({ error: dbErr.message, code: dbErr.code })
  } else {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error", code: "INTERNAL_ERROR" })
  }
})

export default app
