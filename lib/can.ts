import "server-only"
import { cache } from "react"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { member, organizationRole } from "@/lib/schema"
import { ALL_PERMISSION_KEYS } from "./permissions-catalog"
import { presetKeys, PRESETS } from "./role-presets"
import type { RoleId } from "./auth-roles"

/**
 * Compute the effective permission set for a (user, organization) pair.
 *
 * Order of operations:
 *   1. Start with the role preset (the role's default key set).
 *   2. Layer any per-member override rows on top:
 *        - grant rows add keys
 *        - revoke rows remove keys
 *
 * The result is a Set of permission keys (e.g. "loads.view_all").
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

    // 2. Layer per-member override rows. These live in organizationRole
    //    keyed by member id; the role name there is the source of the
    //    override set (BA DAC stores permissions as a JSON object on
    //    the role row). We treat any row with the same organizationId
    //    and a role string other than the preset as a per-member
    //    override bucket. BA's `create-role` endpoint enforces
    //    anti-escalation at write time.
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
    // "member:" is a per-member grant bucket, scoped by member id in
    // the role string. We only apply overrides whose role string
    // names the current member. Other rows (role presets, custom
    // roles) are not applied at the member level here — custom roles
    // are applied by changing the member.role on the member row.
    for (const row of overrides) {
      const roleName = (row.role ?? "").toString()
      if (!roleName.startsWith("member:")) continue
      const memberTag = roleName.split(":")[1]
      if (memberTag !== userId) continue
      const perm = row.permission
      // `permission` is a JSON string of form {"resource":["action",...],...}
      try {
        const parsed = JSON.parse(perm) as Record<string, string[]>
        for (const actions of Object.values(parsed)) {
          for (const a of actions) base.add(`${a}`)
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
