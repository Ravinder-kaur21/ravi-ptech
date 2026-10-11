/**
 * GET /api/admin/users/[id] — single enriched user for the dedicated
 * /admin/users/[id] page.
 *
 * Returns 404 if the user doesn't exist. 401/403 are mapped from
 * TenantError by the underlying requireAdmin() call.
 */
import { NextResponse } from "next/server"
import { getEnrichedUserById } from "@/lib/dal"
import { requireAdmin } from "@/lib/dal"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("[API/ADMIN/USER-GET] entry")
  try {
    const admin = await requireAdmin()
    const { id } = await params
    console.log(`[API/ADMIN/USER-GET] admin=${admin.userEmail} target=${id}`)
    const user = await getEnrichedUserById(id)
    if (!user) {
      console.log(`[API/ADMIN/USER-GET] 404 user ${id} not found`)
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    return NextResponse.json({ user })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error(`[API/ADMIN/USER-GET] error: ${message}`)
    if ((err as any)?.code === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if ((err as any)?.code === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
