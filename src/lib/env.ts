import { z } from "zod"

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  DATABASE_URL: z.string().default("file:./dev.db"),
  PORT: z.coerce.number().default(3000),
  // Turso (optional – when set, Prisma uses libSQL adapter)
  TURSO_DATABASE_URL: z.string().optional(),
  TURSO_AUTH_TOKEN: z.string().optional(),
  // Google Cloud Storage (optional – when set, images are uploaded to GCS)
  GCS_BUCKET: z.string().optional(),
  GCLOUD_PROJECT_ID: z.string().optional(),
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

export function useGcs(): boolean {
  return Boolean(process.env.GCS_BUCKET)
}
