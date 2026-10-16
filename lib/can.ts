import "server-only"
import { cache } from "react"
import { headers } from "next/headers"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { member, organizationRole } from "@/lib/schema"
import { ALL_PERMISSION_KEYS } from "./permissions-catalog"
import { presetKeys, PRESETS } from "./role-presets"
import type { RoleId } from "./auth-roles"
import { auth } from "./auth"

/**
 * Compute the effective permission set for a (user, organization) pair.
 *
 * Order of operations:
 *   1. Start with the role preset (the role's default key set).
 *   2. Layer any per-member override rows on top:
 *        - Catalog-key format: { "__grants": ["loads.create", ...], "__revokes": ["loads.delete", ...] }
 *        - BA resource:action format: { "loads": ["create", ...] } → reconstructed as "loads.create"
 *
 * The result is a Set of catalog permission keys (e.g. "loads.view_all").
 *
 * Used by every server component that needs to know what the current
 * user can do in the active workspace, and by the per-member and
 * per-role permission override UI in /settings/team and /settings/roles.
 */
export const getEffectivePermissions = cache(
  async (userId: string, organizationId: string): Promise<Set<string>> => {
    if (!userId || !organizationId) return new Set()

    // 1. Resolve the member's role in this org.
    const [m] = await db
      .select({ role: member.role })
      .from(member)
      .where(
        and(
          eq(member.userId, userId),
          eq(member.organizationId, organizationId)
        )
      )
      .limit(1)

    if (!m) return new Set()

    const role = (m.role ?? "member") as RoleId
    const base = presetKeys(role, ALL_PERMISSION_KEYS)

    // 2. Layer per-member override rows from organizationRole.
    const overrides = await db
      .select({ role: organizationRole.role, permission: organizationRole.permission })
      .from(organizationRole)
      .where(
        and(
          eq(organizationRole.organizationId, organizationId)
        )
      )

    if (overrides.length === 0) return base

    // Per-member overrides: a row whose `role` field starts with
    // "member:" is a per-member grant bucket, scoped by user id.
    // We only apply overrides whose role string names the current user.
    for (const row of overrides) {
      const roleName = (row.role ?? "").toString()
      if (!roleName.startsWith("member:")) continue
      const memberTag = roleName.split(":")[1]
      if (memberTag !== userId) continue

      try {
        const parsed = JSON.parse(row.permission) as Record<string, string[]>

        // 1. Format A (catalog-key grants)
        if (parsed.__grants) {
          for (const key of parsed.__grants) base.add(key)
        }

        // 2. Format B (BA resource:action grants)
        for (const [resource, actions] of Object.entries(parsed)) {
          if (resource === "__grants" || resource === "__revokes") continue
          for (const action of actions) {
            base.add(`${resource}.${action}`)
          }
        }

        // 3. Format A (catalog-key revokes) — applied strictly last so revokes always win
        if (parsed.__revokes) {
          for (const key of parsed.__revokes) base.delete(key)
        }
      } catch {
        // malformed row — skip
      }
    }
    return base
  }
)

/** O(1) check for one permission. */
export function can(perms: Set<string>, key: string): boolean {
  return perms.has(key)
}

/** Multiple keys — all must be ON. */
export function canAll(perms: Set<string>, keys: string[]): boolean {
  for (const k of keys) if (!perms.has(k)) return false
  return true
}

/** Multiple keys — any one being ON is enough. */
export function canAny(perms: Set<string>, keys: string[]): boolean {
  for (const k of keys) if (perms.has(k)) return true
  return false
}

/** Returns the preset object for a role, or null if unknown. */
export function getPreset(role: RoleId) {
  return PRESETS[role] ?? null
}

// ─── Server-side catalog permission enforcement ─────────────────────────────
//
// These functions are the Phase 1 unification: the 130-key catalog is now
// enforced server-side, not just client-side. Every server action that
// mutates data should call requireCatalogPermission() with the relevant
// catalog key(s).
//
// The flow:
//   1. Read the session from headers (via Better Auth)
//   2. Get the active organization from the session
//   3. Compute the effective permission set (preset + overrides)
//   4. Check if the key is in the set
//   5. Throw if not
//
// This runs alongside (not instead of) BA's requirePermission() which
// validates org membership and coarse resource access. The catalog check
// adds fine-grained gates on top.

/**
 * Get the current user's session context for permission checks.
 * Returns null if no valid session exists.
 */
const getSessionContext = cache(async (): Promise<{
  userId: string
  organizationId: string
} | null> => {
  try {
    const headersList = await headers()
    const session = await auth.api.getSession({ headers: headersList })
    if (!session?.user?.id) return null
    const orgId = (session.session as any)?.activeOrganizationId
    if (!orgId) return null
    return { userId: session.user.id, organizationId: orgId }
  } catch {
    return null
  }
})

/**
 * Server-side enforcement of a catalog permission key.
 *
 * Throws an error with a descriptive message if the current user
 * does not have the specified catalog permission in the active workspace.
 *
 * Usage in server actions / API routes:
 *   await requireCatalogPermission("loads.create")
 *   await requireCatalogPermission("drivers.edit_sensitive")
 *
 * For BA org-membership + coarse resource checks, continue using
 * `requirePermission()` from dal.ts. Use BOTH for defense in depth:
 *
 *   await requirePermission({ resource: "load", action: "create" })  // BA gate
 *   await requireCatalogPermission("loads.create")                   // Catalog gate
 */
export async function requireCatalogPermission(key: string): Promise<void> {
  const ctx = await getSessionContext()
  if (!ctx) {
    throw new Error("Unauthorized: no active session")
  }

  const perms = await getEffectivePermissions(ctx.userId, ctx.organizationId)
  if (!perms.has(key)) {
    console.log(
      `[CAN] requireCatalogPermission deny: ${key} for user=${ctx.userId} org=${ctx.organizationId}`,
    )
    throw new Error(`Forbidden: missing permission "${key}"`)
  }
}

/**
 * Require ANY ONE of the listed catalog keys to be ON.
 * Useful for pages/actions that accept multiple access paths
 * (e.g., "can view loads via view_all OR view_assigned OR view_own").
 */
export async function requireAnyCatalogPermission(keys: string[]): Promise<void> {
  const ctx = await getSessionContext()
  if (!ctx) {
    throw new Error("Unauthorized: no active session")
  }

  const perms = await getEffectivePermissions(ctx.userId, ctx.organizationId)
  for (const key of keys) {
    if (perms.has(key)) return
  }

  console.log(
    `[CAN] requireAnyCatalogPermission deny: none of [${keys.join(", ")}] for user=${ctx.userId} org=${ctx.organizationId}`,
  )
  throw new Error(`Forbidden: requires one of [${keys.join(", ")}]`)
}

/**
 * Get the effective permissions for the current session.
 * Returns an empty set if no session is active.
 * Useful for server components that need to conditionally render.
 */
export const getCurrentPermissions = cache(async (): Promise<Set<string>> => {
  const ctx = await getSessionContext()
  if (!ctx) return new Set()
  return getEffectivePermissions(ctx.userId, ctx.organizationId)
})
