/**
 * GET /api/settings/workspace-members — members of the user's active
 * workspace, with search + status filter (Phase 1: WS-22, WS-23, WS-26).
 *
 * Returns 401 if the user has no session, 409 if no active workspace.
 * Backed by `listWorkspaceMembers` in lib/dal.ts.
 */
import { NextRequest, NextResponse } from "next/server"
import { requireTenant, listWorkspaceMembers, TenantError } from "@/lib/dal"

// `cacheComponents` doesn't prerender; mark non-prerenderable.
export const instant = false

export async function GET(req: NextRequest) {
  console.log("[API/WORKSPACE-MEMBERS] entry")
  try {
    const ctx = await requireTenant()
    const search = req.nextUrl.searchParams.get("search") ?? ""
    const statusRaw = req.nextUrl.searchParams.get("status") ?? "all"
    const status: "all" | "active" | "suspended" =
      statusRaw === "active" || statusRaw === "suspended" ? statusRaw : "all"

    console.log(
      `[API/WORKSPACE-MEMBERS] tenant=${ctx.tenantId} search=${search} status=${status}`,
    )
    const result = await listWorkspaceMembers(ctx.tenantId, { search, status })
    return NextResponse.json(result)
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
    console.error(`[API/WORKSPACE-MEMBERS] error: ${message}`)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}