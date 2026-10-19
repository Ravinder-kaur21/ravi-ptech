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
import { randomBytes } from "node:crypto"
import { isValidPhoneNumber } from "libphonenumber-js/max"
import { eq, and, gt, lte } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { member, invitation, user, organization, session as sessionTable, organizationRole } from "@/lib/schema"
import { requireTenant, requirePermission, getSession } from "@/lib/dal"
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

const whatsappInvitationSchema = z.object({
  phone: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, "Invalid international phone number")
    .refine(isValidPhoneNumber, "Invalid international phone number"),
  role: z.string().min(2).max(50),
})

const whatsappInvitationIdSchema = z.string().min(1).max(128)
const WHATSAPP_INVITATION_EXPIRY_MS = 48 * 60 * 60 * 1000

function getDatabaseErrorMetadata(error: unknown) {
  if (typeof error !== "object" || error === null) return {}
  return {
    code: "code" in error && typeof error.code === "string" ? error.code : undefined,
    column:
      "column" in error && typeof error.column === "string"
        ? error.column
        : undefined,
    constraint:
      "constraint" in error && typeof error.constraint === "string"
        ? error.constraint
        : undefined,
  }
}

async function requireInvitationManager() {
  const ctx = await requireTenant()
  await requirePermission({ resource: "member", action: "create" })
  const [actorMember] = await db
    .select({ role: member.role })
    .from(member)
    .where(
      and(eq(member.userId, ctx.userId), eq(member.organizationId, ctx.tenantId)),
    )
    .limit(1)
  if (!actorMember || !["owner", "admin"].includes(actorMember.role)) {
    throw new Error("Only workspace owners and administrators can invite teammates")
  }

  const [actor] = await db
    .select({ id: user.id, email: user.email, name: user.name })
    .from(user)
    .where(eq(user.id, ctx.userId))
    .limit(1)
  if (!actor) throw new Error("Invitation creator was not found")

  return { ...ctx, actor }
}

export async function createWhatsAppInvitationAction(input: {
  phone: string
  role: string
}): Promise<{ id: string; expiresAt: string; workspaceName: string }> {
  const parsed = whatsappInvitationSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid WhatsApp invitation")
  }

  const ctx = await requireInvitationManager()
  const roleIsStarter = (ASSIGNABLE_ROLE_IDS as readonly string[]).includes(
    parsed.data.role,
  )
  if (!roleIsStarter) {
    const [customRole] = await db
      .select({ id: organizationRole.id })
      .from(organizationRole)
      .where(
        and(
          eq(organizationRole.organizationId, ctx.tenantId),
          eq(organizationRole.role, parsed.data.role),
        ),
      )
      .limit(1)
    if (!customRole) throw new Error("Selected invitation role is not available")
  }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + WHATSAPP_INVITATION_EXPIRY_MS)
  const id = randomBytes(32).toString("base64url")

  const [workspace] = await db
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, ctx.tenantId))
    .limit(1)
  if (!workspace) throw new Error("Workspace was not found")

  let created: { id: string; expiresAt: Date } | undefined
  try {
    const createdRows = await db.transaction(async (tx) => {
      await tx
        .update(invitation)
        .set({ status: "canceled" })
        .where(
          and(
            eq(invitation.organizationId, ctx.tenantId),
            eq(invitation.invitationMethod, "whatsapp"),
            eq(invitation.recipientPhone, parsed.data.phone),
            eq(invitation.status, "pending"),
            lte(invitation.expiresAt, now),
          ),
        )

      return tx
        .insert(invitation)
        .values({
          id,
          organizationId: ctx.tenantId,
          email: null,
          invitationMethod: "whatsapp",
          recipientPhone: parsed.data.phone,
          role: parsed.data.role,
          status: "pending",
          expiresAt,
          inviterId: ctx.userId,
          inviterEmail: ctx.actor.email,
        })
        .onConflictDoNothing()
        .returning({ id: invitation.id, expiresAt: invitation.expiresAt })
    })
    created = createdRows[0]
  } catch (error) {
    const metadata = getDatabaseErrorMetadata(error)
    console.error("[ACTION/WHATSAPP-INVITE] database operation failed", metadata)
    if (
      metadata.code === "42703" &&
      (metadata.column === "invitation_method" ||
        metadata.column === "recipient_phone")
    ) {
      throw new Error(
        "WhatsApp invitation database setup is incomplete. Run the pending database migrations and try again.",
      )
    }
    throw new Error("Could not create the WhatsApp invitation. Please try again.")
  }
  if (!created) {
    throw new Error("A pending WhatsApp invitation already exists for this phone number")
  }

  await recordAuditEvent({
    actor: { id: ctx.actor.id, email: ctx.actor.email },
    action: "user.invite-to-org",
    target: { type: "invitation", label: "WhatsApp invitation" },
    metadata: {
      organizationId: ctx.tenantId,
      organizationName: workspace.name,
      role: parsed.data.role,
      method: "whatsapp",
    },
  })

  revalidatePath("/settings/team")
  return {
    id: created.id,
    expiresAt: created.expiresAt.toISOString(),
    workspaceName: workspace.name,
  }
}

export async function getWhatsAppInvitationAction(input: {
  invitationId: string
}) {
  const parsed = whatsappInvitationIdSchema.safeParse(input.invitationId)
  if (!parsed.success) return null

  const session = await getSession()
  if (!session?.user) throw new Error("Sign in to view this invitation")

  const [inv] = await db
    .select()
    .from(invitation)
    .where(
      and(
        eq(invitation.id, parsed.data),
        eq(invitation.invitationMethod, "whatsapp"),
      ),
    )
    .limit(1)
  if (!inv) return null

  const [workspace] = await db
    .select({ id: organization.id, name: organization.name, slug: organization.slug })
    .from(organization)
    .where(eq(organization.id, inv.organizationId))
    .limit(1)
  if (!workspace) return null

  const [inviter] = inv.inviterId
    ? await db
        .select({ id: user.id, name: user.name, email: user.email })
        .from(user)
        .where(eq(user.id, inv.inviterId))
        .limit(1)
    : []

  return {
    id: inv.id,
    organizationId: inv.organizationId,
    email: null,
    invitationMethod: "whatsapp" as const,
    role: inv.role ?? "member",
    status: inv.status,
    expiresAt: inv.expiresAt.toISOString(),
    organization: workspace,
    inviter: inviter ?? null,
  }
}

export async function acceptWhatsAppInvitationAction(input: {
  invitationId: string
}): Promise<{ organizationId: string }> {
  const parsed = whatsappInvitationIdSchema.safeParse(input.invitationId)
  if (!parsed.success) throw new Error("Invitation was not found")
  const session = await getSession()
  if (!session?.user) throw new Error("Sign in to accept this invitation")
  if (!session.user.emailVerified) {
    throw new Error("Verify your account email before accepting this invitation")
  }

  const accepted = await db.transaction(async (tx) => {
    const [inv] = await tx
      .select()
      .from(invitation)
      .where(
        and(
          eq(invitation.id, parsed.data),
          eq(invitation.invitationMethod, "whatsapp"),
          eq(invitation.status, "pending"),
        ),
      )
      .limit(1)
      .for("update")

    if (!inv) throw new Error("This invitation is canceled or already used")
    if (inv.expiresAt <= new Date()) throw new Error("This invitation has expired")

    const [workspace] = await tx
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.id, inv.organizationId))
      .for("update")
    if (!workspace) throw new Error("The invited workspace no longer exists")

    const [existingMember] = await tx
      .select({ id: member.id })
      .from(member)
      .where(
        and(
          eq(member.organizationId, inv.organizationId),
          eq(member.userId, session.user.id),
        ),
      )
      .limit(1)
    if (existingMember) throw new Error("You are already a member of this workspace")

    const [updated] = await tx
      .update(invitation)
      .set({ status: "accepted" })
      .where(
        and(eq(invitation.id, inv.id), eq(invitation.status, "pending")),
      )
      .returning({ id: invitation.id })
    if (!updated) throw new Error("This invitation was already used")

    await tx.insert(member).values({
      id: randomBytes(24).toString("base64url"),
      organizationId: inv.organizationId,
      userId: session.user.id,
      role: inv.role ?? "member",
      createdAt: new Date(),
    })

    return { organizationId: inv.organizationId, role: inv.role ?? "member" }
  })

  await recordAuditEvent({
    actor: { id: session.user.id, email: session.user.email },
    action: "user.invite-to-org",
    target: { type: "member", label: "Accepted WhatsApp invitation" },
    metadata: {
      organizationId: accepted.organizationId,
      role: accepted.role,
      method: "whatsapp",
    },
  })
  revalidatePath("/settings/team")
  return { organizationId: accepted.organizationId }
}

export async function rejectWhatsAppInvitationAction(input: {
  invitationId: string
}): Promise<void> {
  const parsed = whatsappInvitationIdSchema.safeParse(input.invitationId)
  if (!parsed.success) throw new Error("Invitation was not found")
  const session = await getSession()
  if (!session?.user) throw new Error("Sign in to decline this invitation")

  const [updated] = await db
    .update(invitation)
    .set({ status: "rejected" })
    .where(
      and(
        eq(invitation.id, parsed.data),
        eq(invitation.invitationMethod, "whatsapp"),
        eq(invitation.status, "pending"),
        gt(invitation.expiresAt, new Date()),
      ),
    )
    .returning({ id: invitation.id })
  if (!updated) throw new Error("This invitation is expired, canceled, or already used")
  revalidatePath("/settings/team")
}

export async function resendWhatsAppInvitationAction(input: {
  invitationId: string
}): Promise<{ id: string; phone: string; role: string; expiresAt: string }> {
  const parsed = whatsappInvitationIdSchema.safeParse(input.invitationId)
  if (!parsed.success) throw new Error("Invitation was not found")
  const ctx = await requireInvitationManager()
  const [inv] = await db
    .select({
      id: invitation.id,
      phone: invitation.recipientPhone,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      status: invitation.status,
    })
    .from(invitation)
    .where(
      and(
        eq(invitation.id, parsed.data),
        eq(invitation.organizationId, ctx.tenantId),
        eq(invitation.invitationMethod, "whatsapp"),
        eq(invitation.status, "pending"),
        gt(invitation.expiresAt, new Date()),
      ),
    )
    .limit(1)
  if (!inv?.phone) throw new Error("WhatsApp invitation was not found or has expired")

  await recordAuditEvent({
    actor: { id: ctx.actor.id, email: ctx.actor.email },
    action: "user.invite-resent",
    target: { type: "invitation", label: "WhatsApp invitation" },
    metadata: { organizationId: ctx.tenantId, method: "whatsapp" },
  })
  return {
    id: inv.id,
    phone: inv.phone,
    role: inv.role ?? "member",
    expiresAt: inv.expiresAt.toISOString(),
  }
}

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
    `[ACTION/INVITE-RESEND] actor=${ctx.userId} tenant=${ctx.tenantId}`,
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
  if (inv.invitationMethod !== "email" || !inv.email) {
    throw new Error("Use WhatsApp to resend this invitation")
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

  try {
    const { dispatchNotificationEvent } = await import("@/lib/notifications")
    await dispatchNotificationEvent({
      organizationId: ctx.tenantId,
      category: "team",
      event: "team.invitation_resent",
      severity: "info",
      title: "Workspace Invitation Resent",
      message: `Invitation email was resent to ${inv.email}.`,
      link: "/settings/team",
      metadata: { invitationId: inv.id, email: inv.email },
    })
  } catch (err) {
    console.error("[NOTIFICATIONS] Error dispatching invitation resent event:", err)
  }

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

  const { dispatchNotificationEvent } = await import("@/lib/notifications")
  await dispatchNotificationEvent({
    organizationId: ctx.tenantId,
    category: "team",
    event: "member.role_updated",
    severity: "info",
    title: "Member Role Updated",
    message: `Team member role updated from ${target.role} to ${parsed.data.role}.`,
    link: "/settings/team",
    metadata: { memberId: target.id, previousRole: target.role, newRole: parsed.data.role },
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

  try {
    const { dispatchNotificationEvent } = await import("@/lib/notifications")
    await dispatchNotificationEvent({
      organizationId: ctx.tenantId,
      category: "team",
      event: "team.member_suspended",
      severity: "warn",
      title: "Member Suspended",
      message: `Team member ${target.userId} was suspended${input.reason ? `: ${input.reason}` : "."}`,
      link: "/settings/team",
      metadata: { memberId: target.id, userId: target.userId, reason: input.reason },
    })
  } catch (err) {
    console.error("[NOTIFICATIONS] Error dispatching member suspended event:", err)
  }

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

  try {
    const { dispatchNotificationEvent } = await import("@/lib/notifications")
    await dispatchNotificationEvent({
      organizationId: ctx.tenantId,
      category: "team",
      event: "team.member_reinstated",
      severity: "info",
      title: "Member Suspension Lifted",
      message: `Suspension was lifted for team member ${target.userId}. Access restored.`,
      link: "/settings/team",
      metadata: { memberId: target.id, userId: target.userId },
    })
  } catch (err) {
    console.error("[NOTIFICATIONS] Error dispatching member reinstated event:", err)
  }

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

  try {
    const { dispatchNotificationEvent } = await import("@/lib/notifications")
    await dispatchNotificationEvent({
      organizationId: ctx.tenantId,
      category: "team",
      event: "team.ownership_transferred",
      severity: "warn",
      title: "Workspace Ownership Transferred",
      message: `Ownership transferred to ${target.email || target.userId}.`,
      link: "/settings/team",
      metadata: { newOwnerId: target.userId, newOwnerEmail: target.email },
    })
  } catch (err) {
    console.error("[NOTIFICATIONS] Error dispatching transfer ownership event:", err)
  }

  // Caller's role just dropped to admin. Their cached UI may still
  // show owner-only controls; force a layout-wide revalidation so the
  // dashboard layout's role-gating re-runs and the team page picks up
  // the new viewer role.
  revalidatePath("/", "layout")
  return { ok: true, newOwnerUserId: target.userId }
}

// ─────────────────────────────────────────────────────────────────────────────
// Member Acceptance & Decline Notification Triggers
// ─────────────────────────────────────────────────────────────────────────────

export async function recordMemberAcceptedInvitationAction(input: {
  organizationId: string
  email: string
  role?: string | null
}) {
  console.log(
    `[NOTIFICATIONS] member.invitation_accepted email=${input.email} org=${input.organizationId} role=${input.role}`,
  )
  try {
    const { dispatchNotificationEvent } = await import("@/lib/notifications")
    await dispatchNotificationEvent({
      organizationId: input.organizationId,
      category: "team",
      event: "team.invitation_accepted",
      severity: "info",
      title: "New Team Member Joined",
      message: `${input.email} accepted the invitation and joined as ${input.role || "member"}.`,
      link: "/settings/team",
      metadata: { email: input.email, role: input.role },
    })
  } catch (err) {
    console.error("[NOTIFICATIONS] Error dispatching invitation accepted event:", err)
  }
  return { ok: true }
}

export async function recordMemberDeclinedInvitationAction(input: {
  organizationId: string
  email: string
}) {
  console.log(
    `[NOTIFICATIONS] member.invitation_declined email=${input.email} org=${input.organizationId}`,
  )
  try {
    const { dispatchNotificationEvent } = await import("@/lib/notifications")
    await dispatchNotificationEvent({
      organizationId: input.organizationId,
      category: "team",
      event: "team.invitation_declined",
      severity: "info",
      title: "Workspace Invitation Declined",
      message: `${input.email} declined the invitation to join.`,
      link: "/settings/team",
      metadata: { email: input.email },
    })
  } catch (err) {
    console.error("[NOTIFICATIONS] Error dispatching invitation declined event:", err)
  }
  return { ok: true }
}
