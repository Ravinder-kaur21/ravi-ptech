import { NextRequest, NextResponse } from "next/server"
import { and, eq, sql } from "drizzle-orm"
import { z } from "zod"
import { randomUUID } from "node:crypto"
import { db } from "@/lib/db"
import { organizationRole, member as memberTable, user as userTable } from "@/lib/schema"
import { requireTenant, requirePermission, TenantError } from "@/lib/dal"
import { requireCatalogPermission } from "@/lib/can"
import { recordAuditEvent } from "@/lib/audit"
import { PRESETS, presetKeys } from "@/lib/role-presets"
import { ALL_PERMISSION_KEYS } from "@/lib/permissions-catalog"
import { ROLE_CATALOG, type RoleId } from "@/lib/auth-roles"

const createRoleSchema = z.object({
  label: z.string().min(2).max(50),
  role: z.string().min(2).max(30).regex(/^[a-z0-9_]+$/, "Role must be lowercase letters, numbers, and underscores only"),
  description: z.string().max(255).optional(),
  cloneFrom: z.string().optional(),
})

import { buildRolePermissionPayload } from "@/lib/role-payload"
export { buildRolePermissionPayload }

export const instant = false

export async function POST(req: NextRequest) {
  try {
    const t = await requireTenant()
    await requirePermission({ resource: "member", action: "update" })
    await requireCatalogPermission("users.roles.manage")

    const body = await req.json().catch(() => null)
    const parsed = createRoleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid role payload", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { label, role, description, cloneFrom } = parsed.data

    // Check if reserved starter role
    const isStarter = ROLE_CATALOG.some((r) => r.id === role)
    if (isStarter || role.startsWith("member:")) {
      return NextResponse.json(
        { error: `The role identifier "${role}" is reserved by the system.` },
        { status: 400 }
      )
    }

    // Check if role already exists for this tenant
    const [existing] = await db
      .select({ id: organizationRole.id })
      .from(organizationRole)
      .where(
        and(
          eq(organizationRole.organizationId, t.tenantId),
          eq(organizationRole.role, role)
        )
      )
      .limit(1)

    if (existing) {
      return NextResponse.json(
        { error: `A role with identifier "${role}" already exists in this workspace.` },
        { status: 409 }
      )
    }

    // Compute initial permission payload
    let grants: string[] = []
    if (cloneFrom && cloneFrom in PRESETS) {
      const keysSet = presetKeys(cloneFrom as RoleId, ALL_PERMISSION_KEYS)
      grants = Array.from(keysSet)
    }

    const permissionPayload = buildRolePermissionPayload(grants, {
      label,
      description: description ?? "",
      clonedFrom: cloneFrom || null,
    })

    const newId = randomUUID()
    await db.insert(organizationRole).values({
      id: newId,
      organizationId: t.tenantId,
      role,
      permission: JSON.stringify(permissionPayload),
    })

    // Audit log
    const [actor] = await db
      .select({ email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, t.userId))
      .limit(1)

    await recordAuditEvent({
      actor: { id: t.userId, email: actor?.email ?? "(unknown)" },
      action: "role.create",
      target: { type: "role", id: newId, label: `${label} (${role})` },
      metadata: { tenantId: t.tenantId, role, label, cloneFrom: cloneFrom || null },
    })

    try {
      const { dispatchNotificationEvent } = await import("@/lib/notifications")
      await dispatchNotificationEvent({
        organizationId: t.tenantId,
        category: "team",
        event: "team.role_updated",
        severity: "info",
        title: "Role Configured",
        message: `Custom role "${label}" (${role}) was defined with ${grants.length} permissions.`,
        link: "/settings/roles",
        metadata: { roleId: newId, role, label },
      })
    } catch (e) {
      console.error("[NOTIFICATIONS] Error dispatching team.role_updated:", e)
    }

    return NextResponse.json({
      success: true,
      role: {
        id: newId,
        role,
        label,
        description: description ?? "",
        onCount: grants.length,
        memberCount: 0,
      },
    })
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json(
        { error: err.code },
        { status: err.code === "UNAUTHORIZED" ? 401 : 403 }
      )
    }
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error(`[API/ROLES] POST error: ${message}`)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const t = await requireTenant()
    await requirePermission({ resource: "member", action: "delete" })
    await requireCatalogPermission("users.roles.manage")

    const { searchParams } = new URL(req.url)
    const role = searchParams.get("role")
    if (!role) {
      return NextResponse.json({ error: "Role parameter is required" }, { status: 400 })
    }

    // Starter roles cannot be deleted
    const isStarter = ROLE_CATALOG.some((r) => r.id === role)
    if (isStarter) {
      return NextResponse.json(
        { error: "Starter system roles cannot be deleted." },
        { status: 400 }
      )
    }

    // Check if any members currently have this role
    const [memberCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(memberTable)
      .where(
        and(
          eq(memberTable.organizationId, t.tenantId),
          eq(memberTable.role, role)
        )
      )

    if (Number(memberCount?.count ?? 0) > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete role "${role}" because ${memberCount?.count} member(s) are currently assigned to it. Reassign them first.`,
        },
        { status: 400 }
      )
    }

    await db
      .delete(organizationRole)
      .where(
        and(
          eq(organizationRole.organizationId, t.tenantId),
          eq(organizationRole.role, role)
        )
      )

    const [actor] = await db
      .select({ email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, t.userId))
      .limit(1)

    await recordAuditEvent({
      actor: { id: t.userId, email: actor?.email ?? "(unknown)" },
      action: "role.delete",
      target: { type: "role", label: role },
      metadata: { tenantId: t.tenantId, role },
    })

    return NextResponse.json({ success: true, deleted: role })
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json(
        { error: err.code },
        { status: err.code === "UNAUTHORIZED" ? 401 : 403 }
      )
    }
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error(`[API/ROLES] DELETE error: ${message}`)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const t = await requireTenant()
    await requirePermission({ resource: "member", action: "update" })
    await requireCatalogPermission("users.roles.manage")

    const body = await req.json().catch(() => null)
    if (!body || !body.role) {
      return NextResponse.json({ error: "Role is required" }, { status: 400 })
    }

    const role = body.role
    const isStarter = ROLE_CATALOG.some((r) => r.id === role)
    if (isStarter) {
      return NextResponse.json(
        { error: "Starter system role presets are immutable. Clone it to a custom role to customize." },
        { status: 400 }
      )
    }

    const [row] = await db
      .select({ id: organizationRole.id, permission: organizationRole.permission })
      .from(organizationRole)
      .where(
        and(
          eq(organizationRole.organizationId, t.tenantId),
          eq(organizationRole.role, role)
        )
      )
      .limit(1)

    if (!row) {
      return NextResponse.json({ error: "Custom role not found" }, { status: 404 })
    }

    let parsed: any = {}
    try {
      parsed = JSON.parse(row.permission)
    } catch {}

    const grants = new Set<string>(parsed.__grants ?? [])

    if (body.action === "toggle" && body.key) {
      if (body.enable) {
        grants.add(body.key)
      } else {
        grants.delete(body.key)
      }
    } else if (body.action === "batch" && Array.isArray(body.keys)) {
      if (body.enable) {
        for (const k of body.keys) grants.add(k)
      } else {
        for (const k of body.keys) grants.delete(k)
      }
    } else if (Array.isArray(body.grants)) {
      grants.clear()
      for (const k of body.grants) grants.add(k)
    }

    const existingLabel = Array.isArray(parsed.__label) ? parsed.__label[0] : (parsed.label || role)
    const existingDesc = Array.isArray(parsed.__description) ? parsed.__description[0] : (parsed.description || "")
    const existingClonedFrom = Array.isArray(parsed.__clonedFrom) ? parsed.__clonedFrom[0] : (parsed.clonedFrom || null)

    const updatedPayload = buildRolePermissionPayload(Array.from(grants), {
      label: body.label ?? existingLabel,
      description: body.description ?? existingDesc,
      clonedFrom: existingClonedFrom,
    })

    await db
      .update(organizationRole)
      .set({
        permission: JSON.stringify(updatedPayload),
        updatedAt: new Date(),
      })
      .where(eq(organizationRole.id, row.id))

    const [actor] = await db
      .select({ email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, t.userId))
      .limit(1)

    await recordAuditEvent({
      actor: { id: t.userId, email: actor?.email ?? "(unknown)" },
      action: "role.update",
      target: { type: "role", id: row.id, label: role },
      metadata: {
        tenantId: t.tenantId,
        role,
        action: body.action ?? "update",
        key: body.key ?? null,
        onCount: grants.size,
      },
    })

    try {
      const { dispatchNotificationEvent } = await import("@/lib/notifications")
      await dispatchNotificationEvent({
        organizationId: t.tenantId,
        category: "team",
        event: "team.role_updated",
        severity: "info",
        title: "Role Permissions Updated",
        message: `Role "${role}" was updated (${grants.size} active permissions).`,
        link: "/settings/roles",
        metadata: { role, permissionsCount: grants.size },
      })
    } catch (e) {
      console.error("[NOTIFICATIONS] Error dispatching team.role_updated:", e)
    }

    return NextResponse.json({
      success: true,
      role,
      onCount: grants.size,
      effectiveKeys: Array.from(grants),
    })
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json(
        { error: err.code },
        { status: err.code === "UNAUTHORIZED" ? 401 : 403 }
      )
    }
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error(`[API/ROLES] PUT error: ${message}`)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
