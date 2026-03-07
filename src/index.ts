import "dotenv/config"
import { env } from "./lib/env.js"
import app from "./app.js"

app.listen(env.PORT, () => {
  console.log(`Server running at http://localhost:${env.PORT}`)
})
