import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

// Lazy init so `import { db } from "@/lib/db"` doesn't throw at module load.
// Vercel's build-time page-data collection evaluates route modules — if we
// validate DATABASE_URL eagerly, builds fail before the env var is ever used.
// We still throw on the *first actual DB access* when the env is missing.
let _client: ReturnType<typeof postgres> | null = null
let _db: ReturnType<typeof drizzle> | null = null

function getDb() {
  if (_db) return _db
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL is not set")
  _client = postgres(connectionString, { prepare: false })
  _db = drizzle(_client)
  return _db
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop, receiver) {
    const real = getDb() as unknown as Record<PropertyKey, unknown>
    const value = real[prop]
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(real)
      : Reflect.get(real as object, prop, receiver)
  },
})

export function pgClient() {
  getDb()
  return _client!
}
