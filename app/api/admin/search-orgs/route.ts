import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { organization } from "@/lib/schema"
import { sql, desc } from "drizzle-orm"
import { requireAdmin } from "@/lib/dal"

const querySchema = z.object({ q: z.string().min(1).max(80) })

/** Used by the AddOverrideDialog when picking a workspace target. */
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
  const rows = await db
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
    .limit(10)
  return NextResponse.json({ workspaces: rows })
}
