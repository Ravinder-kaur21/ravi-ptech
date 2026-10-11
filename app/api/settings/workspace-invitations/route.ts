/**
 * GET /api/settings/workspace-invitations — invitations for the user's
 * active workspace, with status filter (Phase 1: WS-19, WS-20).
 *
 * Backed by `listInvitationsForOrg` in lib/dal.ts.
 */
import { NextRequest, NextResponse } from "next/server"
import { requireTenant, listInvitationsForOrg, TenantError } from "@/lib/dal"

export const instant = false

type InviteStatus = "pending" | "accepted" | "rejected" | "canceled" | "all"

export async function GET(req: NextRequest) {
  console.log("[API/WORKSPACE-INVITATIONS] entry")
  try {
    const ctx = await requireTenant()
    const statusRaw = (req.nextUrl.searchParams.get("status") ?? "pending") as InviteStatus
    const status: InviteStatus = (
      ["pending", "accepted", "rejected", "canceled", "all"] as const
    ).includes(statusRaw)
      ? statusRaw
      : "pending"

    console.log(
      `[API/WORKSPACE-INVITATIONS] tenant=${ctx.tenantId} status=${status}`,
    )
    const rows = await listInvitationsForOrg(ctx.tenantId, { status })
    return NextResponse.json(rows)
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
    console.error(`[API/WORKSPACE-INVITATIONS] error: ${message}`)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}