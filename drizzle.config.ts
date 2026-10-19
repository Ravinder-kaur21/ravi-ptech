import { defineConfig } from "drizzle-kit"
import { config } from "dotenv"

config({ path: ".env.local" })
config({ path: ".env" })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Add it to .env or .env.local before running migrations.")
}

export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
})
