/**
 * GET /api/settings/roles-summary
 *
 * Returns the list of starter and custom roles for the active
 * workspace, with member counts and ON-permission counts.
 */
import { NextResponse } from "next/server"
import { and, eq, ne, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { member, organizationRole } from "@/lib/schema"
import { requireTenant, requirePermission, TenantError } from "@/lib/dal"
import { PRESET_LIST, presetOnCount } from "@/lib/role-presets"
import { ALL_PERMISSION_KEYS } from "@/lib/permissions-catalog"

export const instant = false

export async function GET() {
  try {
    const t = await requireTenant()
    await requirePermission({ resource: "member", action: "read" })

    // Member count per role in this workspace.
    const counts = await db
      .select({ role: member.role, count: sql<number>`count(*)::int` })
      .from(member)
      .where(eq(member.organizationId, t.tenantId))
      .groupBy(member.role)

    const countByRole: Record<string, number> = {}
    for (const c of counts) countByRole[c.role ?? "member"] = Number(c.count)

    const starter = PRESET_LIST.map((p) => ({
      role: p.role,
      label: p.label,
      description: p.oneLiner,
      onCount: presetOnCount(p.role, ALL_PERMISSION_KEYS),
      memberCount: countByRole[p.role] ?? 0,
    }))

    // Custom roles: any organizationRole row whose role name is not
    // a known starter role id. (Real custom roles live as a row with
    // `role = "<custom-name>"` and a permission JSON blob.)
    const starterIds = new Set(PRESET_LIST.map((p) => p.role))
    const customRows = await db
      .select({
        id: organizationRole.id,
        role: organizationRole.role,
        permission: organizationRole.permission,
      })
      .from(organizationRole)
      .where(
        and(
          eq(organizationRole.organizationId, t.tenantId),
          ne(sql`${organizationRole.role}`, "member:%")
        )
      )

    const custom: {
      id: string
      role: string
      label: string
      description: string
      clonedFrom: string | null
      onCount: number
      memberCount: number
    }[] = []
    const seen = new Set<string>()
    for (const row of customRows) {
      const roleName = (row.role ?? "").toString()
      if (starterIds.has(roleName as any)) continue
      if (roleName.startsWith("member:")) continue
      if (seen.has(roleName)) continue
      seen.add(roleName)

      let onCount = 0
      let label = roleName
      let description = "Custom role"
      let clonedFrom: string | null = null

      try {
        const parsed = JSON.parse(row.permission) as Record<string, any>
        if (Array.isArray(parsed.__grants)) {
          onCount = parsed.__grants.length
        } else {
          for (const [k, actions] of Object.entries(parsed)) {
            if (!k.startsWith("__") && Array.isArray(actions)) onCount += actions.length
          }
        }

        if (Array.isArray(parsed.__label) && parsed.__label[0]) label = parsed.__label[0]
        else if (typeof parsed.label === "string") label = parsed.label

        if (Array.isArray(parsed.__description) && parsed.__description[0]) description = parsed.__description[0]
        else if (typeof parsed.description === "string") description = parsed.description

        if (Array.isArray(parsed.__clonedFrom) && parsed.__clonedFrom[0]) clonedFrom = parsed.__clonedFrom[0]
        else if (typeof parsed.clonedFrom === "string") clonedFrom = parsed.clonedFrom
      } catch {}

      custom.push({
        id: row.id,
        role: roleName,
        label,
        description,
        clonedFrom,
        onCount,
        memberCount: countByRole[roleName] ?? 0,
      })
    }

    return NextResponse.json({ starter, custom })
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
    console.error(`[API/ROLES-SUMMARY] error: ${message}`)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
