import { defineConfig } from "vitest/config"
import { resolve } from "path"

export default defineConfig({
  test: {
    env: {
      ANTHROPIC_API_KEY: "test",
      DATABASE_URL: "file:./test.db",
    },
    globals: false,
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
})
