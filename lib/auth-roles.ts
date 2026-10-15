import { createAccessControl } from "better-auth/plugins"
import { defaultStatements } from "better-auth/plugins/organization/access"

// ─── Muvx role model ─────────────────────────────────────────────
// Better Auth ships only owner/admin/member. A TMS needs finer
// operational roles, so we declare an access control and custom roles
// here. This module is imported by BOTH lib/auth.ts (server) and
// lib/auth-client.ts (browser) — it must stay free of server-only
// imports like ./db and ./email.
// ──────────────────────────────────────────────────────────────────

/**
 * Single source of truth for all role IDs. Use `as const` so TypeScript
 * preserves the literal union type: `"owner" | "admin" | "member" | ...`.
 * Every other role list in the codebase derives from this — no hardcoded
 * arrays elsewhere (fixes GAP-2 / GAP-6 role-list divergence).
 */
export const ROLE_IDS = [
  "owner",
  "admin",
  "member",
  "operations_manager",
  "dispatcher",
  "accounting",
  "driver",
  "safety",
] as const
export type RoleId = (typeof ROLE_IDS)[number]

const statement = {
  ...defaultStatements,
  // Member resource: BA defaults (create, update, delete) + TMS-specific
  // suspend / lift-suspension actions for workspace-scoped member actions.
  member: ["create", "update", "delete", "suspend", "lift-suspension"],
  // TMS-specific resources. Declared now so the role model is
  // type-safe; per-module permission checks get wired up as the
  // Fleet/Drivers/Invoice modules land.
  load: ["create", "read", "update", "delete"],
  trip: ["create", "read", "update", "delete"],
  driver: ["create", "read", "update", "delete"],
  truck: ["create", "read", "update", "delete"],
  invoice: ["create", "read", "update", "delete"],
  payroll: ["create", "read", "update", "delete"],
  // Phase 3 (WS-09, WS-10): workspace profile fields (business type,
  // DOT/MC, address, currency, time zone, fiscal year). All roles
  // can `read`; only owner/admin can `update`.
  workspace: ["read", "update"],
} as const

export const ac = createAccessControl(statement)

const FULL_TMS = {
  load: ["create", "read", "update", "delete"],
  trip: ["create", "read", "update", "delete"],
  driver: ["create", "read", "update", "delete"],
  truck: ["create", "read", "update", "delete"],
  invoice: ["create", "read", "update", "delete"],
  payroll: ["create", "read", "update", "delete"],
  member: ["create", "update", "delete", "suspend", "lift-suspension"],
  workspace: ["read", "update"],
} as const

/** The three built-in roles, re-declared over our statement set so the
 *  extra TMS resources are visible alongside the defaults. Permissions
 *  match Better Auth's owner/admin/member exactly. */
export const owner = ac.newRole({
  ...defaultStatements,
  ...FULL_TMS,
})

export const administrator = ac.newRole({
  organization: ["update"],
  invitation: ["create", "cancel"],
  ...FULL_TMS,
})

/**
 * Bare "member" — no special TMS role. Can see TMS records (loads/trips/
 * drivers/trucks/invoices) but cannot mutate them. BA's `defaultStatements`
 * (`update`/`delete` on member/invitation/organization) doesn't include read;
 * per Better Auth's strict-typed access-control, attempting to grant
 * `["read"]` on those resources is a type error. We grant read on TMS
 * resources only; access to the BA member/invitation/organization
 * resources is intentionally empty (the default-deny policy applies).
 *
 * Note: earlier revisions used `ac: ["read"]` which was a typo (`ac`
 * is not a resource) — that role received zero effective permissions and
 * every `checkRolePermission` returned false. Documented here so the
 * mistake doesn't come back.
 */
export const member = ac.newRole({
  load: ["read"],
  trip: ["read"],
  driver: ["read"],
  truck: ["read"],
  invoice: ["read"],
  workspace: ["read"],
})

/** Full ops access — loads, trips, fleet, drivers. */
export const opsManager = ac.newRole({
  load: ["create", "read", "update", "delete"],
  trip: ["create", "read", "update", "delete"],
  driver: ["create", "read", "update", "delete"],
  truck: ["create", "read", "update", "delete"],
  workspace: ["read"],
})

/** Assigns loads and trips, cannot create equipment. */
export const dispatcher = ac.newRole({
  load: ["create", "read", "update"],
  trip: ["create", "read", "update"],
  driver: ["read", "update"],
  truck: ["read"],
  workspace: ["read"],
})

/** Money — invoices, payroll, reports. No dispatch access. */
export const accounting = ac.newRole({
  invoice: ["create", "read", "update", "delete"],
  payroll: ["create", "read", "update", "delete"],
  load: ["read"],
  workspace: ["read"],
})

/** Driver — sees only what is assigned to them. */
export const driverRole = ac.newRole({
  load: ["read"],
  trip: ["read"],
  workspace: ["read"],
})

/** Safety/compliance — driver records, read-only elsewhere. */
export const safety = ac.newRole({
  driver: ["read", "update"],
  load: ["read"],
  truck: ["read"],
  workspace: ["read"],
})

// ─── Role catalog (Phase 3, WS-31/32/33) ────────────────────────────────────
// Static metadata used by /settings/roles. Display labels, short
// descriptions, and the BA-issued role id (the key that ends up in
// member.role). Statements are read from the role objects above so
// the catalog can never drift from the access-control declarations.

export type RoleCatalogEntry = {
  /** The role id used in `member.role`. */
  id: RoleId
  /** The BA-issued role object (for its `.statements`). */
  role: ReturnType<typeof ac.newRole>
  /** Human-readable label for the UI. */
  label: string
  /** One-line description. */
  description: string
  /** Order in the catalog. */
  order: number
}

export const ROLE_CATALOG: RoleCatalogEntry[] = [
  {
    id: "owner",
    role: owner,
    label: "Owner",
    description:
      "Full control of the workspace, including billing, ownership transfer, and all member roles.",
    order: 1,
  },
  {
    id: "admin",
    role: administrator,
    label: "Administrator",
    description:
      "Manages members, invitations, and the workspace profile. Cannot transfer ownership.",
    order: 2,
  },
  {
    id: "operations_manager",
    role: opsManager,
    label: "Operations Manager",
    description:
      "Full operational access to loads, trips, fleet, and drivers.",
    order: 3,
  },
  {
    id: "dispatcher",
    role: dispatcher,
    label: "Dispatcher",
    description:
      "Creates and assigns loads and trips. Read-only access to drivers and trucks.",
    order: 4,
  },
  {
    id: "accounting",
    role: accounting,
    label: "Accounting",
    description:
      "Manages invoices and payroll. Read-only access to loads for billing context.",
    order: 5,
  },
  {
    id: "driver",
    role: driverRole,
    label: "Driver",
    description:
      "Read-only access to assigned loads and trips. Cannot edit workspace data.",
    order: 6,
  },
  {
    id: "safety",
    role: safety,
    label: "Safety / Compliance",
    description:
      "Read/write access to driver records. Read-only access to loads and trucks.",
    order: 7,
  },
  {
    id: "member",
    role: member,
    label: "Member",
    description:
      "Read-only access to TMS records. Default role for new invitations.",
    order: 8,
  },
]

/** All resources declared in the access-control statement. */
export const CATALOG_RESOURCES = Object.keys(statement) as (keyof typeof statement)[]

/**
 * Roles assignable via invite or role-change dialogs.
 * `owner` is excluded — it is set only via transfer-ownership.
 * This is the SINGLE SOURCE OF TRUTH for the assignable role set,
 * replacing the hardcoded lists that previously diverged across
 * team-client.tsx, onboarding/page.tsx, and invitation.ts (GAP-2, GAP-6).
 */
export const ASSIGNABLE_ROLES = ROLE_CATALOG.filter((r) => r.id !== "owner")
export type AssignableRoleId = (typeof ASSIGNABLE_ROLES)[number]["id"]

/**
 * Literal tuple of assignable role IDs (excluding "owner"),
 * for use with zod's z.enum — preserves the literal union type
 * at compile time (fixes type regression from dynamic array).
 */
export const ASSIGNABLE_ROLE_IDS = [
  "admin",
  "member",
  "operations_manager",
  "dispatcher",
  "accounting",
  "driver",
  "safety",
] as const

/** All actions declared for a given resource. */
export const actionsForResource = (resource: string): readonly string[] => {
  return (statement as Record<string, readonly string[]>)[resource] ?? []
}