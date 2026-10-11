/**
 * GET /api/admin/workspaces/[id]/members — paginated members of one
 * workspace. Powers the Members table on the dedicated
 * /admin/workspaces/[id] page.
 *
 * Query params:
 *   search — case-insensitive contains on email/name
 *   limit  — 1..200, default 50
 *   offset — default 0
 */
import { NextResponse } from "next/server"
import { requireAdmin, listWorkspaceMembersForAdmin } from "@/lib/dal"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("[API/ADMIN/WORKSPACE-MEMBERS] entry")
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const url = new URL(req.url)
    const search = url.searchParams.get("search") ?? undefined
    const limit = Number(url.searchParams.get("limit") ?? "50")
    const offset = Number(url.searchParams.get("offset") ?? "0")
    console.log(
      `[API/ADMIN/WORKSPACE-MEMBERS] actor=${admin.userEmail} orgId=${id} search=${search ?? "(none)"} limit=${limit} offset=${offset}`
    )
    const { members, total } = await listWorkspaceMembersForAdmin(id, {
      search,
      limit,
      offset,
    })
    return NextResponse.json({ members, total })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error(`[API/ADMIN/WORKSPACE-MEMBERS] error: ${message}`)
    if ((err as any)?.code === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if ((err as any)?.code === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
