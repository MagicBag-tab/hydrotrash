import "dotenv/config"
import express from "express"
import { env } from "./lib/env.js"
import analyzeRoutes from "./routes/analyze.js"
import trashRoutes from "./routes/trash.js"
import heatmapRoutes from "./routes/heatmap.js"
import routesOptimized from "./routes/routes-optimized.js"

const app = express()
app.use(express.json())

app.use("/api", analyzeRoutes)
app.use("/api", trashRoutes)
app.use("/api", heatmapRoutes)
app.use("/api/routes", routesOptimized)

app.get("/health", (_req, res) => {
  res.json({ status: "ok" })
})

app.listen(env.PORT, () => {
  console.log(`Server running at http://localhost:${env.PORT}`)
})
