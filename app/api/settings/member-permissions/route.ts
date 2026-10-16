/**
 * GET /api/settings/member-permissions?userId=X
 *
 * Returns the effective permission set for a single member, plus the
 * per-member override rows (if any). Used by the manage-permissions
 * screen to render the 130-key toggle matrix.
 */
import { NextRequest, NextResponse } from "next/server"
import { and, eq, like, or } from "drizzle-orm"
import { db } from "@/lib/db"
import { member, organizationRole, user as userTable } from "@/lib/schema"
import { requireTenant, requirePermission, TenantError } from "@/lib/dal"
import { recordAuditEvent } from "@/lib/audit"
import { getEffectivePermissions } from "@/lib/can"
import { ALL_PERMISSION_KEYS, MODULE_GROUPS } from "@/lib/permissions-catalog"
import { PRESETS, presetKeys } from "@/lib/role-presets"
import type { RoleId } from "@/lib/auth-roles"

export const instant = false

export async function GET(req: NextRequest) {
  try {
    const t = await requireTenant()
    await requirePermission({ resource: "member", action: "update" })
    const userId = req.nextUrl.searchParams.get("userId")
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 })
    }

    const [m] = await db
      .select({ role: member.role, name: userTable.name, email: userTable.email })
      .from(member)
      .innerJoin(userTable, eq(userTable.id, member.userId))
      .where(
        and(eq(member.userId, userId), eq(member.organizationId, t.tenantId))
      )
      .limit(1)
    if (!m) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    const roleId = (m.role ?? "member") as RoleId
    const preset = PRESETS[roleId]
    const presetKeySet = presetKeys(roleId, ALL_PERMISSION_KEYS)
    const effectiveSet = await getEffectivePermissions(userId, t.tenantId)
    const grants: string[] = []
    const revokes: string[] = []
    for (const k of effectiveSet) {
      if (!presetKeySet.has(k)) grants.push(k)
    }
    for (const k of presetKeySet) {
      if (!effectiveSet.has(k)) revokes.push(k)
    }

    return NextResponse.json({
      userId,
      email: m.email,
      name: m.name,
      role: roleId,
      presetLabel: preset?.label ?? roleId,
      presetOneLiner: preset?.oneLiner ?? "",
      presetKeys: Array.from(presetKeySet),
      effectiveKeys: Array.from(effectiveSet),
      grants,
      revokes,
      overrides: grants, // backward-compat
      modules: MODULE_GROUPS,
    })
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
    console.error(`[API/MEMBER-PERMISSIONS] error: ${message}`)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * PUT /api/settings/member-permissions
 *
 * Update the per-member override set. Body:
 *   { userId, action: "grant" | "revoke" | "reset" | "setRole", key?, role? }
 *
 * Anti-escalation: the requesting user must already have the key
 * they are trying to grant. (server-side check via getEffectivePermissions)
 */
export async function PUT(req: NextRequest) {
  try {
    const t = await requireTenant()
    await requirePermission({ resource: "member", action: "update" })
    const body = (await req.json()) as {
      userId: string
      action:
        | "grant"
        | "revoke"
        | "reset"
        | "setRole"
        | "default"
        | "inherit"
        | "batch"
      key?: string
      role?: string
      updates?: { key: string; action: "grant" | "revoke" | "default" }[]
    }

    if (!body.userId || !body.action) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    // Anti-escalation on grant: the actor must already have the key.
    if (body.action === "grant" && body.key) {
      const actorPerms = await getEffectivePermissions(t.userId, t.tenantId)
      if (!actorPerms.has(body.key)) {
        return NextResponse.json(
          { error: "You can only grant permissions you yourself have." },
          { status: 403 }
        )
      }
    }

    const [target] = await db
      .select({ id: member.id, role: member.role })
      .from(member)
      .where(
        and(
          eq(member.userId, body.userId),
          eq(member.organizationId, t.tenantId)
        )
      )
      .limit(1)
    if (!target) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    // Need the actor's email for the audit log.
    const [actor] = await db
      .select({ email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, t.userId))
      .limit(1)

    if (body.action === "setRole") {
      if (!body.role) {
        return NextResponse.json({ error: "role required" }, { status: 400 })
      }
      if (target.role === "owner" && body.role !== "owner") {
        return NextResponse.json(
          { error: "Transfer ownership before demoting the owner." },
          { status: 403 }
        )
      }
      await db
        .update(member)
        .set({ role: body.role })
        .where(eq(member.id, target.id))

      await recordAuditEvent({
        actor: { id: t.userId, email: actor?.email ?? t.userId },
        action: "member.role_change",
        target: { type: "member", id: body.userId },
        metadata: { from: target.role, to: body.role },
      })
      return NextResponse.json({ ok: true })
    }

    const roleName = `member:${body.userId}`

    if (body.action === "reset") {
      // Delete per-member override row strictly for this member
      await db
        .delete(organizationRole)
        .where(
          and(
            eq(organizationRole.organizationId, t.tenantId),
            eq(organizationRole.role, roleName)
          )
        )
      await recordAuditEvent({
        actor: { id: t.userId, email: actor?.email ?? t.userId },
        action: "member.permissions.reset",
        target: { type: "member", id: body.userId },
        summary: `Reset permissions of ${body.userId} to preset`,
      })
      return NextResponse.json({ ok: true })
    }

    if (body.action === "batch" && Array.isArray((body as any).updates)) {
      const updates = (body as any).updates as {
        key: string
        action: "grant" | "revoke" | "default"
      }[]
      const catalogKeySet = new Set(ALL_PERMISSION_KEYS)
      const actorPerms = await getEffectivePermissions(t.userId, t.tenantId)

      for (const update of updates) {
        if (!catalogKeySet.has(update.key)) continue
        if (update.action === "grant" && !actorPerms.has(update.key)) {
          return NextResponse.json(
            { error: `You cannot grant ${update.key} as you do not have it.` },
            { status: 403 }
          )
        }
      }

      const [row] = await db
        .select({
          id: organizationRole.id,
          permission: organizationRole.permission,
        })
        .from(organizationRole)
        .where(
          and(
            eq(organizationRole.organizationId, t.tenantId),
            eq(organizationRole.role, roleName)
          )
        )
        .limit(1)

      let current: Record<string, string[]> = {}
      if (row) {
        try {
          current = JSON.parse(row.permission) as Record<string, string[]>
        } catch {
          current = {}
        }
      }

      const grants = new Set(current.__grants ?? [])
      const revokes = new Set(current.__revokes ?? [])

      for (const u of updates) {
        if (!catalogKeySet.has(u.key)) continue
        if (u.action === "grant") {
          grants.add(u.key)
          revokes.delete(u.key)
        } else if (u.action === "revoke") {
          revokes.add(u.key)
          grants.delete(u.key)
        } else {
          grants.delete(u.key)
          revokes.delete(u.key)
        }
      }

      current.__grants = Array.from(grants)
      current.__revokes = Array.from(revokes)

      if (row) {
        await db
          .update(organizationRole)
          .set({
            permission: JSON.stringify(current),
            updatedAt: new Date(),
          })
          .where(eq(organizationRole.id, row.id))
      } else {
        await db.insert(organizationRole).values({
          id: `orgrole_${crypto.randomUUID()}`,
          organizationId: t.tenantId,
          role: roleName,
          permission: JSON.stringify(current),
        })
      }

      await recordAuditEvent({
        actor: { id: t.userId, email: actor?.email ?? t.userId },
        action: "member.permissions.reset",
        target: { type: "member", id: body.userId },
        summary: `Batch updated ${updates.length} permissions for ${body.userId}`,
      })

      return NextResponse.json({ ok: true })
    }

    if (
      (body.action === "grant" ||
        body.action === "revoke" ||
        body.action === "default" ||
        body.action === "inherit") &&
      body.key
    ) {
      // Validate the key is a known catalog key.
      const catalogKeySet = new Set(ALL_PERMISSION_KEYS)
      if (!catalogKeySet.has(body.key)) {
        return NextResponse.json(
          { error: `Unknown permission key: ${body.key}` },
          { status: 400 }
        )
      }

      // Find or create the per-member row.
      const [row] = await db
        .select({
          id: organizationRole.id,
          permission: organizationRole.permission,
        })
        .from(organizationRole)
        .where(
          and(
            eq(organizationRole.organizationId, t.tenantId),
            eq(organizationRole.role, roleName)
          )
        )
        .limit(1)

      let current: Record<string, string[]> = {}
      if (row) {
        try {
          current = JSON.parse(row.permission) as Record<string, string[]>
        } catch {
          current = {}
        }
      }

      // Ensure __grants and __revokes arrays exist.
      const grants = new Set(current.__grants ?? [])
      const revokes = new Set(current.__revokes ?? [])

      if (body.action === "grant") {
        grants.add(body.key)
        revokes.delete(body.key)
      } else if (body.action === "revoke") {
        revokes.add(body.key)
        grants.delete(body.key)
      } else {
        // default / inherit: remove any explicit override
        grants.delete(body.key)
        revokes.delete(body.key)
      }

      // Also maintain backward-compatible BA resource:action format.
      // Split on first dot only for simple keys, or reconstruct for nested.
      const dotIdx = body.key.indexOf(".")
      if (dotIdx > 0) {
        const resource = body.key.slice(0, dotIdx)
        const action = body.key.slice(dotIdx + 1)
        if (body.action === "grant") {
          const list = current[resource] ?? []
          if (!list.includes(action)) {
            current[resource] = [...list, action]
          }
        } else {
          const list = current[resource] ?? []
          current[resource] = list.filter((a) => a !== action)
        }
      }

      current.__grants = Array.from(grants)
      current.__revokes = Array.from(revokes)

      if (row) {
        await db
          .update(organizationRole)
          .set({
            permission: JSON.stringify(current),
            updatedAt: new Date(),
          })
          .where(eq(organizationRole.id, row.id))
      } else {
        await db.insert(organizationRole).values({
          id: `orgrole_${crypto.randomUUID()}`,
          organizationId: t.tenantId,
          role: roleName,
          permission: JSON.stringify(current),
        })
      }

      const isGrant = body.action === "grant"
      const isRevoke = body.action === "revoke"
      await recordAuditEvent({
        actor: { id: t.userId, email: actor?.email ?? t.userId },
        action: isGrant
          ? "member.permission.grant"
          : isRevoke
            ? "member.permission.revoke"
            : "member.permissions.reset",
        target: { type: "member", id: body.userId },
        summary: isGrant
          ? `Granted ${body.key} to ${body.userId}`
          : isRevoke
            ? `Revoked ${body.key} from ${body.userId}`
            : `Reset ${body.key} to role default for ${body.userId}`,
        metadata: { key: body.key },
      })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
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
    console.error(`[API/MEMBER-PERMISSIONS-PUT] error: ${message}`)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
