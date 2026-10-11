import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/dal"
import { listEnrichedUsersForAdmin } from "@/lib/dal"

/**
 * Admin-only enriched user list. Powers /admin/users table.
 *
 * Query params:
 *   - search?: string (matches email or name)
 *   - status?: "all" | "active" | "banned" | "suspended"
 *   - limit?: number (default 50, max 200)
 *   - offset?: number (default 0)
 */
export async function GET(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }
  const url = new URL(req.url)
  const search = url.searchParams.get("search") ?? undefined
  const statusParam = url.searchParams.get("status") ?? "all"
  const status = (
    ["all", "active", "banned", "suspended"] as const
  ).includes(statusParam as any)
    ? (statusParam as "all" | "active" | "banned" | "suspended")
    : "all"
  const limit = Number(url.searchParams.get("limit") ?? "50")
  const offset = Number(url.searchParams.get("offset") ?? "0")

  console.log("[API/ADMIN-USERS] list", { search, status, limit, offset })
  const data = await listEnrichedUsersForAdmin({ search, statusFilter: status, limit, offset })
  return NextResponse.json(data)
}