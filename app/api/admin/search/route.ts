import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { sql, and, or, eq, desc } from "drizzle-orm"
import { user, organization, member } from "@/lib/schema"
import { requireAdmin } from "@/lib/dal"

const querySchema = z.object({
  q: z.string().min(1).max(80),
})

/**
 * Global search across the admin indexable surface:
 *   - users (by email/name, case-insensitive contains)
 *   - workspaces (by name/slug)
 *   - open appeals (by email or appeal message contains)
 *
 * Bounded to 5 hits per category to keep the Cmd-K palette snappy.
 */
export async function GET(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }

  const url = new URL(req.url)
  const parsed = querySchema.safeParse({ q: url.searchParams.get("q") ?? "" })
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 })
  }

  const needle = `%${parsed.data.q.toLowerCase()}%`
  const limit = 5

  try {
    // Users
    const users = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
      })
      .from(user)
      .where(
        sql`(LOWER(${user.email}) LIKE ${needle} OR LOWER(${user.name}) LIKE ${needle})`
      )
      .orderBy(desc(user.createdAt))
      .limit(limit)

    // Workspaces
    const workspaces = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      })
      .from(organization)
      .where(
        sql`(LOWER(${organization.name}) LIKE ${needle} OR LOWER(${organization.slug}) LIKE ${needle})`
      )
      .orderBy(desc(organization.createdAt))
      .limit(limit)

    // Open appeals
    const appeals = await db
      .select({
        id: user.id,
        email: user.email,
        reason: user.suspendedReason,
      })
      .from(user)
      .where(
        and(
          eq(user.appealStatus, "open"),
          sql`(LOWER(${user.email}) LIKE ${needle} OR LOWER(COALESCE(${user.appealMessage}, '')) LIKE ${needle})`
        )
      )
      .orderBy(desc(user.appealSubmittedAt))
      .limit(limit)

    return NextResponse.json({ users, workspaces, appeals })
  } catch (err) {
    console.error("[API/ADMIN-SEARCH] failed:", err)
    return NextResponse.json(
      { error: "Search failed", users: [], workspaces: [], appeals: [] },
      { status: 500 }
    )
  }
}
