"use server"

/**
 * Server action: workspace owner removes a member from their workspace.
 *
 * This is the workspace-side analog of the platform admin's
 * hard-delete flow (`/api/admin/users/[id]/remove`). It cascades:
 *
 *   1. Driver rows in this workspace where driver.user_id = member.userId
 *      are detached (PII wiped, link severed, driver record kept).
 *   2. Sessions with active_organization_id = this workspace are
 *      detached.
 *   3. The member row is deleted.
 *   4. The user's account remains available for future re-invitation.
 *
 * Used by the settings/team-client.tsx remove button.
 */
import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { requireTenant } from "@/lib/dal"
import { cascadeRemoveMember } from "@/lib/cascade"
import { db } from "@/lib/db"
import { member, user } from "@/lib/schema"

const removeSchema = z.object({
  memberId: z.string().min(1),
})

export type RemoveMemberResult = {
  driversDetachedInOrg: number
  sessionsDetached: number
  userDeleted: boolean
  otherMembershipsRemaining: number
}

export async function removeMemberAction(input: {
  memberId: string
}): Promise<RemoveMemberResult> {
  console.log(`[ACTION/REMOVE-MEMBER] entry memberId=${input.memberId}`)
  const parsed = removeSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error("Invalid input: memberId is required")
  }

  // requireTenant throws TenantError if the user isn't a member of
  // any org. The caller must have tenant context. The cascade is
  // scoped to that tenant.
  const ctx = await requireTenant()

  const [actorMembership] = await db
    .select({ role: member.role })
    .from(member)
    .where(
      and(
        eq(member.userId, ctx.userId),
        eq(member.organizationId, ctx.tenantId),
      ),
    )
    .limit(1)
  if (!actorMembership || !["owner", "admin"].includes(actorMembership.role)) {
    throw new Error("Only workspace owners and administrators can remove members")
  }

  // Scope the target lookup to the active workspace before invoking the
  // cascade. A member ID must never act as a cross-workspace capability.
  const [target] = await db
    .select({ id: member.id })
    .from(member)
    .where(
      and(
        eq(member.id, input.memberId),
        eq(member.organizationId, ctx.tenantId),
      ),
    )
    .limit(1)
  if (!target) throw new Error("Member not found in this workspace")

  // Look up the actor's email so the audit row has it.
  const [actor] = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.id, ctx.userId))
    .limit(1)
  if (!actor) {
    throw new Error("Actor not found in DB")
  }

  console.log(
    `[ACTION/REMOVE-MEMBER] actor=${actor.email} tenantId=${ctx.tenantId} memberId=${input.memberId}`
  )

  const result = await cascadeRemoveMember({
    memberId: target.id,
    organizationId: ctx.tenantId,
    actor: { id: actor.id, email: actor.email },
  })
  console.log(
    `[ACTION/REMOVE-MEMBER] ✅ done memberId=${input.memberId}`,
    result
  )
  return result
}
