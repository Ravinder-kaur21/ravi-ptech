/**
 * GET /api/admin/workspaces — list every org across all tenants.
 *
 * Query params:
 *   search      — case-insensitive contains on name/slug
 *   status      — "all" | "active" | "suspended" (default "all")
 *   limit       — 1..200, default 50
 *   offset      — default 0
 *
 * Replaces the old `authClient.organization.list()` + N+1
 * `getFullOrganization` pattern in the WorkspacesTable.
 */
import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/dal"
import { listAllOrgsForAdmin } from "@/lib/dal"

export async function GET(req: Request) {
  console.log("[API/ADMIN/WORKSPACES-LIST] entry")
  try {
    const admin = await requireAdmin()
    const url = new URL(req.url)
    const search = url.searchParams.get("search") ?? undefined
    const statusParam = url.searchParams.get("status") ?? "all"
    const status = (
      ["all", "active", "suspended"].includes(statusParam)
        ? statusParam
        : "all"
    ) as "all" | "active" | "suspended"
    const limit = Number(url.searchParams.get("limit") ?? "50")
    const offset = Number(url.searchParams.get("offset") ?? "0")

    console.log(
      `[API/ADMIN/WORKSPACES-LIST] actor=${admin.userEmail} search=${search ?? "(none)"} status=${status} limit=${limit} offset=${offset}`
    )
    const { orgs, total } = await listAllOrgsForAdmin({
      search,
      statusFilter: status,
      limit,
      offset,
    })
    return NextResponse.json({ orgs, total })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error(`[API/ADMIN/WORKSPACES-LIST] error: ${message}`)
    if ((err as any)?.code === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if ((err as any)?.code === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
