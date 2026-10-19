/**
 * Quick summary — turns a 130-key permission set into 4 short
 * human-readable lines used by the manage-permissions screen and
 * the role master screen.
 *
 * The lines are derived from the actual permission set, never from
 * role names. The same generator runs for a member's effective
 * permissions and for a role's preset.
 */

import { MODULE_GROUPS } from "./permissions-catalog"

const VIEW_KEYS = [
  "loads.view_all",
  "loads.view_assigned",
  "loads.view_own",
  "drivers.view_all",
  "drivers.view_own",
  "customers.view_all",
  "customers.view_assigned",
  "fleet.view_all",
  "accounting.invoices.view_all",
  "settlements.view_all",
  "settlements.view_own",
  "reports.operational.view",
  "reports.financial.view_revenue",
  "reports.financial.view_margin",
  "reports.safety.view",
  "safety.hos.view_all",
  "safety.hos.view_own",
  "safety.dvir.view_all",
  "safety.dvir.view_own",
  "safety.csa.view",
  "documents.view_all",
  "documents.view_own",
  "workspace.profile.view",
  "workspace.audit_log.view",
  "customers.view_credit",
  "customers.view_tax_id",
  "customers.view_contact",
  "customers.view_name_on_load",
  "drivers.view_pay_rate",
  "drivers.view_tax_info",
  "drivers.view_clearinghouse",
]

const CREATE_EDIT_KEYS = [
  "loads.create",
  "loads.edit",
  "loads.dispatch",
  "loads.cancel",
  "loads.delete",
  "drivers.create",
  "drivers.edit",
  "drivers.edit_sensitive",
  "drivers.flag_out_of_service",
  "customers.create",
  "customers.edit",
  "fleet.create",
  "fleet.edit",
  "accounting.invoices.create",
  "accounting.invoices.approve",
  "accounting.invoices.send",
  "accounting.invoices.submit_factoring",
  "accounting.invoices.apply_payment",
  "settlements.create",
  "settlements.approve",
  "settlements.pay",
  "documents.upload",
  "documents.delete",
  "safety.accident.report",
  "safety.clearinghouse.query",
  "safety.dq_file.manage",
  "workspace.profile.edit",
  "workspace.transfer_ownership",
  "workspace.delete",
  "users.invite",
  "users.change_role",
  "users.remove",
  "users.roles.manage",
]

const MONEY_BLIND_KEYS = [
  "rates.view_margin",
  "drivers.view_pay_rate",
  "drivers.view_tax_info",
  "banking.view",
  "banking.edit",
  "accounting.module",
  "accounting.invoices.view_all",
  "accounting.invoices.approve",
  "settlements.view_all",
  "settlements.approve",
  "settlements.pay",
]

const OPS_BLIND_KEYS = [
  "loads.view_all",
  "loads.create",
  "loads.assign_driver",
  "loads.dispatch",
  "drivers.view_all",
  "fleet.view_all",
  "fleet.assign",
]

const SAFETY_BLIND_KEYS = [
  "accounting.module",
  "accounting.invoices.view_all",
  "settlements.module",
  "settlements.view_all",
  "reports.financial.view_margin",
  "reports.financial.view_revenue",
  "banking.view",
  "banking.edit",
]

const RATE_BLIND_KEYS = [
  "customers.view_credit",
  "customers.view_tax_id",
]

export type PermissionSummary = {
  canView: string[]
  canAct: string[]
  cannotSee: string[]
}

/** Build the 4-line summary for a permission set. */
export function buildSummary(perms: Set<string>): PermissionSummary {
  const canView: string[] = []
  const canAct: string[] = []
  const cannotSee: string[] = []

  for (const k of VIEW_KEYS) {
    if (perms.has(k)) canView.push(humanView(k))
  }
  for (const k of CREATE_EDIT_KEYS) {
    if (perms.has(k)) canAct.push(humanAction(k))
  }
  // Cannot see = the things that are notably OFF for this role
  if (MONEY_BLIND_KEYS.every((k) => !perms.has(k))) {
    cannotSee.push("Money: invoices, margins, banking, settlements")
  } else if (MONEY_BLIND_KEYS.filter((k) => perms.has(k)).length <= 1) {
    cannotSee.push("Settlements, banking, and detailed financial reports")
  }
  if (OPS_BLIND_KEYS.every((k) => !perms.has(k))) {
    cannotSee.push("Dispatch board, load assignment, fleet ops")
  }
  if (SAFETY_BLIND_KEYS.every((k) => !perms.has(k))) {
    cannotSee.push("Invoices, settlements, financial reports, banking")
  }
  if (RATE_BLIND_KEYS.every((k) => !perms.has(k))) {
    cannotSee.push("Customer credit terms and tax IDs")
  }
  if (perms.has("loads.view_own") && !perms.has("loads.view_all")) {
    cannotSee.push("Other drivers' loads, full dispatch board, customer names")
  }
  if (perms.has("drivers.view_own") && !perms.has("drivers.view_all")) {
    cannotSee.push("Other drivers' profiles and pay rates")
  }

  return { canView: dedupe(canView), canAct: dedupe(canAct), cannotSee: dedupe(cannotSee) }
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}

function humanView(key: string): string {
  if (key === "loads.view_all") return "All loads in the workspace"
  if (key === "loads.view_assigned") return "Loads assigned to me"
  if (key === "loads.view_own") return "My own loads"
  if (key === "drivers.view_all") return "All driver profiles"
  if (key === "drivers.view_own") return "My own driver profile"
  if (key === "customers.view_all") return "All customers and brokers"
  if (key === "customers.view_assigned") return "My assigned customers"
  if (key === "fleet.view_all") return "All equipment"
  if (key === "accounting.invoices.view_all") return "All invoices"
  if (key === "settlements.view_all") return "All settlements"
  if (key === "settlements.view_own") return "My own settlements"
  if (key === "reports.operational.view") return "Operational reports"
  if (key === "reports.financial.view_revenue") return "Revenue reports"
  if (key === "reports.financial.view_margin") return "Margin reports"
  if (key === "reports.safety.view") return "Safety reports"
  if (key === "safety.hos.view_all") return "All HOS logs"
  if (key === "safety.hos.view_own") return "My own HOS log"
  if (key === "safety.dvir.view_all") return "All DVIRs"
  if (key === "safety.dvir.view_own") return "My own DVIRs"
  if (key === "safety.csa.view") return "CSA scores"
  if (key === "documents.view_all") return "All documents"
  if (key === "documents.view_own") return "My own documents"
  if (key === "workspace.profile.view") return "Workspace profile"
  if (key === "workspace.audit_log.view") return "Audit log"
  if (key === "customers.view_credit") return "Customer credit terms"
  if (key === "customers.view_tax_id") return "Customer tax IDs"
  if (key === "customers.view_contact") return "Customer contacts"
  if (key === "customers.view_name_on_load") return "Customer name on loads"
  if (key === "drivers.view_pay_rate") return "Driver pay rates"
  if (key === "drivers.view_tax_info") return "Driver tax info"
  if (key === "drivers.view_clearinghouse") return "Drug clearinghouse status"
  return key
}

function humanAction(key: string): string {
  if (key === "loads.create") return "Create loads"
  if (key === "loads.edit") return "Edit loads"
  if (key === "loads.dispatch") return "Dispatch loads"
  if (key === "loads.cancel") return "Cancel loads"
  if (key === "loads.delete") return "Permanently delete loads"
  if (key === "drivers.create") return "Add drivers"
  if (key === "drivers.edit") return "Edit driver records"
  if (key === "drivers.edit_sensitive") return "Edit driver pay, tax, and DQ file"
  if (key === "drivers.flag_out_of_service") return "Flag drivers out of service"
  if (key === "customers.create") return "Add customers and brokers"
  if (key === "customers.edit") return "Edit customers"
  if (key === "fleet.create") return "Add equipment"
  if (key === "fleet.edit") return "Edit equipment"
  if (key === "accounting.invoices.create") return "Create invoices"
  if (key === "accounting.invoices.approve") return "Approve invoices"
  if (key === "accounting.invoices.send") return "Send invoices"
  if (key === "accounting.invoices.submit_factoring") return "Submit invoices to factoring"
  if (key === "accounting.invoices.apply_payment") return "Apply payments to invoices"
  if (key === "settlements.create") return "Create settlements"
  if (key === "settlements.approve") return "Approve settlements"
  if (key === "settlements.pay") return "Pay settlements"
  if (key === "documents.upload") return "Upload documents"
  if (key === "documents.delete") return "Delete documents"
  if (key === "safety.accident.report") return "Report accidents"
  if (key === "safety.clearinghouse.query") return "Query drug clearinghouse"
  if (key === "safety.dq_file.manage") return "Manage driver qualification files"
  if (key === "workspace.profile.edit") return "Edit workspace profile"
  if (key === "workspace.transfer_ownership") return "Transfer workspace ownership"
  if (key === "workspace.delete") return "Delete the workspace"
  if (key === "users.invite") return "Invite new members"
  if (key === "users.change_role") return "Change member roles"
  if (key === "users.remove") return "Remove members"
  if (key === "users.roles.manage") return "Manage roles and permissions"
  return key
}
