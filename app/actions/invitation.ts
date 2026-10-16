"use server"

/**
 * Phase 1 — Member / invitation / role server actions.
 *
 * Used by the workspace team page (components/settings/team-client.tsx)
 * for WS-20 (resend), WS-26 (workspace suspend / lift), WS-28
 * (transfer ownership).
 *
 * Every action:
 *   - calls requireTenant() to get { userId, tenantId }
 *   - resolves the actor (id + email) for recordAuditEvent
 *   - writes a tamper-evident audit row via recordAuditEvent
 *   - calls revalidatePath() so the team page re-renders fresh data
 *
 * No raw Date params in `sql\`${...}\`` (postgres-js binding).
 */
import { z } from "zod"
import { eq, and, gt } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { member, invitation, user, organization, session as sessionTable, organizationRole } from "@/lib/schema"
import { requireTenant, requirePermission } from "@/lib/dal"
import { recordAuditEvent } from "@/lib/audit"
import { sendInvitationEmail } from "@/lib/email"
import { ASSIGNABLE_ROLE_IDS, ROLE_CATALOG } from "@/lib/auth-roles"

// ─────────────────────────────────────────────────────────────────────────────
// WS-20 — Resend invitation
// ─────────────────────────────────────────────────────────────────────────────

const resendSchema = z.object({
  invitationId: z.string().min(1),
})

export type ResendInvitationResult = { ok: true; invitationId: string }

// assignableRoleSchema is defined below (near updateMemberRoleAction),
// derived from ROLE_CATALOG — single source of truth.

/**
 * Re-sends the invitation email. We don't drive Better Auth's
 * `inviteMember({ resend: true })` here because that path requires
 * a request context (headers) we don't always have; instead we read
 * the invitation row and call `sendInvitationEmail` directly. This
 * gives us deterministic audit + a stable contract.
 *
 * Constraints:
 *   - Invitation must be pending (BA already enforces elsewhere)
 *   - Inviter may be NULL (post-migration 0009) — fall back to actor
 */
export async function resendInvitationAction(input: {
  invitationId: string
}): Promise<ResendInvitationResult> {
  const parsed = resendSchema.safeParse(input)
  if (!parsed.success) throw new Error("Invalid input: invitationId is required")
  const ctx = await requireTenant()

  console.log(
    `[ACTION/INVITE-RESEND] invitationId=${input.invitationId} actor=${ctx.userId} tenant=${ctx.tenantId}`,
  )

  const [inv] = await db
    .select()
    .from(invitation)
    .where(
      and(
        eq(invitation.id, input.invitationId),
        eq(invitation.organizationId, ctx.tenantId),
        gt(invitation.expiresAt, new Date()),
      ),
    )
    .limit(1)
  if (!inv) throw new Error("Invitation was not found or has expired")
  if (inv.status !== "pending") {
    throw new Error(`Cannot resend: invitation is ${inv.status}`)
  }

  const [actor] = await db
    .select({ id: user.id, email: user.email, name: user.name })
    .from(user)
    .where(eq(user.id, ctx.userId))
    .limit(1)
  if (!actor) throw new Error("Actor not found")

  const inviter =
    inv.inviterId != null
      ? (
          await db
            .select({ id: user.id, name: user.name, email: user.email })
            .from(user)
            .where(eq(user.id, inv.inviterId))
            .limit(1)
        )[0]
      : null
  const inviterRow = inviter || { id: actor.id, name: actor.name, email: actor.email }

  const [org] = await db
    .select({ id: organization.id, name: organization.name, slug: organization.slug })
    .from(organization)
    .where(eq(organization.id, ctx.tenantId))
    .limit(1)
  if (!org) throw new Error("Workspace not found")

  await sendInvitationEmail({
    id: inv.id,
    email: inv.email,
    role: inv.role ?? "member",
    inviter: { id: inviterRow.id, name: inviterRow.name ?? "", email: inviterRow.email },
    organization: { id: org.id, name: org.name, slug: org.slug },
    expiresAt: inv.expiresAt,
  })

  await recordAuditEvent({
    actor: { id: actor.id, email: actor.email },
    action: "user.invite-resent",
    target: { type: "invitation", id: inv.id, label: inv.email },
    metadata: { organizationId: ctx.tenantId, organizationName: org.name },
  })

  revalidatePath("/settings/team")
  return { ok: true, invitationId: inv.id }
}

// ─────────────────────────────────────────────────────────────────────────────
// WS-24 / WS-29 — Server-authorized member role changes
// ─────────────────────────────────────────────────────────────────────────────

// Single source of truth for assignable roles: static starter roles + custom org roles.
// Excludes "owner" (set only via transfer-ownership).
const assignableRoleSchema = z.string().min(2).max(50)

const updateRoleSchema = z.object({
  memberId: z.string().min(1),
  role: assignableRoleSchema,
})

export async function updateMemberRoleAction(input: {
  memberId: string
  role: string
}): Promise<{ ok: true }> {
  const parsed = updateRoleSchema.safeParse(input)
  if (!parsed.success) throw new Error("Invalid member role update")
  const ctx = await requireTenant()

  if (parsed.data.role === "owner") {
    throw new Error("Cannot assign Owner role directly. Use transfer ownership.")
  }

  // GAP-5: Replaced hardcoded ["owner","admin"] check with
  // permission-driven authorization. Better Auth checks the actor's
  // role statement (owner/admin grant member:update; operations_manager
  // does not — so only owners and admins can reach this code path now).
  await requirePermission({ resource: "member", action: "update" })

  // Validate that the role exists: either a starter role or a custom workspace role
  const isStarter = (ASSIGNABLE_ROLE_IDS as readonly string[]).includes(parsed.data.role)
  if (!isStarter) {
    const [customRoleRow] = await db
      .select({ id: organizationRole.id })
      .from(organizationRole)
      .where(
        and(
          eq(organizationRole.organizationId, ctx.tenantId),
          eq(organizationRole.role, parsed.data.role),
        ),
      )
      .limit(1)

    if (!customRoleRow) {
      throw new Error(`Role "${parsed.data.role}" is not recognized in this workspace`)
    }
  }

  const [target] = await db
    .select({ id: member.id, role: member.role, userId: member.userId })
    .from(member)
    .where(
      and(
        eq(member.id, parsed.data.memberId),
        eq(member.organizationId, ctx.tenantId),
      ),
    )
    .limit(1)
  if (!target) throw new Error("Member not found in this workspace")
  if (target.role === "owner") {
    throw new Error("Transfer ownership before changing an owner's role")
  }
  if (target.userId === ctx.userId) {
    throw new Error("You cannot change your own role")
  }

  const [actor] = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.id, ctx.userId))
    .limit(1)
  if (!actor) throw new Error("Actor not found")

  await db
    .update(member)
    .set({ role: parsed.data.role })
    .where(eq(member.id, target.id))

  // GAP-8: Compute the effective-permission diff between the old and
  // new role, so the audit log captures WHAT changed, not just the
  // role string delta.
  const oldRoleEntry = ROLE_CATALOG.find((r) => r.id === target.role)
  const newRoleEntry = ROLE_CATALOG.find((r) => r.id === parsed.data.role)
  const oldPerms = JSON.stringify(
    oldRoleEntry ? oldRoleEntry.role.statements : null,
  )
  const newPerms = JSON.stringify(
    newRoleEntry ? newRoleEntry.role.statements : null,
  )

  await recordAuditEvent({
    actor,
    action: "user.set-member-role",
    target: { type: "member", id: target.id, label: null },
    metadata: {
      organizationId: ctx.tenantId,
      previousRole: target.role,
      newRole: parsed.data.role,
      permissionDiff: {
        previousPermissions: oldPerms,
        newPermissions: newPerms,
        changed: oldPerms !== newPerms,
      },
    },
  })
  revalidatePath("/settings/team")
  return { ok: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// WS-26 — Workspace-scoped suspend
// ─────────────────────────────────────────────────────────────────────────────

const suspendSchema = z.object({
  memberId: z.string().min(1),
  reason: z.string().max(500).optional(),
  until: z.string().datetime().optional(),
})

export type SuspendMemberResult = {
  ok: true
  suspendedUntil: string | null
  sessionsDetached: number
}

/**
 * Suspends a member from THIS workspace only. Does NOT touch the
 * platform-level user.suspendedAt — the user keeps their account and
 * other workspace memberships.
 *
 * Guards:
 *   - caller must be owner or admin of this workspace
 *   - cannot suspend an owner (use transfer-ownership first)
 *   - revokes the user's active sessions whose active_org is this workspace
 */
export async function suspendMemberAction(input: {
  memberId: string
  reason?: string
  until?: string // ISO 8601
}): Promise<SuspendMemberResult> {
  const parsed = suspendSchema.safeParse(input)
  if (!parsed.success) throw new Error("Invalid input")
  const ctx = await requireTenant()

  // GAP-5: Permission-driven — only roles granting member:suspend
  // (owner, admin) pass this check.
  await requirePermission({ resource: "member", action: "suspend" })

  const [target] = await db
    .select({
      id: member.id,
      userId: member.userId,
      role: member.role,
    })
    .from(member)
    .where(
      and(eq(member.id, input.memberId), eq(member.organizationId, ctx.tenantId)),
    )
    .limit(1)
  if (!target) throw new Error("Member not found in this workspace")
  if (target.role === "owner") {
    throw new Error("Cannot suspend an owner. Transfer ownership first.")
  }

  const [actor] = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.id, ctx.userId))
    .limit(1)
  if (!actor) throw new Error("Actor not found")

  const now = new Date()
  const untilDate = input.until ? new Date(input.until) : null

  await db
    .update(member)
    .set({
      suspendedAt: now,
      suspendedUntil: untilDate,
      suspendedReason: input.reason ?? null,
      suspendedBy: actor.id,
    })
    .where(eq(member.id, target.id))

  // Revoke their sessions in this workspace (active_org = this tenant).
  // We don't pass a raw Date to `sql\`${...}\``; we use equality only.
  const sessionResult = await db
    .update(sessionTable)
    .set({ activeOrganizationId: null })
    .where(
      and(
        eq(sessionTable.userId, target.userId),
        eq(sessionTable.activeOrganizationId, ctx.tenantId),
      ),
    )
    .returning({ id: sessionTable.id })

  await recordAuditEvent({
    actor: { id: actor.id, email: actor.email },
    action: "user.suspend-from-workspace",
    target: { type: "user", id: target.userId, label: null },
    metadata: {
      organizationId: ctx.tenantId,
      memberId: target.id,
      reason: input.reason ?? null,
      until: untilDate ? untilDate.toISOString() : null,
      sessionsDetached: sessionResult.length,
    },
  })

  revalidatePath("/settings/team")
  return {
    ok: true,
    suspendedUntil: untilDate ? untilDate.toISOString() : null,
    sessionsDetached: sessionResult.length,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WS-26 — Lift workspace suspension
// ─────────────────────────────────────────────────────────────────────────────

const liftSchema = z.object({
  memberId: z.string().min(1),
})

export async function liftWorkspaceSuspensionAction(input: {
  memberId: string
}): Promise<{ ok: true }> {
  const parsed = liftSchema.safeParse(input)
  if (!parsed.success) throw new Error("Invalid input")
  const ctx = await requireTenant()

  // GAP-5: Permission-driven — only roles granting member:lift-suspension
  // (owner, admin) pass this check.
  await requirePermission({ resource: "member", action: "lift-suspension" })

  const [target] = await db
    .select({ id: member.id, userId: member.userId })
    .from(member)
    .where(
      and(eq(member.id, input.memberId), eq(member.organizationId, ctx.tenantId)),
    )
    .limit(1)
  if (!target) throw new Error("Member not found")

  const [actor] = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.id, ctx.userId))
    .limit(1)
  if (!actor) throw new Error("Actor not found")

  await db
    .update(member)
    .set({
      suspendedAt: null,
      suspendedUntil: null,
      suspendedReason: null,
      suspendedBy: null,
    })
    .where(eq(member.id, target.id))

  await recordAuditEvent({
    actor: { id: actor.id, email: actor.email },
    action: "user.lift-workspace-suspension",
    target: { type: "user", id: target.userId, label: null },
    metadata: { organizationId: ctx.tenantId, memberId: target.id },
  })

  revalidatePath("/settings/team")
  return { ok: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// WS-28 — Transfer ownership
// ─────────────────────────────────────────────────────────────────────────────

const transferSchema = z.object({
  newOwnerMemberId: z.string().min(1),
})

export type TransferOwnershipResult = { ok: true; newOwnerUserId: string }

/**
 * Owner transfers ownership to another member of the same workspace.
 *
 * Single transaction:
 *   1. Demote the current owner to 'admin'.
 *   2. Promote the target to 'owner'.
 *   3. Audit.
 *
 * Guards:
 *   - caller must be the current owner (last-owner guard: you cannot
 *     transfer if you're not owner)
 *   - target must be a member of this workspace
 *   - target != caller
 */
export async function transferOwnershipAction(input: {
  newOwnerMemberId: string
}): Promise<TransferOwnershipResult> {
  const parsed = transferSchema.safeParse(input)
  if (!parsed.success) throw new Error("Invalid input")
  const ctx = await requireTenant()

  const [me] = await db
    .select({ id: member.id, role: member.role })
    .from(member)
    .where(
      and(eq(member.userId, ctx.userId), eq(member.organizationId, ctx.tenantId)),
    )
    .limit(1)
  if (!me || me.role !== "owner") {
    throw new Error("Only the current owner can transfer ownership")
  }
  if (me.id === input.newOwnerMemberId) {
    throw new Error("You are already the owner")
  }

  const [target] = await db
    .select({
      id: member.id,
      userId: member.userId,
      role: member.role,
      email: user.email,
    })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(
      and(
        eq(member.id, input.newOwnerMemberId),
        eq(member.organizationId, ctx.tenantId),
      ),
    )
    .limit(1)
  if (!target) throw new Error("Target member not found in this workspace")

  const [actor] = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.id, ctx.userId))
    .limit(1)
  if (!actor) throw new Error("Actor not found")

  const [org] = await db
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, ctx.tenantId))
    .limit(1)

  await db.transaction(async (tx) => {
    await tx
      .update(member)
      .set({ role: "admin" })
      .where(eq(member.id, me.id))

    await tx
      .update(member)
      .set({ role: "owner" })
      .where(eq(member.id, target.id))

    await recordAuditEvent({
      actor: { id: actor.id, email: actor.email },
      action: "org.transfer-ownership",
      target: { type: "org", id: ctx.tenantId, label: org?.name ?? null },
      metadata: {
        fromMemberId: me.id,
        fromUserId: ctx.userId,
        fromEmail: actor.email,
        toMemberId: target.id,
        toUserId: target.userId,
        toEmail: target.email,
        previousTargetRole: target.role,
      },
      // The Drizzle transaction's generic args differ from the global
      // DB executor's; both expose `insert/update/select/delete` so the
      // runtime surface is compatible. Cast through `unknown` keeps
      // the audit module's strict `DbOrTx` contract.
      tx: tx as unknown as typeof import("@/lib/db").db,
    })
  })

  // Caller's role just dropped to admin. Their cached UI may still
  // show owner-only controls; force a layout-wide revalidation so the
  // dashboard layout's role-gating re-runs and the team page picks up
  // the new viewer role.
  revalidatePath("/", "layout")
  return { ok: true, newOwnerUserId: target.userId }
}
