/**
 * Cascade delete + remove-member library.
 *
 * All destructive operations across the admin + workspace surfaces go
 * through this module. The principle: any user/workspace removal must
 * be deterministic, transaction-safe, and produce a full audit trail
 * even when the target is fully anonymized.
 *
 * The two top-level operations:
 *
 *   cascadeDeleteUser      — platform admin hard-deletes a user,
 *                            including any workspaces they own and
 *                            every audit/broadcast reference to them.
 *
 *   cascadeRemoveMember    — workspace owner removes a member from
 *                            their workspace. Deletes the member's
 *                            data in that workspace, kills their
 *                            sessions in that workspace, removes the
 *                            membership. If the user has no other
 *                            workspaces and is not a platform admin,
 *                            also hard-deletes the user.
 *
 * Both run inside a Drizzle transaction. Audit rows for the cascade
 * are written inside the same transaction (via recordAuditEvent's
 * `tx` parameter) so the chain stays consistent.
 *
 * Background:
 *  - Better Auth's removeUser only deletes session/account/user rows.
 *  - The schema's audit_log.actor_id and email_broadcast.sent_by
 *    were `NOT NULL ON DELETE RESTRICT` so any user with audit
 *    history couldn't be deleted at all (FK violation).
 *  - The driver.user_id, pay_stub.driverId, pay_item.payStubId had
 *    no onDelete clause (PG defaults to NO ACTION).
 *
 * Migration 0008 relaxed all of these. The two functions below
 * perform the data-level cleanup that the FKs can't do automatically.
 */
import "server-only"
import { randomBytes } from "node:crypto"
import { eq, and, sql, inArray, isNull, ne } from "drizzle-orm"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import {
  user,
  session as sessionTable,
  account as accountTable,
  member,
  invitation,
  driver,
  organization,
  auditLog,
  emailBroadcast,
  load,
  trip,
  invoice,
  payStub,
  carrierPayment,
  apExpense,
  truck,
  trailer,
} from "@/lib/schema"
import { recordAuditEvent } from "@/lib/audit"
import type { PgTransaction } from "drizzle-orm/pg-core"

type DbOrTx = typeof db | PgTransaction<any, any, any>

/** Generate a short, opaque, deterministic-ish id for the "deleted-user-{x}" label. */
function shortId(): string {
  return randomBytes(4).toString("hex")
}

// ─────────────────────────────────────────────────────────────────────────────
// ANONYMIZE (idempotent — safe to call multiple times)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strip references to a user from rows that have a NOT-NULL-only-by-mistake
 * FK. Required before any path that hard-deletes the user row, otherwise
 * PG will reject the delete with a FK violation.
 *
 * Idempotent: anonymizing twice produces the same end state.
 */
export async function anonymizeUserReferences(
  userId: string,
  tx: DbOrTx = db
): Promise<{ auditRowsAnonymized: number; broadcastRowsAnonymized: number }> {
  console.log(`[CASCADE] anonymizeUserReferences ${userId}`)
  const label = `deleted-user-${shortId()}`

  // 1. Audit log: null the FK, replace the email with a tombstone label.
  const auditResult = await tx
    .update(auditLog)
    .set({
      actorId: null,
      actorEmail: label,
    })
    .where(eq(auditLog.actorId, userId))
    .returning({ id: auditLog.id })

  // 2. Email broadcasts: same — null the FK, keep the row for history.
  const broadcastResult = await tx
    .update(emailBroadcast)
    .set({ sentBy: null })
    .where(eq(emailBroadcast.sentBy, userId))
    .returning({ id: emailBroadcast.id })

  console.log(
    `[CASCADE] anonymized ${auditResult.length} audit rows, ${broadcastResult.length} broadcast rows for user ${userId}`
  )
  return {
    auditRowsAnonymized: auditResult.length,
    broadcastRowsAnonymized: broadcastResult.length,
  }
}

/**
 * Detach a user's driver profile(s) — the link to the user account is
 * severed, PII is wiped, but the driver record itself stays (it's
 * workspace-owned).
 */
export async function anonymizeDriverForUser(
  userId: string,
  tx: DbOrTx = db
): Promise<{ driversDetached: number }> {
  console.log(`[CASCADE] anonymizeDriverForUser ${userId}`)
  const result = await tx
    .update(driver)
    .set({
      userId: null,
      email: null,
      phone: null,
      emergencyContact: null,
      emergencyPhone: null,
    })
    .where(eq(driver.userId, userId))
    .returning({ id: driver.id })
  console.log(`[CASCADE] detached ${result.length} driver row(s) for user ${userId}`)
  return { driversDetached: result.length }
}

// ─────────────────────────────────────────────────────────────────────────────
// ORGANIZATION OWNERSHIP + CASCADE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List every organization the user owns (i.e. has a `member` row
 * with role='owner' for). Used by cascadeDeleteUser to know which
 * orgs to drop first.
 */
export async function findOwnedOrganizations(
  userId: string,
  tx: DbOrTx = db
): Promise<{ id: string; name: string; slug: string }[]> {
  console.log(`[CASCADE] findOwnedOrganizations ${userId}`)
  const rows = await tx
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    })
    .from(organization)
    .innerJoin(member, eq(member.organizationId, organization.id))
    .where(and(eq(member.userId, userId), eq(member.role, "owner")))
  console.log(`[CASCADE] user ${userId} owns ${rows.length} org(s)`)
  return rows
}

/**
 * Hard-delete an organization. Used both by cascadeDeleteUser (when
 * the user owns the org) and by the admin "Delete workspace" button
 * on the dedicated workspace detail page.
 *
 * FK cascade on every TMS table handles loads/trips/drivers/etc. We
 * just need to: clear sessions' active_organization_id, then delete
 * the org row. The member / invitation / org_feature_flag /
 * announcement FKs also cascade.
 *
 * Writes one audit event "org.delete" inside the supplied
 * transaction (so it rolls back if anything fails).
 */
export async function cascadeDeleteOrganization(
  orgId: string,
  actor: { id: string; email: string },
  tx: DbOrTx = db
): Promise<{ orgName: string; sessionsDetached: number }> {
  console.log(`[CASCADE] cascadeDeleteOrganization ${orgId} by ${actor.email}`)

  // 1. Capture the org name for the audit row before deletion.
  const [org] = await tx
    .select({ id: organization.id, name: organization.name })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1)
  if (!org) {
    console.log(`[CASCADE] org ${orgId} not found — nothing to delete`)
    return { orgName: "(missing)", sessionsDetached: 0 }
  }

  // 2. Detach any sessions pointing at this org as active.
  const sessionResult = await tx
    .update(sessionTable)
    .set({ activeOrganizationId: null })
    .where(eq(sessionTable.activeOrganizationId, orgId))
    .returning({ id: sessionTable.id })

  // 3. Delete the org — FK cascade sweeps TMS tables, member rows,
  //    invitations, org_feature_flag, org-scoped announcements.
  await tx.delete(organization).where(eq(organization.id, orgId))

  // 4. Audit. Inside the transaction so a failure rolls the delete back.
  await recordAuditEvent({
    actor,
    action: "org.delete",
    target: { type: "org", id: orgId, label: org.name },
    metadata: { sessionsDetached: sessionResult.length, cascade: "hard" },
    tx,
  })

  console.log(
    `[CASCADE] org ${orgId} (${org.name}) deleted; ${sessionResult.length} session(s) detached`
  )
  return { orgName: org.name, sessionsDetached: sessionResult.length }
}

// ─────────────────────────────────────────────────────────────────────────────
// TOP-LEVEL: platform admin hard-delete
// ─────────────────────────────────────────────────────────────────────────────

export type CascadeDeleteUserResult = {
  ownedOrgsDeleted: number
  auditRowsAnonymized: number
  broadcastRowsAnonymized: number
  driversDetached: number
}

/**
 * Platform admin → hard-delete a user. Sweeps every workspace they
 * own (cascading TMS data), anonymizes audit/broadcast references,
 * detaches driver profiles, then calls Better Auth's removeUser to
 * finish the session+account+user row.
 *
 * If the user owns no workspaces, no orgs are touched. If the user
 * has no audit/broadcast history, those counts are zero.
 *
 * Must be called from a request context (it calls Better Auth's
 * server API which needs headers).
 */
export async function cascadeDeleteUser(args: {
  userId: string
  actor: { id: string; email: string }
}): Promise<CascadeDeleteUserResult> {
  const { userId, actor } = args
  console.log(`[CASCADE] cascadeDeleteUser start userId=${userId} actor=${actor.email}`)

  const result: CascadeDeleteUserResult = {
    ownedOrgsDeleted: 0,
    auditRowsAnonymized: 0,
    broadcastRowsAnonymized: 0,
    driversDetached: 0,
  }

  // Run the data-level sweep inside a transaction. Better Auth's
  // removeUser is NOT in the transaction because it's a separate
  // service; if it fails, our anonymization + org deletes are still
  // committed and a follow-up removeUser call will succeed (because
  // the FK blockers are gone). This is the best we can do without
  // replacing Better Auth's internal adapter.
  await db.transaction(async (tx) => {
    // 1. Owned orgs first — this also writes the org.delete audit
    //    rows inside the transaction.
    const ownedOrgs = await findOwnedOrganizations(userId, tx)
    for (const o of ownedOrgs) {
      await cascadeDeleteOrganization(o.id, actor, tx)
      result.ownedOrgsDeleted++
    }

    // 2. Anonymize audit log + email broadcast FKs.
    const anon = await anonymizeUserReferences(userId, tx)
    result.auditRowsAnonymized = anon.auditRowsAnonymized
    result.broadcastRowsAnonymized = anon.broadcastRowsAnonymized

    // 3. Detach driver profiles.
    const det = await anonymizeDriverForUser(userId, tx)
    result.driversDetached = det.driversDetached
  })

  // 4. Now the Better Auth call — outside the transaction. This
  //    handles session + account + user row. The FK cascade
  //    (configured in lib/schema.ts) sweeps member, invitation,
  //    user_feature_flag automatically.
  try {
    await auth.api.removeUser({ body: { userId } })
    console.log(`[CASCADE] Better Auth removed user ${userId}`)
  } catch (err) {
    console.error(`[CASCADE] Better Auth removeUser failed for ${userId}:`, err)
    throw err
  }

  // 5. Final audit (outside the transaction — the user is already
  //    gone so we have to write the audit directly without an actor
  //    FK link, which our relaxed FK now allows).
  await recordAuditEvent({
    actor,
    action: "user.remove",
    target: {
      type: "user",
      id: null, // user is gone
      label: `deleted-user-${shortId()}`,
    },
    metadata: {
      hardDelete: true,
      ownedOrgsDeleted: result.ownedOrgsDeleted,
      auditRowsAnonymized: result.auditRowsAnonymized,
      broadcastRowsAnonymized: result.broadcastRowsAnonymized,
      driversDetached: result.driversDetached,
    },
    // skipRequestContext is false — we still want IP/UA for the admin
  })

  console.log(`[CASCADE] cascadeDeleteUser done for ${userId}`, result)
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// TOP-LEVEL: workspace owner cascade-remove
// ─────────────────────────────────────────────────────────────────────────────

export type CascadeRemoveMemberResult = {
  driversDetachedInOrg: number
  sessionsDetached: number
  userDeleted: boolean
  otherMembershipsRemaining: number
}

/**
 * Workspace owner → remove a member from their workspace.
 *
 * Workspace-scoped cleanup:
 *   - Detach driver rows in THIS workspace where driver.user_id = member.userId
 *   - Detach session.active_organization_id for sessions in this workspace
 *   - Delete the member row (via Better Auth removeMember)
 *   - Audit "user.remove-from-org"
 *
 * The removed person retains their platform account even if this was their
 * final membership. Workspace access revocation must not delete an account.
 */
export async function cascadeRemoveMember(args: {
  memberId: string
  organizationId: string
  actor: { id: string; email: string }
}): Promise<CascadeRemoveMemberResult> {
  const { memberId, organizationId, actor } = args
  console.log(
    `[CASCADE] cascadeRemoveMember start memberId=${memberId} orgId=${organizationId} actor=${actor.email}`
  )

  // 1. Resolve the target — what user, what role?
  const [target] = await db
    .select({
      memberId: member.id,
      userId: member.userId,
      role: member.role,
      userEmail: user.email,
      userRole: user.role,
    })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(
      and(
        eq(member.id, memberId),
        eq(member.organizationId, organizationId),
      ),
    )
    .limit(1)

  if (!target) {
    throw new Error(`[CASCADE] member row ${memberId} not found`)
  }
  if (target.role === "owner") {
    // Better Auth's removeMember already blocks removing the last
    // owner; we just surface that fact here.
    const ownerCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(member)
      .where(and(eq(member.organizationId, organizationId), eq(member.role, "owner")))
    if (ownerCount[0]?.count <= 1) {
      throw new Error(
        "Cannot remove the only owner of a workspace. Transfer ownership first."
      )
    }
  }

  const result: CascadeRemoveMemberResult = {
    driversDetachedInOrg: 0,
    sessionsDetached: 0,
    userDeleted: false,
    otherMembershipsRemaining: 0,
  }

  // 2. Run the workspace-scoped cleanup inside a transaction.
  await db.transaction(async (tx) => {
    // 2a. Detach driver rows for this user in THIS workspace.
    const driverResult = await tx
      .update(driver)
      .set({
        userId: null,
        email: null,
        phone: null,
        emergencyContact: null,
        emergencyPhone: null,
      })
      .where(and(eq(driver.userId, target.userId), eq(driver.tenantId, organizationId)))
      .returning({ id: driver.id })
    result.driversDetachedInOrg = driverResult.length

    // 2b. Clear any sessions whose active_org is this org.
    const sessionResult = await tx
      .update(sessionTable)
      .set({ activeOrganizationId: null })
      .where(
        and(
          eq(sessionTable.userId, target.userId),
          eq(sessionTable.activeOrganizationId, organizationId)
        )
      )
      .returning({ id: sessionTable.id })
    result.sessionsDetached = sessionResult.length

    // 2c. Delete the member row.
    await tx.delete(member).where(eq(member.id, memberId))

    // 2d. Audit the workspace-scoped removal.
    const [org] = await tx
      .select({ name: organization.name })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1)

    await recordAuditEvent({
      actor,
      action: "user.remove-from-org",
      target: {
        type: "user",
        id: target.userId,
        label: target.userEmail,
      },
      metadata: {
        organizationId,
        organizationName: org?.name ?? null,
        role: target.role,
        driversDetachedInOrg: result.driversDetachedInOrg,
        sessionsDetached: result.sessionsDetached,
      },
      tx,
    })
  })

  // 3. Return the remaining membership count. User deletion is reserved for
  // a separate, explicit platform-admin action.
  const otherMemberships = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(member)
    .where(eq(member.userId, target.userId))
  result.otherMembershipsRemaining = Number(otherMemberships[0]?.count ?? 0)

  console.log(
    `[CASCADE] keeping user ${target.userId} (otherMemberships=${result.otherMembershipsRemaining}, isPlatformAdmin=${target.userRole === "admin"})`,
  )

  console.log(`[CASCADE] cascadeRemoveMember done`, result)
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// ORG SUSPEND / UNSUSPEND
// ─────────────────────────────────────────────────────────────────────────────

/** Platform admin suspends a workspace. Members get the
 *  "workspace suspended" screen on their next (dashboard) request. */
export async function setOrganizationSuspended(args: {
  organizationId: string
  suspended: boolean
  reason?: string
  actor: { id: string; email: string }
}): Promise<void> {
  const { organizationId, suspended, reason, actor } = args
  console.log(
    `[CASCADE] setOrganizationSuspended orgId=${organizationId} suspended=${suspended} actor=${actor.email}`
  )
  const now = new Date()
  await db
    .update(organization)
    .set({
      suspended,
      suspendedAt: suspended ? now : null,
      suspendedReason: suspended ? reason ?? null : null,
      suspendedBy: suspended ? actor.id : null,
    })
    .where(eq(organization.id, organizationId))
  await recordAuditEvent({
    actor,
    action: suspended ? "org.suspend" : "org.unsuspend",
    target: { type: "org", id: organizationId, label: null },
    metadata: { reason: reason ?? null },
  })
}
