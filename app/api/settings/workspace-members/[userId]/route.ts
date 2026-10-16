/**
 * DELETE /api/settings/workspace-members/[userId]
 *
 * Remove a member from the active workspace. Owner cannot be removed.
 * Requires `users.remove` permission.
 */
import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { member, user as userTable } from "@/lib/schema"
import { requireTenant, requirePermission, TenantError } from "@/lib/dal"
import { recordAuditEvent } from "@/lib/audit"

export const instant = false

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ userId: string }> }
) {
  try {
    const t = await requireTenant()
    await requirePermission({ resource: "member", action: "delete" })
    const { userId } = await ctx.params

    if (userId === t.userId) {
      return NextResponse.json(
        { error: "You cannot remove yourself from the workspace." },
        { status: 400 }
      )
    }

    const [target] = await db
      .select({ id: member.id, role: member.role })
      .from(member)
      .where(
        and(eq(member.userId, userId), eq(member.organizationId, t.tenantId))
      )
      .limit(1)

    if (!target) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }
    if (target.role === "owner") {
      return NextResponse.json(
        { error: "The owner cannot be removed. Transfer ownership first." },
        { status: 403 }
      )
    }

    await db
      .delete(member)
      .where(
        and(eq(member.userId, userId), eq(member.organizationId, t.tenantId))
      )

    const [actor] = await db
      .select({ email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, t.userId))
      .limit(1)

    await recordAuditEvent({
      actor: { id: t.userId, email: actor?.email ?? t.userId },
      action: "member.remove",
      target: { type: "member", id: userId },
      metadata: { removedRole: target.role },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json(
        { error: err.code },
        {
          status:
            err.code === "UNAUTHORIZED"
              ? 401
              : err.code === "FORBIDDEN"
                ? 403
                : 409,
        }
      )
    }
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error(`[API/WORKSPACE-MEMBERS-DELETE] error: ${message}`)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
