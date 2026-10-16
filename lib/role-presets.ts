/**
 * Muvx TMS — Default role preset matrix
 *
 * For each of the 6 starter roles, the default set of permission keys
 * (out of 130 in lib/permissions-catalog.ts) that are ON. Workspace
 * admins can clone any preset, toggle any key, and save as a custom role.
 *
 * Order in each array is irrelevant — we store as a Set at runtime.
 * Keys not listed are OFF by default for that role.
 */

import type { RoleId } from "./auth-roles"

export type Preset = {
  role: RoleId
  label: string
  oneLiner: string
  description: string
  /**
   * Permission keys ON for this role by default.
   * OFF-by-default keys are simply absent from this set.
   */
  keys: readonly string[]
}

/** Owner — every key ON. Trust anchor of the workspace. */
const OWNER_KEYS = "__ALL__" as const

const OWNER_PRESET: Preset = {
  role: "owner",
  label: "Owner",
  oneLiner: "Full control — trust anchor of the workspace.",
  description:
    "The Owner runs the company. Holds legal and financial responsibility, can delete the workspace, transfer ownership, and change bank info.",
  keys: OWNER_KEYS as unknown as readonly string[],
}

const ADMIN_PRESET: Preset = {
  role: "admin",
  label: "Administrator",
  oneLiner: "Runs day-to-day operations, but not banking or deletion.",
  description:
    "The COO. Manages members, drivers, customers, loads, and safety. Cannot delete the workspace, transfer ownership, or change bank info — those are Owner only by default.",
  keys: [
    // Workspace (all read; edit on profile only — no delete, no transfer)
    "workspace.module",
    "workspace.profile.view",
    "workspace.profile.edit",
    "workspace.audit_log.view",
    // Team
    "users.module",
    "users.invite",
    "users.change_role",
    "users.remove",
    "users.suspend",
    "users.roles.manage",
    // Documents
    "documents.module",
    "documents.view_all",
    "documents.upload",
    "documents.delete",
    "documents.share",
    // Loads (full)
    "loads.module",
    "loads.view_all",
    "loads.view_assigned",
    "loads.create",
    "loads.edit",
    "loads.cancel",
    "loads.delete",
    "loads.assign_driver",
    "loads.assign_truck",
    "loads.assign_trailer",
    "loads.reassign",
    "loads.dispatch",
    "loads.update_status",
    "loads.export",
    // Stops
    "stops.module",
    "stops.edit",
    "stops.schedule",
    "stops.add",
    "stops.delete",
    // Customers (full — admin runs collections)
    "customers.module",
    "customers.view_all",
    "customers.view_contact",
    "customers.view_credit",
    "customers.view_name_on_load",
    "customers.view_tax_id",
    "customers.create",
    "customers.edit",
    "customers.delete",
    "customers.credit_check",
    "customers.export",
    // Drivers (full)
    "drivers.module",
    "drivers.view_all",
    "drivers.view_personal",
    "drivers.view_pay_rate",
    "drivers.view_tax_info",
    "drivers.view_clearinghouse",
    "drivers.view_cdl",
    "drivers.view_medical_cert",
    "drivers.create",
    "drivers.edit",
    "drivers.edit_sensitive",
    "drivers.delete",
    "drivers.invite",
    "drivers.flag_out_of_service",
    "drivers.clear_out_of_service",
    // Fleet
    "fleet.module",
    "fleet.view_all",
    "fleet.create",
    "fleet.edit",
    "fleet.delete",
    "fleet.assign",
    "fleet.maintenance.schedule",
    "fleet.maintenance.complete",
    "fleet.maintenance.view_cost",
    "fleet.fault_codes.view",
    "fleet.fault_codes.clear",
    // Safety (read all, can act on violations)
    "safety.module",
    "safety.hos.view_all",
    "safety.dvir.view_all",
    "safety.dvir.review",
    "safety.accident.report",
    "safety.accident.investigate",
    "safety.clearinghouse.query",
    "safety.dq_file.manage",
    "safety.csa.view",
    "safety.audit_log.view_safety",
    "safety.training.assign",
    "safety.training.review",
    // Accounting (read + approve invoices)
    "accounting.module",
    "accounting.invoices.view_all",
    "accounting.invoices.approve",
    "accounting.invoices.send",
    "accounting.invoices.apply_payment",
    "accounting.ar.view",
    // Settlements (read + approve)
    "settlements.module",
    "settlements.view_all",
    "settlements.approve",
    "settlements.print",
    "settlements.ap.view",
    // Reports (all)
    "reports.module",
    "reports.operational.view",
    "reports.financial.view_revenue",
    "reports.financial.view_margin",
    "reports.safety.view",
    "reports.export",
    "reports.schedule",
    "reports.share",
  ],
}

const DISPATCHER_PRESET: Preset = {
  role: "dispatcher",
  label: "Dispatcher",
  oneLiner: "Runs the dispatch board. Blind to money, pay, and safety.",
  description:
    "The Dispatcher lives in the dispatch board. Their day is: assign loads, track trucks, call brokers, fix problems. They see rates but not margin, and not driver pay.",
  keys: [
    "workspace.module",
    "workspace.profile.view",
    "users.module",
    "documents.module",
    "documents.view_all",
    "documents.upload",
    // Loads (full)
    "loads.module",
    "loads.view_all",
    "loads.view_assigned",
    "loads.create",
    "loads.edit",
    "loads.cancel",
    "loads.assign_driver",
    "loads.assign_truck",
    "loads.assign_trailer",
    "loads.reassign",
    "loads.dispatch",
    "loads.update_status",
    "loads.export",
    // Stops
    "stops.module",
    "stops.edit",
    "stops.schedule",
    "stops.add",
    "stops.delete",
    // Customers (no credit, no tax id — they don't need to know broker credit)
    "customers.module",
    "customers.view_all",
    "customers.view_contact",
    "customers.view_name_on_load",
    "customers.create",
    "customers.edit",
    // Drivers (read name + CDL + medical, NOT pay rate, NOT tax, NOT clearinghouse)
    "drivers.module",
    "drivers.view_all",
    "drivers.view_personal",
    "drivers.view_cdl",
    "drivers.view_medical_cert",
    "drivers.edit",
    "drivers.invite",
    "drivers.flag_out_of_service",
    "drivers.clear_out_of_service",
    // Fleet (read + maintenance schedule)
    "fleet.module",
    "fleet.view_all",
    "fleet.assign",
    "fleet.maintenance.schedule",
    "fleet.fault_codes.view",
    // Safety (HOS read-only — they need to know who's out of hours)
    "safety.hos.view_all",
    // Reports (operational only — no financial, no safety)
    "reports.module",
    "reports.operational.view",
    "reports.export",
  ],
}

const ACCOUNTING_PRESET: Preset = {
  role: "accounting",
  label: "Accounting",
  oneLiner: "Owns the money flow in and out.",
  description:
    "The Accounting role turns what dispatch did into money. Owns the invoice lifecycle, settlements, payments, and AR/AP aging. Cannot edit banking and cannot dispatch.",
  keys: [
    "workspace.module",
    "workspace.profile.view",
    "users.module",
    "documents.module",
    "documents.view_all",
    "documents.upload",
    // Loads (read only — to verify before invoicing)
    "loads.module",
    "loads.view_all",
    "loads.export",
    // Stops (read)
    "stops.module",
    // Customers (full — they do collections and 1099)
    "customers.module",
    "customers.view_all",
    "customers.view_contact",
    "customers.view_credit",
    "customers.view_name_on_load",
    "customers.view_tax_id",
    "customers.create",
    "customers.edit",
    "customers.credit_check",
    "customers.export",
    // Drivers (pay + tax — they need it for settlements and 1099/W-2)
    "drivers.module",
    "drivers.view_all",
    "drivers.view_personal",
    "drivers.view_pay_rate",
    "drivers.view_tax_info",
    "drivers.view_cdl",
    "drivers.edit",
    // Fleet (read — for depreciation)
    "fleet.module",
    "fleet.view_all",
    "fleet.maintenance.view_cost",
    // Accounting (full)
    "accounting.module",
    "accounting.invoices.view_all",
    "accounting.invoices.create",
    "accounting.invoices.edit",
    "accounting.invoices.delete",
    "accounting.invoices.approve",
    "accounting.invoices.send",
    "accounting.invoices.submit_factoring",
    "accounting.invoices.apply_payment",
    "accounting.ar.view",
    // Settlements (full)
    "settlements.module",
    "settlements.view_all",
    "settlements.create",
    "settlements.edit",
    "settlements.approve",
    "settlements.pay",
    "settlements.print",
    "settlements.recoup",
    "settlements.ap.view",
    "settlements.ap.pay",
    // Reports (financial)
    "reports.module",
    "reports.operational.view",
    "reports.financial.view_revenue",
    "reports.financial.view_margin",
    "reports.export",
    "reports.schedule",
  ],
}

const SAFETY_PRESET: Preset = {
  role: "safety",
  label: "Safety & Compliance",
  oneLiner: "Owns the regulatory perimeter.",
  description:
    "The Safety & Compliance Officer owns HOS, DVIR, drug clearinghouse, accident reports, and CSA scores. Read-only on dispatch, blind to money.",
  keys: [
    "workspace.module",
    "workspace.profile.view",
    "documents.module",
    "documents.view_all",
    "documents.upload",
    // Loads (read)
    "loads.module",
    "loads.view_all",
    // Customers (read — for safety reports that name the broker)
    "customers.module",
    "customers.view_all",
    "customers.view_contact",
    "customers.view_name_on_load",
    // Drivers (full — they manage the DQ file)
    "drivers.module",
    "drivers.view_all",
    "drivers.view_personal",
    "drivers.view_pay_rate",
    "drivers.view_tax_info",
    "drivers.view_clearinghouse",
    "drivers.view_cdl",
    "drivers.view_medical_cert",
    "drivers.create",
    "drivers.edit",
    "drivers.edit_sensitive",
    "drivers.flag_out_of_service",
    "drivers.clear_out_of_service",
    // Fleet (read)
    "fleet.module",
    "fleet.view_all",
    "fleet.fault_codes.view",
    // Safety (full)
    "safety.module",
    "safety.hos.view_all",
    "safety.hos.approve",
    "safety.hos.flag_violation",
    "safety.dvir.view_all",
    "safety.dvir.review",
    "safety.accident.report",
    "safety.accident.investigate",
    "safety.clearinghouse.query",
    "safety.dq_file.manage",
    "safety.csa.view",
    "safety.audit_log.view_safety",
    "safety.training.assign",
    "safety.training.review",
    // Reports (safety only)
    "reports.module",
    "reports.safety.view",
    "reports.export",
  ],
}

const DRIVER_PRESET: Preset = {
  role: "driver",
  label: "Driver",
  oneLiner: "Self-only. Mobile-first.",
  description:
    "The Driver sees only the work they personally do. Their own profile, their own loads, their own settlements, their own documents. Cannot see other drivers, the dispatch board, customer names, or rates.",
  keys: [
    "workspace.module",
    "workspace.profile.view",
    "documents.module",
    "documents.view_own",
    "documents.upload",
    // Loads (own only)
    "loads.view_own",
    "loads.update_status",
    // Customers (own only — facility address, not customer name)
    "customers.view_name_on_load",
    // Drivers (own only)
    "drivers.view_own",
    "drivers.view_personal",
    "drivers.view_cdl",
    "drivers.view_medical_cert",
    // Safety (own only)
    "safety.hos.view_own",
    "safety.hos.certify",
    "safety.dvir.view_own",
    "safety.dq_file.view_own",
    // Settlements (own only)
    "settlements.view_own",
  ],
}

const OPS_MANAGER_PRESET: Preset = {
  role: "operations_manager",
  label: "Operations Manager",
  oneLiner: "Operational access across loads, trips, fleet, and drivers.",
  description:
    "Full operational access to loads, trips, fleet, and drivers. No money, no delete.",
  keys: [
    ...DISPATCHER_PRESET.keys,
    // Adds: full delete on loads, fault code clear
    "loads.delete",
    "fleet.fault_codes.clear",
    "fleet.maintenance.complete",
    // Adds: safety module access (read)
    "safety.module",
    "safety.dvir.view_all",
  ] as readonly string[],
}

const MEMBER_PRESET: Preset = {
  role: "member",
  label: "Member",
  oneLiner: "Read-only access to TMS records.",
  description:
    "Default role for new invitations. Read-only access to loads, trips, drivers, trucks, and invoices.",
  keys: [
    "workspace.module",
    "workspace.profile.view",
    "loads.module",
    "loads.view_all",
    "customers.module",
    "customers.view_all",
    "drivers.module",
    "drivers.view_all",
    "fleet.module",
    "fleet.view_all",
    "accounting.module",
    "accounting.invoices.view_all",
    "reports.module",
  ],
}

export const PRESETS: Record<RoleId, Preset> = {
  owner: OWNER_PRESET,
  admin: ADMIN_PRESET,
  operations_manager: OPS_MANAGER_PRESET,
  dispatcher: DISPATCHER_PRESET,
  accounting: ACCOUNTING_PRESET,
  driver: DRIVER_PRESET,
  safety: SAFETY_PRESET,
  member: MEMBER_PRESET,
}

export const PRESET_LIST: Preset[] = [
  OWNER_PRESET,
  ADMIN_PRESET,
  OPS_MANAGER_PRESET,
  DISPATCHER_PRESET,
  ACCOUNTING_PRESET,
  SAFETY_PRESET,
  DRIVER_PRESET,
  MEMBER_PRESET,
]

/** Expand the OWNER wildcard into the full key set. */
export function presetKeys(role: RoleId, allKeys: string[]): Set<string> {
  const preset = PRESETS[role]
  if (!preset) return new Set()
  if (preset.keys === (OWNER_KEYS as unknown as readonly string[]))
    return new Set(allKeys)
  return new Set(preset.keys as string[])
}

/** Count of ON keys for a role, given the full key list. */
export function presetOnCount(role: RoleId, allKeys: string[]): number {
  return presetKeys(role, allKeys).size
}
