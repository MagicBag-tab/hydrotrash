/**
 * Normalizes Prisma/DB errors for API responses.
 * Returns a user-friendly message and optional code (e.g. DB_NOT_READY).
 * Returns null if the error is not a known DB error.
 */
export function getDbErrorMessage(e: unknown): { message: string; code: string } | null {
  if (e && typeof e === "object" && "code" in e) {
    const err = e as { code?: string; message?: string }
    if (err.code === "SQLITE_UNKNOWN" || (err.message && String(err.message).includes("no such table"))) {
      return {
        message:
          "Database table not found. Run migrations: npx prisma migrate deploy (or npm run db:migrate for dev).",
        code: "DB_NOT_READY",
      }
    }
  }
  if (e instanceof Error && /prisma|sqlite|database/i.test(e.message)) {
    return { message: e.message, code: "DB_ERROR" }
  }
  return null
}
