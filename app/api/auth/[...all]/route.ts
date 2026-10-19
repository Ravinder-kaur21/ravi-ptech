import { sql } from "drizzle-orm"
import { toNextJsHandler } from "better-auth/next-js"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

const handlers = toNextJsHandler(auth)

export const GET = handlers.GET

export async function POST(request: Request) {
  const { pathname } = new URL(request.url)
  if (pathname === "/api/auth/sign-in/social") {
    try {
      await db.execute(sql`select 1`)
    } catch (error) {
      const cause =
        error instanceof Error && "cause" in error ? error.cause : error
      const code =
        typeof cause === "object" &&
        cause !== null &&
        "code" in cause &&
        typeof cause.code === "string"
          ? cause.code
          : "unknown"
      console.error("[AUTH] Social sign-in database check failed", { code })
      return Response.json(
        {
          message:
            "Google sign-in is unavailable because the authentication database connection failed. Check DATABASE_URL and the PostgreSQL credentials.",
        },
        { status: 503 },
      )
    }
  }

  return handlers.POST(request)
}