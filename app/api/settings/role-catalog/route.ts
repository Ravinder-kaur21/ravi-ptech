import { NextResponse } from "next/server"
import { ROLE_CATALOG, CATALOG_RESOURCES, actionsForResource } from "@/lib/auth-roles"
import { withTenant } from "@/lib/dal"

// [API/ROLE-CATALOG] Phase 3 — WS-31/32/33.
// Returns every role's effective permissions as a {role → resource → action[]}
// shape so /settings/roles can render the permission matrix without
// holding a client copy of `lib/auth-roles.ts`.
//
// Gated by requireTenant (any signed-in workspace member can read it),
// but the data is purely static — the same shape is sent for every
// workspace because the role model is global.

export const GET = withTenant(async () => {
  const roles = ROLE_CATALOG.map((entry) => {
    const stmts = entry.role.statements as Record<string, readonly string[]>
    return {
      id: entry.id,
      label: entry.label,
      description: entry.description,
      order: entry.order,
      permissions: stmts as Record<string, string[]>,
    }
  })

  const resources = CATALOG_RESOURCES.map((r) => ({
    resource: String(r),
    actions: actionsForResource(String(r)),
  }))

  return NextResponse.json({ roles, resources })
})
