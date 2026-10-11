import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { and, or, eq, desc } from "drizzle-orm"
import { auditLog } from "@/lib/schema"
import { requireAdmin } from "@/lib/dal"

/**
 * GET /api/admin/users/[id]/activity
 *   Returns audit-log rows that targeted this user (target_id = id
 *   or metadata->userId = id). Bounded to 50 most-recent rows.
 *
 * Used by the "Activity" tab in the user detail sheet.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }
  const { id: targetId } = await params

  const rows = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      actorEmail: auditLog.actorEmail,
      metadata: auditLog.metadata,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(eq(auditLog.targetId, targetId))
    .orderBy(desc(auditLog.createdAt))
    .limit(50)

  return NextResponse.json({ events: rows })
}
