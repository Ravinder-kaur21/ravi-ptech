import "server-only"
import { createHash } from "node:crypto"
import { db } from "@/lib/db"
import { auditLog } from "@/lib/schema"
import { sql, desc, and, eq, gte, lte, like, or, type SQL } from "drizzle-orm"
import type { PgTransaction } from "drizzle-orm/pg-core"
import { headers } from "next/headers"

type DbOrTx = typeof db | PgTransaction<any, any, any>

/**
 * Append-only audit log writer + reader.
 *
 * WRITE:  recordAuditEvent({ actor, action, target, metadata })
 *         Called from any admin-only route after the action succeeds.
 *         Hash chain makes tampering detectable.
 *
 * READ:   listAuditEvents({ actorId?, action?, targetId?, since?, until?, limit?, offset? })
 *         Powers /admin/audit. Always returns descending by createdAt.
 *
 * The chain: hash_n = sha256(prev_hash || canonical_json(row_minus_hash))
 *   - prev_hash is the most recent row's hash (or "" if first)
 *   - canonical_json is the row's payload serialized deterministically
 *   - This means any mutation to a past row invalidates every hash after it
 */

export type AuditAction =
  | "user.ban"
  | "user.unban"
  | "user.suspend"
  | "user.lift-suspension"
  | "user.set-role"
  | "user.set-member-role"
  | "user.invite-to-org"
  | "user.invite-resent"
  | "user.invite-cancelled"
  | "user.remove-from-org"
  | "user.suspend-from-workspace"
  | "user.lift-workspace-suspension"
  | "user.reset-password"
  | "user.force-verify-email"
  | "user.remove"
  | "user.impersonate"
  | "appeal.resolve"
  | "org.delete"
  | "org.suspend"
  | "org.unsuspend"
  | "org.transfer-ownership"
  | "session.revoke"
  | "session.revoke-all"
  | "system.maintenance"
  | "system.announcement"
  | "system.email-policy"
  | "system.ip-allowlist"
  | "feature-flag.update"
  | "billing.refund"
  | "billing.credit"
  | "billing.plan-change"
  | "webhook.create"
  | "webhook.delete"
  | "webhook.rotate-secret"
  | "api-key.create"
  | "api-key.revoke"
  | "dsar.export"
  | "dsar.erase"
  | "load.create"
  | "load.update"
  | "load.delete"
  | "invoice.create"
  | "invoice.update"
  | "invoice.delete"
  | "trip.create"
  | "trip.update"
  | "trip.delete"
  | "driver.create"
  | "driver.update"
  | "driver.delete"
  | "truck.create"
  | "truck.update"
  | "truck.delete"
  | "workspace.update"
  | "member.role_change"
  | "member.permissions.reset"
  | "member.permission.grant"
  | "member.permission.revoke"
  | "member.remove"

export type AuditTargetType =
  | "user"
  | "member"
  | "invitation"
  | "org"
  | "appeal"
  | "session"
  | "system"
  | "billing"
  | "feature-flag"
  | "webhook"
  | "api-key"
  | "dsar"
  | "load"
  | "invoice"
  | "trip"
  | "driver"
  | "truck"
  | "workspace"

export type RecordAuditEvent = {
  actor: { id: string; email: string }
  action: AuditAction
  target: { type: AuditTargetType; id?: string | null; label?: string | null }
  metadata?: Record<string, unknown>
  /** Optional one-line summary that gets folded into the metadata JSON. */
  summary?: string
  /** Skip the IP/UA capture (for background jobs with no request context). */
  skipRequestContext?: boolean
  /**
   * Optional Drizzle transaction. When provided, the audit row is
   * written inside that transaction so a failure in the cascading
   * writes rolls the audit back too. The hash chain is still
   * computed from the global chain (since hash linking is global),
   * so the write MUST be the last step in the caller's transaction.
   *
   * Caller is responsible for committing the transaction.
   */
  tx?: DbOrTx
}

/** Hash a payload deterministically. Uses canonical JSON via JCS-lite. */
function canonicalHash(input: unknown): string {
  // Stable stringify: sort keys recursively. Avoids V8 key-order noise.
  const seen = new WeakSet<object>()
  const walk = (v: unknown): unknown => {
    if (v === null || typeof v !== "object") return v
    if (seen.has(v as object)) return null
    seen.add(v as object)
    if (Array.isArray(v)) return v.map(walk)
    return Object.keys(v as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = walk((v as Record<string, unknown>)[k])
        return acc
      }, {})
  }
  return createHash("sha256").update(JSON.stringify(walk(input))).digest("hex")
}

/** Read the most recent row's hash. Empty string if the chain is empty. */
async function getLastHash(executor: DbOrTx = db): Promise<string> {
  const [row] = await executor
    .select({ hash: auditLog.hash })
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(1)
  return row?.hash ?? ""
}

/**
 * Append a single audit event. NEVER throws — failures are logged but
 * don't block the caller's action. (An audit failure should not be a
 * reason to roll back a ban; the row is best-effort and the next
 * success will catch up the chain from the most recent valid hash.)
 */
export async function recordAuditEvent(e: RecordAuditEvent): Promise<void> {
  try {
    let ipAddress: string | null = null
    let userAgent: string | null = null
    if (!e.skipRequestContext) {
      try {
        const h = await headers()
        ipAddress =
          h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          h.get("x-real-ip") ??
          null
        userAgent = h.get("user-agent") ?? null
      } catch {
        // Not in a request context (background job). That's fine.
      }
    }

    const executor = e.tx ?? db
    const prevHash = await getLastHash(executor)
    const metadata = {
      ...(e.metadata ?? {}),
      ...(e.summary ? { summary: e.summary } : {}),
    }
    const payload = {
      actorId: e.actor.id,
      actorEmail: e.actor.email,
      action: e.action,
      targetType: e.target.type,
      targetId: e.target.id ?? null,
      targetLabel: e.target.label ?? null,
      metadata,
      ipAddress,
      userAgent,
      prevHash,
    }
    const hash = canonicalHash(payload)

    await executor.insert(auditLog).values({
      actorId: e.actor.id,
      actorEmail: e.actor.email,
      action: e.action,
      targetType: e.target.type,
      targetId: e.target.id ?? null,
      targetLabel: e.target.label ?? null,
      metadata: metadata as any,
      ipAddress,
      userAgent,
      prevHash,
      hash,
    })

    console.log(
      `[AUDIT] ${e.action} actor=${e.actor.email} target=${e.target.type}:${e.target.id ?? "-"} hash=${hash.slice(0, 8)}`
    )
  } catch (err) {
    console.error("[AUDIT] write failed (non-fatal):", err)
  }
}

// ─── Read ───────────────────────────────────────────────────────────────────

export type AuditListOpts = {
  actorId?: string
  actorEmail?: string
  action?: string
  targetId?: string
  targetType?: string
  /** "open" filters to last 24h, "all" returns everything (default) */
  since?: Date
  until?: Date
  limit?: number
  offset?: number
}

export async function listAuditEvents(opts: AuditListOpts = {}) {
  const limit = Math.min(opts.limit ?? 100, 500)
  const offset = opts.offset ?? 0

  const conditions: SQL[] = []
  if (opts.actorId) conditions.push(eq(auditLog.actorId, opts.actorId))
  if (opts.actorEmail)
    conditions.push(like(sql`LOWER(${auditLog.actorEmail})`, `%${opts.actorEmail.toLowerCase()}%`))
  if (opts.action) conditions.push(eq(auditLog.action, opts.action))
  if (opts.targetId) conditions.push(eq(auditLog.targetId, opts.targetId))
  if (opts.targetType) conditions.push(eq(auditLog.targetType, opts.targetType))
  if (opts.since) conditions.push(gte(auditLog.createdAt, opts.since))
  if (opts.until) conditions.push(lte(auditLog.createdAt, opts.until))

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(auditLog)
      .where(where)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(auditLog)
      .where(where),
  ])

  return { events: rows, total: Number(totalRow[0]?.count ?? 0) }
}

/** Distinct action names — for the filter dropdown. */
export async function listAuditActionNames(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ action: auditLog.action })
    .from(auditLog)
    .orderBy(auditLog.action)
  return rows.map((r) => r.action)
}

/** Distinct actor emails — for the filter dropdown. */
export async function listAuditActorEmails(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ email: auditLog.actorEmail })
    .from(auditLog)
    .orderBy(auditLog.actorEmail)
    .limit(200)
  return rows.map((r) => r.email)
}

/** Verify the hash chain end-to-end. Returns the index of the first break,
 *  or null if the chain is intact. */
export async function verifyAuditChain(): Promise<{ ok: true } | { ok: false; brokenAt: string }> {
  const rows = await db
    .select()
    .from(auditLog)
    .orderBy(auditLog.createdAt)
  let prevHash = ""
  for (const row of rows) {
    if (row.prevHash !== prevHash) {
      return { ok: false, brokenAt: row.id }
    }
    const expected = canonicalHash({
      actorId: row.actorId,
      actorEmail: row.actorEmail,
      action: row.action,
      targetType: row.targetType,
      targetId: row.targetId,
      targetLabel: row.targetLabel,
      metadata: row.metadata,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      prevHash: row.prevHash,
    })
    if (row.hash !== expected) {
      return { ok: false, brokenAt: row.id }
    }
    prevHash = row.hash ?? ""
  }
  return { ok: true }
}
