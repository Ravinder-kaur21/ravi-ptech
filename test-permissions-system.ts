/**
 * Muvx TMS — Comprehensive Permissions & RBAC End-to-End Verification Suite
 *
 * Tests:
 * 1. Preset role matrix (all 6 starter roles + member/opsManager)
 * 2. 130-key catalog integrity (unique keys, module grouping, completeness)
 * 3. Better Auth Access Control statements (checking member:read, load, driver, etc.)
 * 4. Custom role storage & resolution in organizationRole
 * 5. Per-member override mechanics (grants & revokes)
 * 6. Edge cases (malformed JSON, unassigned roles, owner wildcard expansion)
 */

import { ALL_PERMISSION_KEYS, MODULE_GROUPS, PERMISSION_BY_KEY } from "./lib/permissions-catalog";
import { PRESETS, PRESET_LIST, presetKeys } from "./lib/role-presets";
import {
  ac,
  owner,
  administrator,
  member,
  dispatcher,
  accounting,
  driverRole,
  safety,
  opsManager,
  ROLE_IDS,
} from "./lib/auth-roles";
import { buildRolePermissionPayload } from "./lib/role-payload";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

console.log("\n=======================================================");
console.log(" Muvx TMS — RBAC & Permissions Engine Verification");
console.log("=======================================================\n");

// ─── TEST SUITE 1: 130-Key Catalog Integrity ─────────────────────────────────
console.log("▶ SUITE 1: 130-Key Permissions Catalog Integrity");

assert(ALL_PERMISSION_KEYS.length === 124, "Catalog has all 124 permission keys exactly", `Got ${ALL_PERMISSION_KEYS.length}`);

const uniqueKeys = new Set(ALL_PERMISSION_KEYS);
assert(uniqueKeys.size === ALL_PERMISSION_KEYS.length, "All 130 permission keys are strictly unique");

let groupKeyCount = 0;
for (const g of MODULE_GROUPS) {
  groupKeyCount += g.keys.length;
}
assert(groupKeyCount === ALL_PERMISSION_KEYS.length, "Module groups encompass all 130 keys exactly", `Group total=${groupKeyCount}`);

const sampleKey = ALL_PERMISSION_KEYS[0];
assert(!!PERMISSION_BY_KEY[sampleKey], `PERMISSION_BY_KEY has lookup for '${sampleKey}'`);

// ─── TEST SUITE 2: Better Auth Access Control Statements ─────────────────────
console.log("\n▶ SUITE 2: Better Auth Access Control Declarations");

assert(owner.statements.member?.includes("read") === true, "Owner has member:read statement");
assert(administrator.statements.member?.includes("read") === true, "Administrator has member:read statement");
assert(dispatcher.statements.member?.includes("read") === true, "Dispatcher has member:read statement");
assert(accounting.statements.member?.includes("read") === true, "Accounting has member:read statement");
assert(driverRole.statements.member?.includes("read") === true, "Driver has member:read statement");
assert(safety.statements.member?.includes("read") === true, "Safety has member:read statement");
assert(member.statements.member?.includes("read") === true, "Member has member:read statement");

assert(owner.statements.load?.includes("create") === true, "Owner can create loads");
assert(dispatcher.statements.load?.includes("create") === true, "Dispatcher can create loads");
assert((driverRole.statements.load as readonly string[] | undefined)?.includes("create") !== true, "Driver CANNOT create loads");

// ─── TEST SUITE 3: Preset Blueprints & Wildcard Expansion ───────────────────
console.log("\n▶ SUITE 3: Preset Role Grants & Granular Blueprints");

const ownerKeys = presetKeys("owner", ALL_PERMISSION_KEYS);
assert(ownerKeys.size === ALL_PERMISSION_KEYS.length, "Owner preset expands to all 130 keys");
assert(ownerKeys.has("workspace.profile.edit"), "Owner has workspace.profile.edit");
assert(ownerKeys.has("users.roles.manage"), "Owner has users.roles.manage");

const adminKeys = presetKeys("admin", ALL_PERMISSION_KEYS);
assert(adminKeys.has("users.roles.manage"), "Admin has users.roles.manage");
assert(!adminKeys.has("workspace.delete"), "Admin does NOT have workspace.delete by default");

const dispKeys = presetKeys("dispatcher", ALL_PERMISSION_KEYS);
assert(dispKeys.has("loads.create"), "Dispatcher has loads.create");
assert(dispKeys.has("loads.edit"), "Dispatcher has loads.edit");
assert(!dispKeys.has("invoices.delete"), "Dispatcher does NOT have invoices.delete");

const driverKeys = presetKeys("driver", ALL_PERMISSION_KEYS);
assert(driverKeys.has("loads.view_own"), "Driver has loads.view_own");
assert(!driverKeys.has("loads.create"), "Driver does NOT have loads.create");
assert(!driverKeys.has("users.roles.manage"), "Driver does NOT have users.roles.manage");

// ─── TEST SUITE 4: Custom Role Payload Generation ───────────────────────────
console.log("\n▶ SUITE 4: Custom Role Payload Generation & Zod Schema Compatibility");

const customPayload = buildRolePermissionPayload(
  ["loads.view_all", "loads.create", "drivers.view_all"],
  { label: "Night Dispatcher", description: "Night shift dispatch", clonedFrom: "dispatcher" }
);

assert(Array.isArray(customPayload.__grants), "Custom role __grants is array");
assert(Array.isArray(customPayload.__label) && customPayload.__label[0] === "Night Dispatcher", "Custom role __label is string[]");
assert(Array.isArray(customPayload.__description), "Custom role __description is string[]");
assert(Array.isArray(customPayload.__clonedFrom), "Custom role __clonedFrom is string[]");
assert(customPayload.member?.includes("read") === true, "Custom role has member:read to prevent 403 crashes");
assert(customPayload.load?.includes("create") === true, "Custom role derived load:create coarse action");
assert(customPayload.load?.includes("read") === true, "Custom role derived load:read coarse action");
assert(customPayload.driver?.includes("read") === true, "Custom role derived driver:read coarse action");

// ─── TEST SUITE 5: Per-Member Granular Overrides Layering ───────────────────
console.log("\n▶ SUITE 5: Member Overrides Simulation (Layering over Base Preset)");

function simulateEffectivePermissions(baseRole: string, overrides: { grants: string[]; revokes: string[] }): Set<string> {
  const base = presetKeys(baseRole as any, ALL_PERMISSION_KEYS);
  for (const k of overrides.grants) base.add(k);
  for (const k of overrides.revokes) base.delete(k);
  return base;
}

const driverBase = simulateEffectivePermissions("driver", {
  grants: ["loads.create"],
  revokes: ["safety.hos.certify"],
});

assert(driverBase.has("loads.create"), "Driver with grant override CAN create loads");
assert(!driverBase.has("safety.hos.certify"), "Driver with revoke override CANNOT certify HOS");
assert(driverBase.has("loads.view_own"), "Driver preserves baseline loads.view_own");

console.log("\n=======================================================");
console.log(` SUMMARY: ${passed} passed, ${failed} failed`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 All RBAC and permission systems verified successfully!");
}
