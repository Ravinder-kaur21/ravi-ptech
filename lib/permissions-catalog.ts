/**
 * Muvx TMS — Master Permission Catalog (130 keys)
 *
 * Source of truth for every permission gate in the product. Every UI
 * surface (sidebar, dashboard, header, command palette, table actions)
 * AND every server action reads from this catalog.
 *
 * Dimensions:
 *   - (a) Module access     — can the role open this module at all
 *   - (b) Record visibility — which rows of a resource this role sees
 *   - (c) Sensitive field   — which columns within a record are visible
 *   (d) Action              — write or workflow step
 *
 * Format per entry:
 *   { key, label, description, dimension, module }
 *
 * The catalog is the single source for:
 *   - the role preset matrix in lib/auth-roles.ts (DEFAULT_PRESETS)
 *   - the Settings → Roles permission matrix UI
 *   - the per-member permission override UI
 *   - server-side requirePermission() checks
 */

export type PermissionDimension = "a" | "b" | "c" | "d"

export type PermissionEntry = {
  key: string
  label: string
  description: string
  dimension: PermissionDimension
  module: string
}

export type ModuleGroup = {
  module: string
  label: string
  description: string
  keys: PermissionEntry[]
}

const make = (
  module: string,
  dimension: PermissionDimension,
  key: string,
  label: string,
  description: string
): PermissionEntry => ({ key, label, description, dimension, module })

// ─── 4.1 Loads & Dispatch (15 keys) ─────────────────────────────────
const loads: PermissionEntry[] = [
  make("loads", "a", "loads.module", "Loads & Dispatch module", "Whether the role can open the Loads & Dispatch module."),
  make("loads", "b", "loads.view_all", "View all loads", "See every load in the workspace regardless of assignment."),
  make("loads", "b", "loads.view_assigned", "View assigned loads", "See only loads where the user is the assigned dispatcher."),
  make("loads", "b", "loads.view_own", "View own loads", "See only loads where the user is the assigned driver."),
  make("loads", "d", "loads.create", "Create load", "Add a fresh load."),
  make("loads", "d", "loads.edit", "Edit load", "Modify load fields (commodity, weight, dates, customer ref)."),
  make("loads", "d", "loads.cancel", "Cancel load", "Mark a load as cancelled (soft delete)."),
  make("loads", "d", "loads.delete", "Hard-delete load", "Permanent delete."),
  make("loads", "d", "loads.assign_driver", "Assign driver", "Pair a driver with a load."),
  make("loads", "d", "loads.assign_truck", "Assign truck", "Pair a tractor with a load."),
  make("loads", "d", "loads.assign_trailer", "Assign trailer", "Pair a trailer with a load."),
  make("loads", "d", "loads.reassign", "Reassign", "Change an existing driver or truck assignment mid-flight."),
  make("loads", "d", "loads.dispatch", "Dispatch", "Move a load from booked to dispatched."),
  make("loads", "d", "loads.update_status", "Update status", "Post a status event (booked, dispatched, in-transit, delivered)."),
  make("loads", "d", "loads.export", "Export loads", "Bulk export load list to CSV or PDF."),
]

// ─── 4.2 Stops & Appointments (5 keys) ──────────────────────────────
const stops: PermissionEntry[] = [
  make("stops", "a", "stops.module", "Stops & Appointments module", "Whether the role can open the Stops module."),
  make("stops", "d", "stops.edit", "Edit stop", "Modify address, appointment time, facility contact."),
  make("stops", "d", "stops.schedule", "Schedule appointment", "Set or reschedule pickup and delivery times."),
  make("stops", "d", "stops.add", "Add stop", "Add a multi-stop to a load."),
  make("stops", "d", "stops.delete", "Remove stop", "Delete a stop."),
]

// ─── 4.3 Customers & Brokers (12 keys) ─────────────────────────────
const customers: PermissionEntry[] = [
  make("customers", "a", "customers.module", "Customers & Brokers module", "Whether the role can open the Customers & Brokers module."),
  make("customers", "b", "customers.view_all", "View all customers", "See the full customer and broker list."),
  make("customers", "b", "customers.view_assigned", "View assigned customers", "See only customers the user does business with."),
  make("customers", "c", "customers.view_contact", "View customer contact", "See phone, email, address of broker or shipper ops contact."),
  make("customers", "c", "customers.view_credit", "View credit terms", "See credit limit, payment terms, factoring status."),
  make("customers", "c", "customers.view_name_on_load", "View customer name on a load", "See who the load is for on a load detail view."),
  make("customers", "c", "customers.view_tax_id", "View customer tax ID", "See customer tax identification numbers."),
  make("customers", "d", "customers.create", "Add customer or broker", "Create a new shipper or broker."),
  make("customers", "d", "customers.edit", "Edit customer", "Modify name, address, contact, payment terms."),
  make("customers", "d", "customers.delete", "Delete customer", "Remove a customer from the system (soft delete)."),
  make("customers", "d", "customers.credit_check", "Run credit check", "Trigger a third-party credit check on a broker."),
  make("customers", "d", "customers.export", "Export customer list", "Bulk export customers and brokers."),
]

// ─── 4.4 Drivers (16 keys) ─────────────────────────────────────────
const drivers: PermissionEntry[] = [
  make("drivers", "a", "drivers.module", "Drivers module", "Whether the role can open the Drivers module."),
  make("drivers", "b", "drivers.view_all", "View all drivers", "See the full driver roster."),
  make("drivers", "b", "drivers.view_own", "View own driver profile", "See the user's own driver master record."),
  make("drivers", "c", "drivers.view_personal", "View driver personal info", "Name, address, phone, email, emergency contact."),
  make("drivers", "c", "drivers.view_pay_rate", "View driver pay rate", "Per mile, percentage, or flat rate."),
  make("drivers", "c", "drivers.view_tax_info", "View driver tax info", "Tax ID, SSN, withholding."),
  make("drivers", "c", "drivers.view_clearinghouse", "View drug and alcohol clearinghouse", "Pre-employment query result, RTD status, return to duty date."),
  make("drivers", "c", "drivers.view_cdl", "View CDL", "CDL number, issuing state, endorsements, expiry."),
  make("drivers", "c", "drivers.view_medical_cert", "View medical certificate", "Medical examiner, expiry, restrictions."),
  make("drivers", "d", "drivers.create", "Add driver", "Create a new driver master record."),
  make("drivers", "d", "drivers.edit", "Edit driver", "Modify driver fields (non-sensitive)."),
  make("drivers", "d", "drivers.edit_sensitive", "Edit driver sensitive fields", "Pay rate, tax info, DQ file."),
  make("drivers", "d", "drivers.delete", "Delete driver", "Soft delete a driver record."),
  make("drivers", "d", "drivers.invite", "Invite driver", "Send an invitation to a new driver to set up their portal."),
  make("drivers", "d", "drivers.flag_out_of_service", "Flag out of service", "Mark a driver unavailable for assignment."),
  make("drivers", "d", "drivers.clear_out_of_service", "Clear out of service", "Restore a driver to assignable status."),
]

// ─── 4.5 Fleet & Equipment (11 keys) ───────────────────────────────
const fleet: PermissionEntry[] = [
  make("fleet", "a", "fleet.module", "Fleet & Equipment module", "Whether the role can open the Fleet & Equipment module."),
  make("fleet", "b", "fleet.view_all", "View all equipment", "See every tractor, trailer, and asset."),
  make("fleet", "d", "fleet.create", "Add equipment", "Add a new tractor, trailer, or asset."),
  make("fleet", "d", "fleet.edit", "Edit equipment", "Modify VIN, plate, registration, insurance."),
  make("fleet", "d", "fleet.delete", "Delete equipment", "Remove an asset from the fleet."),
  make("fleet", "d", "fleet.assign", "Assign equipment", "Pair equipment with a driver or load."),
  make("fleet", "d", "fleet.maintenance.schedule", "Schedule maintenance", "Set a service date for a unit."),
  make("fleet", "d", "fleet.maintenance.complete", "Complete maintenance", "Mark a service as done."),
  make("fleet", "d", "fleet.maintenance.view_cost", "View maintenance cost", "See parts and labor costs on maintenance records."),
  make("fleet", "d", "fleet.fault_codes.view", "View fault codes", "Read engine and aftertreatment fault codes from the ELD."),
  make("fleet", "d", "fleet.fault_codes.clear", "Clear fault codes", "Acknowledge and clear a fault after repair."),
]

// ─── 4.6 Documents (6 keys) ────────────────────────────────────────
const documents: PermissionEntry[] = [
  make("documents", "a", "documents.module", "Documents module", "Whether the role can open the Documents module."),
  make("documents", "b", "documents.view_all", "View all documents", "See every uploaded document in the workspace."),
  make("documents", "b", "documents.view_own", "View own documents", "See documents the user uploaded or is the subject of."),
  make("documents", "d", "documents.upload", "Upload document", "Upload a BOL, POD, rate con, insurance card, or other record."),
  make("documents", "d", "documents.delete", "Delete document", "Remove a document from the workspace."),
  make("documents", "d", "documents.share", "Share document externally", "Generate an expiring external link for a broker or customer."),
]

// ─── 4.7 Safety & Compliance (18 keys) ─────────────────────────────
const safety: PermissionEntry[] = [
  make("safety", "a", "safety.module", "Safety & Compliance module", "Whether the role can open the Safety & Compliance module."),
  make("safety", "b", "safety.hos.view_all", "View all HOS logs", "Read every driver's hours of service records."),
  make("safety", "b", "safety.hos.view_own", "View own HOS", "Read the user's own hours of service record."),
  make("safety", "d", "safety.hos.certify", "Certify HOS", "Self certify a daily log per 49 CFR 395.30."),
  make("safety", "d", "safety.hos.approve", "Approve HOS edits", "Approve a driver requested edit to a log."),
  make("safety", "d", "safety.hos.flag_violation", "Flag HOS violation", "Mark a log as containing a violation."),
  make("safety", "b", "safety.dvir.view_all", "View all DVIRs", "Read every driver's vehicle inspection reports."),
  make("safety", "b", "safety.dvir.view_own", "View own DVIRs", "Read the user's own DVIR history."),
  make("safety", "d", "safety.dvir.review", "Review DVIR", "Mark a DVIR as reviewed and resolve defects."),
  make("safety", "d", "safety.accident.report", "Report accident", "File a new accident or incident report."),
  make("safety", "d", "safety.accident.investigate", "Investigate accident", "Update the root cause, corrective action, and status of a report."),
  make("safety", "d", "safety.clearinghouse.query", "Query clearinghouse", "Run a Drug and Alcohol Clearinghouse query per 49 CFR 382."),
  make("safety", "d", "safety.dq_file.manage", "Manage DQ file", "Add or update a driver qualification file per 49 CFR 391.51."),
  make("safety", "d", "safety.dq_file.view_own", "View own DQ file", "See the user's own driver qualification file."),
  make("safety", "b", "safety.csa.view", "View CSA scores", "Read the workspace's CSA percentile scores."),
  make("safety", "d", "safety.audit_log.view_safety", "View safety audit log", "See audit events filtered to safety and compliance."),
  make("safety", "d", "safety.training.assign", "Assign training", "Assign a connected training course to a driver."),
  make("safety", "d", "safety.training.review", "Review training completion", "Mark a course as completed and reviewed."),
]

// ─── 4.8 Accounting & Invoicing (10 keys) ──────────────────────────
const accounting: PermissionEntry[] = [
  make("accounting", "a", "accounting.module", "Accounting module", "Whether the role can open the Accounting & Invoicing module."),
  make("accounting", "b", "accounting.invoices.view_all", "View all invoices", "See every invoice in the workspace."),
  make("accounting", "d", "accounting.invoices.create", "Create invoice", "Generate an invoice from a load."),
  make("accounting", "d", "accounting.invoices.edit", "Edit invoice", "Modify invoice line items or amounts."),
  make("accounting", "d", "accounting.invoices.delete", "Void invoice", "Mark an invoice as voided."),
  make("accounting", "d", "accounting.invoices.approve", "Approve invoice", "Final approval before sending."),
  make("accounting", "d", "accounting.invoices.send", "Send invoice", "Email the invoice to the customer or broker."),
  make("accounting", "d", "accounting.invoices.submit_factoring", "Submit to factoring", "Send the invoice to the factor for advance."),
  make("accounting", "d", "accounting.invoices.apply_payment", "Apply payment", "Mark an invoice as paid and reconcile."),
  make("accounting", "b", "accounting.ar.view", "View AR aging", "See accounts receivable aging reports."),
]

// ─── 4.9 Settlements (11 keys) ────────────────────────────────────
const settlements: PermissionEntry[] = [
  make("settlements", "a", "settlements.module", "Settlements module", "Whether the role can open the Settlements module."),
  make("settlements", "b", "settlements.view_all", "View all settlements", "See every driver and carrier settlement."),
  make("settlements", "b", "settlements.view_own", "View own settlements", "See the user's own driver settlement."),
  make("settlements", "d", "settlements.create", "Create settlement", "Generate a new driver or carrier settlement."),
  make("settlements", "d", "settlements.edit", "Edit settlement", "Modify settlement deductions and line items."),
  make("settlements", "d", "settlements.approve", "Approve settlement", "Approve a settlement for payment."),
  make("settlements", "d", "settlements.pay", "Mark settlement paid", "Mark a settlement as paid and trigger ACH."),
  make("settlements", "d", "settlements.print", "Print settlement", "Generate a printable PDF."),
  make("settlements", "d", "settlements.recoup", "Recoup advance", "Deduct an outstanding advance from a settlement."),
  make("settlements", "b", "settlements.ap.view", "View AP aging", "See accounts payable aging (fuel advances, lumper reimbursements)."),
  make("settlements", "d", "settlements.ap.pay", "Pay AP bill", "Mark an AP bill as paid."),
]

// ─── 4.10 Reports & Analytics (8 keys) ────────────────────────────
const reports: PermissionEntry[] = [
  make("reports", "a", "reports.module", "Reports module", "Whether the role can open the Reports & Analytics module."),
  make("reports", "b", "reports.operational.view", "View operational reports", "Read on time, utilization, deadhead reports."),
  make("reports", "b", "reports.financial.view_revenue", "View revenue report", "See revenue and load count reports."),
  make("reports", "b", "reports.financial.view_margin", "View margin report", "See margin and profit per load."),
  make("reports", "b", "reports.safety.view", "View safety reports", "Read HOS violation and accident rate reports."),
  make("reports", "d", "reports.export", "Export report", "Download a report as CSV or PDF."),
  make("reports", "d", "reports.schedule", "Schedule report", "Set a recurring email delivery for a report."),
  make("reports", "d", "reports.share", "Share report externally", "Generate an expiring external link for a report."),
]

// ─── 4.11 Users, Roles & Invitations (6 keys) ──────────────────────
const users: PermissionEntry[] = [
  make("users", "a", "users.module", "Team module", "Whether the role can open the Team and Members module."),
  make("users", "d", "users.invite", "Invite member", "Send an invitation to a new workspace member."),
  make("users", "d", "users.change_role", "Change member role", "Change another member's role within the workspace."),
  make("users", "d", "users.remove", "Remove member", "Remove a member from the workspace."),
  make("users", "d", "users.suspend", "Suspend member", "Temporarily disable a member without removing them."),
  make("users", "d", "users.roles.manage", "Manage roles", "Create, edit, and delete custom roles and permission presets."),
]

// ─── 4.12 Workspace & Administration (6 keys) ──────────────────────
const workspace: PermissionEntry[] = [
  make("workspace", "a", "workspace.module", "Workspace settings", "Whether the role can open the Workspace settings area."),
  make("workspace", "b", "workspace.profile.view", "View workspace profile", "See the workspace name, regulatory IDs, and address."),
  make("workspace", "b", "workspace.audit_log.view", "View audit log", "See who did what across the workspace."),
  make("workspace", "d", "workspace.profile.edit", "Edit workspace profile", "Change the workspace name, regulatory IDs, and address."),
  make("workspace", "d", "workspace.transfer_ownership", "Transfer ownership", "Hand the workspace over to another member."),
  make("workspace", "d", "workspace.delete", "Delete workspace", "Permanently delete the workspace."),
]

// ─── Module groups for the Settings UI ─────────────────────────────
export const MODULE_GROUPS: ModuleGroup[] = [
  {
    module: "loads",
    label: "Loads & Dispatch",
    description: "Order intake, load creation, dispatch board, status events.",
    keys: loads,
  },
  {
    module: "stops",
    label: "Stops & Appointments",
    description: "Pickup and delivery stops, facility contacts, appointment times.",
    keys: stops,
  },
  {
    module: "customers",
    label: "Customers & Brokers",
    description: "Customer and broker master records, credit, contacts.",
    keys: customers,
  },
  {
    module: "drivers",
    label: "Drivers",
    description: "Driver master record, pay, DQ file, invitations.",
    keys: drivers,
  },
  {
    module: "fleet",
    label: "Fleet & Equipment",
    description: "Tractors, trailers, VIN, maintenance, fault codes.",
    keys: fleet,
  },
  {
    module: "documents",
    label: "Documents",
    description: "BOL, POD, rate con, insurance cards, accident photos.",
    keys: documents,
  },
  {
    module: "safety",
    label: "Safety & Compliance",
    description: "HOS, DVIR, accidents, drug clearinghouse, CSA scores.",
    keys: safety,
  },
  {
    module: "accounting",
    label: "Accounting & Invoicing",
    description: "Customer invoices, factoring, AR aging.",
    keys: accounting,
  },
  {
    module: "settlements",
    label: "Settlements",
    description: "Driver and carrier settlements, payroll deductions, AP.",
    keys: settlements,
  },
  {
    module: "reports",
    label: "Reports & Analytics",
    description: "Operational, financial, and safety reports.",
    keys: reports,
  },
  {
    module: "users",
    label: "Team & Roles",
    description: "Members, invitations, role assignment, custom roles.",
    keys: users,
  },
  {
    module: "workspace",
    label: "Workspace",
    description: "Workspace profile, audit log, ownership transfer.",
    keys: workspace,
  },
]

/** Flat list of every permission key in the catalog. */
export const ALL_PERMISSION_KEYS: string[] = MODULE_GROUPS.flatMap((g) =>
  g.keys.map((k) => k.key)
)

/** Lookup by key, for fast O(1) checks in UI. */
export const PERMISSION_BY_KEY: Record<string, PermissionEntry> =
  Object.fromEntries(ALL_PERMISSION_KEYS.map((k) => [k, findByKey(k)!]))

function findByKey(key: string): PermissionEntry | undefined {
  for (const g of MODULE_GROUPS) {
    const entry = g.keys.find((k) => k.key === key)
    if (entry) return entry
  }
  return undefined
}

/** Counts for the matrix UI. */
export const CATALOG_TOTALS = {
  total: ALL_PERMISSION_KEYS.length,
  byModule: Object.fromEntries(
    MODULE_GROUPS.map((g) => [g.module, g.keys.length])
  ),
  byDimension: (() => {
    const out = { a: 0, b: 0, c: 0, d: 0 } as Record<PermissionDimension, number>
    for (const g of MODULE_GROUPS) {
      for (const k of g.keys) out[k.dimension]++
    }
    return out
  })(),
}
