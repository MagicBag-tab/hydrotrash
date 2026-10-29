import { z } from "zod"

const envSchema = z.object({
  // Opcional para hackatón: sin key real la API usa análisis DEMO heurístico (source "demo").
  // Pon tu key real (sk-ant-...) para usar Claude 3.5 Sonnet.
  ANTHROPIC_API_KEY: z.string().optional().default("demo"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional().default("gemini-2.5-flash"),
  AI_PROVIDER: z.enum(["anthropic", "gemini", "demo"]).default("anthropic"),
  // Prisma CLI (generate, migrate) requires this and only accepts file: for SQLite. At runtime, if TURSO_* are set, the app uses Turso and ignores this.
  DATABASE_URL: z.string().refine((url) => url.startsWith("file:"), {
    message: "DATABASE_URL must start with file: (required by Prisma). When using Turso, set this to file:./dev.db and set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN for the app.",
  }).default("file:./dev.db"),
  PORT: z.coerce.number().default(3000),
  // Frontend URL(s) for CORS – comma separated, e.g. http://localhost:5173
  FRONTEND_URL: z.string().optional(),
  // Turso (optional – when set, app uses Turso at runtime; DATABASE_URL still needed for prisma generate/migrate)
  TURSO_DATABASE_URL: z.string().optional(),
  TURSO_AUTH_TOKEN: z.string().optional(),
  // Cloudinary (optional – when set, images are uploaded to Cloudinary)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    console.error("Invalid environment:", parsed.error.flatten().fieldErrors)
    throw new Error("Invalid environment variables. Check .env and .env.example.")
  }
  return parsed.data
}

export const env = loadEnv()

export function useTurso(): boolean {
  const url = process.env.TURSO_DATABASE_URL
  const token = process.env.TURSO_AUTH_TOKEN
  return Boolean(url && token)
}

export function useCloudinary(): boolean {
  const name = process.env.CLOUDINARY_CLOUD_NAME
  const key = process.env.CLOUDINARY_API_KEY
  const secret = process.env.CLOUDINARY_API_SECRET
  return Boolean(name && key && secret)
}
