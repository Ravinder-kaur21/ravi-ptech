import { NextResponse } from "next/server"
import { resolveUserRoles } from "@/lib/dal"
import { requireAdmin } from "@/lib/dal"

/**
 * GET /api/admin/users/[id]/roles
 *   Returns the user's platform role + every workspace membership
 *   with their role. Powers the ChangeRoleSheet.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }
  const { id } = await params
  console.log(`[API/ADMIN-USER-ROLES] GET ${id} (admin=${admin.userEmail})`)
  const resolved = await resolveUserRoles(id)
  if (!resolved) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
  }
  return NextResponse.json({
    id: resolved.userId,
    email: resolved.email,
    name: resolved.name,
    image: resolved.image,
    platformRole: resolved.platformRole,
    workspaceMemberships: resolved.workspaceMemberships.map((m) => ({
      organizationId: m.organizationId,
      organizationName: m.organizationName,
      organizationSlug: m.organizationSlug,
      role: m.role,
    })),
  })
}
