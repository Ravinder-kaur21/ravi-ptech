/**
 * GET /api/settings/role-permissions?roleId=X
 *
 * Returns the effective permission set for a single role preset
 * (or a custom role if roleId is a custom name). Used by the
 * per-role detail page.
 */
import { NextRequest, NextResponse } from "next/server"
import { and, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { organizationRole, member as memberTable } from "@/lib/schema"
import { requireTenant, requirePermission, TenantError } from "@/lib/dal"
import {
  MODULE_GROUPS,
  ALL_PERMISSION_KEYS,
} from "@/lib/permissions-catalog"
import { PRESETS, presetKeys } from "@/lib/role-presets"
import type { RoleId } from "@/lib/auth-roles"

export const instant = false

export async function GET(req: NextRequest) {
  try {
    const t = await requireTenant()
    await requirePermission({ resource: "member", action: "read" })
    const roleId = req.nextUrl.searchParams.get("roleId")
    if (!roleId) {
      return NextResponse.json({ error: "roleId required" }, { status: 400 })
    }

    const preset = PRESETS[roleId as RoleId]
    let label = roleId
    let oneLiner = "Custom role"
    let description = "Custom role"
    let effectiveKeys: string[] = []

    if (preset) {
      label = preset.label
      oneLiner = preset.oneLiner
      description = preset.description
      effectiveKeys = Array.from(presetKeys(roleId as RoleId, ALL_PERMISSION_KEYS))
    } else {
      // Custom role — read from organizationRole.
      const [row] = await db
        .select({ permission: organizationRole.permission })
        .from(organizationRole)
        .where(
          and(
            eq(organizationRole.organizationId, t.tenantId),
            eq(organizationRole.role, roleId)
          )
        )
        .limit(1)
      if (row) {
        try {
          const parsed = JSON.parse(row.permission) as Record<string, string[]>
          for (const [resource, actions] of Object.entries(parsed)) {
            for (const a of actions) effectiveKeys.push(`${resource}.${a}`)
          }
        } catch {}
      }
    }

    const [count] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(memberTable)
      .where(
        and(
          eq(memberTable.organizationId, t.tenantId),
          eq(memberTable.role, roleId)
        )
      )

    return NextResponse.json({
      role: roleId,
      label,
      oneLiner,
      description,
      effectiveKeys,
      memberCount: Number(count?.count ?? 0),
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
    console.error(`[API/ROLE-PERMISSIONS] error: ${message}`)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
