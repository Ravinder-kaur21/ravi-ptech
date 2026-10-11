import { NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db } from "@/lib/db"
import { load } from "@/lib/schema"
import { withTenant } from "@/lib/dal"

// [API/LOAD-STAR] Star/unstar a load. The tenant_id predicate means a
// load id from another tenant simply won't match — 404, not 403, so we
// don't leak that the row exists.
export const PATCH = withTenant(
  async (
    req: Request,
    { tenantId },
    ctx: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await ctx.params
    const body = await req.json().catch(() => null)
    const isStarred = Boolean((body as { isStarred?: unknown } | null)?.isStarred)
    console.log("[API/LOAD-STAR] setting star for", id, "→", isStarred)

    const [updated] = await db
      .update(load)
      .set({ isStarred, updatedAt: new Date() })
      .where(and(eq(load.id, id), eq(load.tenantId, tenantId)))
      .returning({ id: load.id, isStarred: load.isStarred })

    if (!updated) {
      return NextResponse.json({ error: "Load not found" }, { status: 404 })
    }
    return NextResponse.json(updated)
  }
)