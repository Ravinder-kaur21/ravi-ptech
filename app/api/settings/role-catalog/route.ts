import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { ROLE_CATALOG, CATALOG_RESOURCES, actionsForResource } from "@/lib/auth-roles"
import { withTenant } from "@/lib/dal"

// [API/ROLE-CATALOG] Phase 3 — WS-31/32/33.
// Returns every role's effective permissions as a {role → resource → action[]}
// shape so /settings/roles can render the permission matrix.
//
// Static roles come from the global ROLE_CATALOG. Custom (per-workspace) roles
// come from the organization_role table via auth.api.listOrgRoles().

export const GET = withTenant(async () => {
  const roles = ROLE_CATALOG.map((entry) => {
    const stmts = entry.role.statements as Record<string, readonly string[]>
    return {
      id: entry.id,
      label: entry.label,
      description: entry.description,
      order: entry.order,
      permissions: stmts as Record<string, string[]>,
      isCustom: false,
    }
  })

  // Fetch custom roles for this workspace (dynamic access control)
  const hdrs = await headers()
  let customRoles: Array<{
    id: string
    label: string
    description: string
    order: number
    permissions: Record<string, string[]>
    isCustom: boolean
  }> = []
  try {
    const orgRoles = await auth.api.listOrgRoles({
      headers: Object.fromEntries(hdrs),
    })
    customRoles = orgRoles.map((r: { role: string; permission: Record<string, string[]> }) => ({
      id: r.role,
      label: r.role,
      description: "Custom role",
      order: 999, // custom roles sort after static ones
      permissions: r.permission,
      isCustom: true,
    }))
  } catch {
    // Non-owner/admin won't have ac:read permission — silently skip custom roles
  }

  const resources = CATALOG_RESOURCES.map((r) => ({
    resource: String(r),
    actions: actionsForResource(String(r)),
  }))

  return NextResponse.json({ roles: [...roles, ...customRoles], resources })
})
