/**
 * GET /api/settings/workspace-recent-events — last N audit rows scoped
 * to the user's active workspace (Phase 1: WS-30).
 *
 * Backed by `listOrgRecentAudit` in lib/dal.ts.
 */
import { NextResponse } from "next/server"
import { requireTenant, listOrgRecentAudit, TenantError } from "@/lib/dal"

export const instant = false

export async function GET() {
  console.log("[API/WORKSPACE-RECENT-EVENTS] entry")
  try {
    const ctx = await requireTenant()
    console.log(`[API/WORKSPACE-RECENT-EVENTS] tenant=${ctx.tenantId}`)
    const events = await listOrgRecentAudit(ctx.tenantId, { limit: 20 })
    return NextResponse.json(events)
  } catch (err) {
    if (err instanceof TenantError) {
      const status =
        err.code === "UNAUTHORIZED"
          ? 401
          : err.code === "FORBIDDEN"
            ? 403
            : 409
      return NextResponse.json({ error: err.code }, { status })
    }
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error(`[API/WORKSPACE-RECENT-EVENTS] error: ${message}`)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}