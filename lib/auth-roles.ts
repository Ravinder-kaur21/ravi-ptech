import { createAccessControl } from "better-auth/plugins"
import { defaultStatements } from "better-auth/plugins/organization/access"

// ─── Muvx role model ─────────────────────────────────────────────
// Better Auth ships only owner/admin/member. A TMS needs finer
// operational roles, so we declare an access control and custom roles
// here. This module is imported by BOTH lib/auth.ts (server) and
// lib/auth-client.ts (browser) — it must stay free of server-only
// imports like ./db and ./email.
// ──────────────────────────────────────────────────────────────────

const statement = {
  ...defaultStatements,
  // TMS-specific resources. Declared now so the role model is
  // type-safe; per-module permission checks get wired up as the
  // Fleet/Drivers/Invoice modules land.
  load: ["create", "read", "update", "delete"],
  trip: ["create", "read", "update", "delete"],
  driver: ["create", "read", "update", "delete"],
  truck: ["create", "read", "update", "delete"],
  invoice: ["create", "read", "update", "delete"],
  payroll: ["create", "read", "update", "delete"],
} as const

export const ac = createAccessControl(statement)

const FULL_TMS = {
  load: ["create", "read", "update", "delete"],
  trip: ["create", "read", "update", "delete"],
  driver: ["create", "read", "update", "delete"],
  truck: ["create", "read", "update", "delete"],
  invoice: ["create", "read", "update", "delete"],
  payroll: ["create", "read", "update", "delete"],
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
  member: ["create", "update", "delete"],
  ...FULL_TMS,
})

export const member = ac.newRole({
  ac: ["read"],
})

/** Full ops access — loads, trips, fleet, drivers. */
export const opsManager = ac.newRole({
  load: ["create", "read", "update", "delete"],
  trip: ["create", "read", "update", "delete"],
  driver: ["create", "read", "update", "delete"],
  truck: ["create", "read", "update", "delete"],
})

/** Assigns loads and trips, cannot create equipment. */
export const dispatcher = ac.newRole({
  load: ["create", "read", "update"],
  trip: ["create", "read", "update"],
  driver: ["read", "update"],
  truck: ["read"],
})

/** Money — invoices, payroll, reports. No dispatch access. */
export const accounting = ac.newRole({
  invoice: ["create", "read", "update", "delete"],
  payroll: ["create", "read", "update", "delete"],
  load: ["read"],
})

/** Driver — sees only what is assigned to them. */
export const driverRole = ac.newRole({
  load: ["read"],
  trip: ["read"],
})

/** Safety/compliance — driver records, read-only elsewhere. */
export const safety = ac.newRole({
  driver: ["read", "update"],
  load: ["read"],
  truck: ["read"],
})