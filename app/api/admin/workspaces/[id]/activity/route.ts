/**
 * GET /api/admin/workspaces/[id]/activity — recent audit events
 * scoped to one workspace. Powers the Activity tab on the dedicated
 * /admin/workspaces/[id] page.
 *
 * Matches events where:
 *   - targetType='org' AND targetId=orgId, OR
 *   - metadata->>'organizationId' = orgId
 */
import { NextResponse } from "next/server"
import { requireAdmin, getOrgActivityForAdmin } from "@/lib/dal"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("[API/ADMIN/WORKSPACE-ACTIVITY] entry")
  try {
    const admin = await requireAdmin()
    const { id } = await params
    console.log(
      `[API/ADMIN/WORKSPACE-ACTIVITY] actor=${admin.userEmail} orgId=${id}`
    )
    const { events, total } = await getOrgActivityForAdmin(id, { limit: 30 })
    return NextResponse.json({
      events: events.map((e) => ({
        id: e.id,
        action: e.action,
        actorEmail: e.actorEmail,
        targetType: e.targetType,
        targetId: e.targetId,
        targetLabel: e.targetLabel,
        metadata: e.metadata,
        createdAt: new Date(e.createdAt).toISOString(),
      })),
      total,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error(`[API/ADMIN/WORKSPACE-ACTIVITY] error: ${message}`)
    if ((err as any)?.code === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if ((err as any)?.code === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
