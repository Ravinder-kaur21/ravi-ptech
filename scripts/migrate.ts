/**
 * Apply pending Drizzle migrations to the database.
 *
 * Usage:
 *   bun run migrate
 *
 * Reads DATABASE_URL from .env.local. Applies every .sql file in ./drizzle
 * that has not yet been recorded in the __drizzle_migrations table.
 *
 * IMPORTANT — run this whenever you change lib/schema.ts and after
 * drizzle-kit generates a new SQL file:
 *   1. bunx drizzle-kit generate     # writes the next 000N_*.sql file
 *   2. bun run migrate               # applies it
 *
 * Never hand-edit a migration after it's been applied — write a new one.
 */
import { config } from "dotenv"
config({ path: ".env.local" })
config({ path: ".env" })

import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"

const url = process.env.DATABASE_URL
if (!url) {
  console.error("[MIGRATE] DATABASE_URL is not set in .env or .env.local")
  process.exit(1)
}

const sql = postgres(url, { max: 1 })
const db = drizzle(sql)

console.log("[MIGRATE] applying pending migrations from ./drizzle …")
await migrate(db, { migrationsFolder: "./drizzle" })
console.log("[MIGRATE] ✅ all migrations applied")
await sql.end()
process.exit(0)