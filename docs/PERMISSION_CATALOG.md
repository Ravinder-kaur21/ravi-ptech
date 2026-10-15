# Muvx TMS — Master Permission Catalog & Default Role Presets

*This document replaces `docs/ROLES_PLAN.md`. That document was the wrong
approach: it tried to bake roles into static TypeScript. This document
treats roles as **dynamic, database-stored presets that an Owner/Admin
can toggle at runtime**.*

---

## 1. The architectural correction (what we are actually building)

### What was wrong with the previous plan
Section 1 of `ROLES_PLAN.md` declared "6 Roles — No More, No Less" and
hardcoded their permission sets in `lib/auth-roles.ts`. That made it
impossible for an Admin to change what a Dispatcher can see without
shipping a new code release.

### The actual model (what we are building now)

**Roles are system presets stored as default data, not as code.**

- `lib/auth-roles.ts` defines the **static `statement` (resources × actions)**
  — the full vocabulary of what *can* be controlled. This is the
  "schema" of the permission system. It is fixed at code time.
- `lib/auth-roles.ts` also defines a set of **`rolePresets`** — the
  default permission set for each role ID. These are the "factory
  defaults" every new workspace starts with.
- When a workspace is created, the system **seeds `organization_role`
  rows** in the database with the presets. From this moment on, the
  DB row is the source of truth for that role in that workspace.
- An Owner/Admin in `/settings/roles` can toggle any action for any
  role. Each toggle **updates the `organization_role` row's `permission`
  JSON**, which the server reads at request time.
- Custom roles ("Junior Dispatcher", "Night Dispatcher", "Fleet
  Mechanic") are also rows in `organization_role`. Owner/Admin can
  create them, name them, and assign permissions freely.

**No `if (role === "dispatcher")` in the application code.** Every
permission gate is `requirePermission({ resource, action })` or
`hasPermission(...)`. The role's permission set is the only thing that
changes; the application code is role-agnostic.

### How this maps to Better Auth

Better Auth's `dynamicAccessControl` already stores per-org role rows
in the `organization_role` table. Its `hasPermission` implementation
(we read it in `node_modules/better-auth/dist/plugins/organization/has-permission.mjs`)
**merges** the static `roles` config with the DB rows via set union:

```js
const merged = { ...acRoles[role]?.statements };
for (const [key, actions] of Object.entries(result.data)) {
  merged[key] = [...new Set([...merged[key] ?? [], ...actions])];
}
acRoles[role] = input.options.ac.newRole(merged);
```

That's **additive** — the DB row can only ADD permissions, not remove
them. But the requirement is that an Admin can **toggle OFF** a default
permission. So we have two options:

**Option A — Replace semantics (chosen):** If a row exists in
`organization_role` for `(organization_id, role)`, that row's `permission`
JSON **replaces** the static preset entirely. The DB row is the
complete permission set for that role in that workspace. The static
preset is the seed value used at workspace creation; once the row
exists, the row wins.

**Option B — Allow/Deny lists:** Add an `__deny` key per role for
explicit denies. BA's `hasPermission` doesn't support this; we'd
replace the gate with a custom function. More flexible but harder to
reason about.

**Why A:** It's the simplest mental model — "the DB row is the truth if
it exists." The static preset is just a seed for first-time setup. It
matches what the user described: "Default permissions out-of-the-box…
an Admin can turn ON or turn OFF any specific permission for any role."

**Implementation:** We'll ship a server-side `getEffectivePermissions(orgId, role)` helper
that, when a `organization_role` row exists, returns the row's permission
JSON directly; otherwise returns the static preset. All server
permission gates use this helper, not BA's bundled `hasPermission` (because
the bundled one merges and we need replace semantics).

For the client side, we'll ship a custom endpoint
`/api/settings/my-permissions` that returns the current user's effective
permissions across the active workspace. The UI calls this on mount and
uses the result to drive every gate (`canSeeRate`, `canEditLoad`,
`canSeeDriverPay`, etc.). The result is cached in TanStack Query.

### How presets get seeded

When a workspace is first created (Better Auth's `organization.create`
or our `app/actions/workspace.ts`), we run a one-time `seedRolePresets(orgId)`
function that copies the static `rolePresets` into `organization_role`
rows, one per role. After that, the workspace is fully dynamic — the
preset only exists in code for *new* workspaces.

### What stays in code vs. what goes to the database

| What | Where | Why |
|------|-------|-----|
| Resources (e.g., `load`, `driver`, `invoice`) and their available actions (e.g., `create`, `read`, `update`, `delete`, `assign_driver`) | **Code** (`lib/auth-roles.ts`) | The schema of what can be controlled. Changes here are code changes. |
| Default presets per role (e.g., "Dispatcher can `load:read`, `load:update`, `trip:read`, …") | **Code** (seed source) | These are the factory defaults. New workspaces get these. |
| Per-workspace permission overrides (Admin's toggles) | **DB** (`organization_role.permission` JSON) | Admin's actual decisions. Live here. |
| Role IDs (e.g., `owner`, `admin`, `dispatcher`) | **Code** (enum) | Roles referenced by BA's `member.role`. Custom roles added at runtime are strings, but a small fixed set is reserved as system roles. |
| Custom role definitions (e.g., "Junior Dispatcher") | **DB** | Created by Admin. |

---

## 2. The 11 Modules — what a TMS actually does

Sources for this list: Turvo's product page (Inventory, Orders,
Shipments, Scheduling, Analytics, Driver, Integrations), Samsara's
product line (Telematics, Routing & Dispatch, DVIR, ELD Compliance,
Driver Experience, Equipment Tracking, Driver Coaching), Fleetio,
Motive, McLeod, plus the FMCSA regulatory areas (§391 DQ file, §395
HOS/ELD, §396 DVIR, §382 Drug & Alcohol Clearinghouse). What the user
runs day-to-day falls into exactly 11 modules. Each module has its own
permission namespace.

| # | Module | What it covers |
|---|--------|----------------|
| 1 | **Dispatch & Loads** | Order intake, load creation, dispatch board, trip execution |
| 2 | **Stops & Appointments** | Pickup/delivery stops, scheduling, facility contacts |
| 3 | **Rates & Commercials** | Rate confirmations, linehaul, fuel surcharge, customer/broker names |
| 4 | **Customers & Brokers** | Customer master, broker master, contacts, credit info |
| 5 | **Drivers** | Driver master record, pay rates, tax info, addresses, contact |
| 6 | **Equipment & Fleet** | Tractors, trailers, VIN, plate, registration, insurance, maintenance |
| 7 | **Documents** | BOL, POD, lumper receipts, rate cons, accident photos, training certs |
| 8 | **Safety & DOT Compliance** | HOS/ELD, DVIR, DQ file, drug & alcohol clearinghouse, accident reports |
| 9 | **Accounting & Settlements** | Customer invoices, driver/carrier settlements, factoring, AR/AP |
| 10 | **Reports & Analytics** | Operational KPIs, financial reports, safety reports, FMCSA CSA scores |
| 11 | **Workspace & Administration** | Workspace profile, members, invitations, custom roles, audit log, billing |

The **Resources** in the Better Auth `statement` map 1:1 to these
modules. Naming: `module_name` (snake_case).

---

## 3. Master Permission Catalog

For every module, three things are separated:

1. **View Scope (row-level):** "Can they see ALL records or only some?"
2. **Sensitive Fields (column-level):** "Which fields within a record can they see?"
3. **Actions (mutation-level):** "What buttons / API calls can they trigger?"

Every action key is a permission toggle. The UI shows them as ON/OFF
switches. The default matrix in §4 says what ON/OFF means for each
default role.

### 3.1 Dispatch & Loads

| Key | Type | Plain-English label | What it gates |
|-----|------|---------------------|---------------|
| `loads.view_all` | View Scope | View all loads | See every load in the workspace. Off = only loads assigned to me. |
| `loads.view_assigned` | View Scope | View loads assigned to me | See only loads where I'm the assigned driver or co-driver. Server-filtered. |
| `loads.create` | Action | Create new load | Add a fresh load. |
| `loads.edit` | Action | Edit load details | Modify load fields (commodity, weight, dates, customer ref, special instructions). |
| `loads.cancel` | Action | Cancel load | Mark a load as cancelled. |
| `loads.delete` | Action | Delete load | Hard-delete a load (rare; usually we cancel). |
| `loads.assign_driver` | Action | Assign driver to load | Pair a driver with a load. |
| `loads.assign_truck` | Action | Assign truck to load | Pair a tractor with a load. |
| `loads.reassign` | Action | Reassign driver or truck | Change an existing assignment (e.g., driver called in sick). |
| `loads.update_status` | Action | Update load status | Post a status event (booked, dispatched, in-transit, delivered, etc.). |
| `loads.export` | Action | Export loads to CSV/PDF | Bulk-export load list. |

### 3.2 Stops & Appointments

| Key | Type | Plain-English label | What it gates |
|-----|------|---------------------|---------------|
| `stops.view_all` | View Scope | View all stops | See every stop in every load. |
| `stops.edit` | Action | Edit stop details | Modify address, appointment time, facility contact, special instructions. |
| `stops.schedule` | Action | Schedule appointment | Set/reschedule pickup/delivery time. |
| `stops.add` | Action | Add stop to load | Add a multi-stop to a load (e.g., a partial unload). |
| `stops.delete` | Action | Remove stop | Delete a stop. |

### 3.3 Rates & Commercials *(sensitive — these are the dollars)*

| Key | Type | Plain-English label | What it gates |
|-----|------|---------------------|---------------|
| `rates.view_linehaul` | Field | View linehaul rate | See the base rate on a load ($X/mi, flat, etc.). |
| `rates.view_fuel_surcharge` | Field | View fuel surcharge | See the FSC amount or percentage. |
| `rates.view_accessorials` | Field | View accessorial charges | Detention, layover, tonu, lumper reimbursement. |
| `rates.view_total` | Field | View total revenue | See the load's total revenue. |
| `rates.edit` | Action | Edit rate on a load | Change the rate confirmation. |
| `rates.view_margin` | Field | View margin/profit | See internal margin (revenue - estimated cost). |

### 3.4 Customers & Brokers

| Key | Type | Plain-English label | What it gates |
|-----|------|---------------------|---------------|
| `customers.view_all` | View Scope | View all customers/brokers | See the full customer list. |
| `customers.view_contact` | Field | View customer contact info | See phone, email, address of broker/shipper ops contact. |
| `customers.view_credit` | Field | View credit terms & limits | See credit limit, payment terms, factoring status. |
| `customers.create` | Action | Add new customer/broker | Create a new shipper or broker. |
| `customers.edit` | Action | Edit customer/broker | Modify name, address, contact, payment terms. |
| `customers.delete` | Action | Delete customer/broker | Remove from the system. |
| `customers.view_name` | Field | View customer name on a load | See WHO the load is for. Off = load shown as "Load #1234" only. |

### 3.5 Drivers

| Key | Type | Plain-English label | What it gates |
|-----|------|---------------------|---------------|
| `drivers.view_all` | View Scope | View all drivers | See every driver in the workspace. |
| `drivers.view_personal` | Field | View driver personal info | See name, address, phone, email, emergency contact. |
| `drivers.view_pay_rate` | Field | View driver pay rate | See $/mile, percentage, or flat rate for a driver. |
| `drivers.view_tax_info` | Field | View tax / SSN / W-9 | See tax ID, SSN, withholding. |
| `drivers.view_clearinghouse` | Field | View drug & alcohol clearinghouse status | See pre-employment query result, RTD status. |
| `drivers.view_cdl` | Field | View CDL info | See CDL number, issuing state, endorsements, expiry. |
| `drivers.view_medical_cert` | Field | View medical certificate | See medical examiner, expiry, restrictions. |
| `drivers.create` | Action | Add new driver | Create driver record. |
| `drivers.edit` | Action | Edit driver record | Modify fields (name, address, pay rate, etc.). |
| `drivers.edit_sensitive` | Action | Edit sensitive driver fields | Specifically: SSN, pay rate, tax info, clearinghouse consent. |
| `drivers.terminate` | Action | Terminate driver | Mark a driver as terminated. |
| `drivers.flag_out_of_service` | Action | Flag driver out of service | Prevent driver from being assigned to any load (regulatory action). |

### 3.6 Equipment & Fleet

| Key | Type | Plain-English label | What it gates |
|-----|------|---------------------|---------------|
| `equipment.view_all` | View Scope | View all trucks/trailers | See the full fleet list. |
| `equipment.view_vin` | Field | View VIN | See vehicle identification number. |
| `equipment.view_plate` | Field | View plate number | See license plate. |
| `equipment.view_registration` | Field | View registration | See registration expiry, state. |
| `equipment.view_insurance` | Field | View insurance info | See policy number, carrier, expiry. |
| `equipment.create` | Action | Add new equipment | Add a tractor or trailer. |
| `equipment.edit` | Action | Edit equipment | Modify fields. |
| `equipment.delete` | Action | Retire equipment | Mark as sold / out of service. |
| `equipment.maintenance.create` | Action | Log maintenance | Add a maintenance record / work order. |
| `equipment.maintenance.view_all` | View Scope | View all maintenance records | See full PM/repair history. |

### 3.7 Documents

| Key | Type | Plain-English label | What it gates |
|-----|------|---------------------|---------------|
| `documents.view_all` | View Scope | View all documents | See every BOL, POD, rate con, etc. in the system. |
| `documents.upload_bol` | Action | Upload BOL | Driver or office staff uploads a Bill of Lading. |
| `documents.upload_pod` | Action | Upload POD | Driver uploads Proof of Delivery. |
| `documents.upload_lumper` | Action | Upload lumper receipt | Driver uploads a lumper/forklift receipt for reimbursement. |
| `documents.upload_rate_con` | Action | Upload rate confirmation | Office uploads signed rate con from broker. |
| `documents.upload_other` | Action | Upload other documents | Anything not covered by the categories above. |
| `documents.delete` | Action | Delete document | Soft-delete a document (audit log retains the record). |
| `documents.download` | Action | Download document | Pull a file from the system. |

### 3.8 Safety & DOT Compliance

| Key | Type | Plain-English label | What it gates |
|-----|------|---------------------|---------------|
| `hos.view_all` | View Scope | View all HOS logs | See every driver's hours-of-service. |
| `hos.view_own` | View Scope | View own HOS log | A driver can see their own log. |
| `hos.edit` | Action | Edit HOS log | Annotate / correct a log entry (FMCSA §395.30 — annotations only, original preserved). |
| `hos.approve` | Action | Approve HOS log | Office staff certifies a driver's daily log. |
| `dvir.view_all` | View Scope | View all DVIRs | See every Driver Vehicle Inspection Report. |
| `dvir.create` | Action | Submit DVIR | Pre-trip / post-trip inspection. |
| `dq_file.view_all` | View Scope | View all driver qualification files | See every driver's DQ file. |
| `dq_file.edit` | Action | Edit DQ file | Update CDL info, medical cert, MVR, training. |
| `dq_file.upload` | Action | Upload to DQ file | Attach a doc to a driver's file. |
| `accidents.view_all` | View Scope | View all accident reports | See every accident/incident report. |
| `accidents.create` | Action | Create accident report | File a new report. |
| `accidents.edit` | Action | Edit accident report | Update details of a report. |
| `accidents.delete` | Action | Delete accident report | Remove (soft-delete). |
| `drug_alcohol.query` | Action | Query clearinghouse | Run a FMCSA Drug & Alcohol Clearinghouse query. |
| `drug_alcohol.view` | Field | View clearinghouse results | See the result of a query. |

### 3.9 Accounting & Settlements

| Key | Type | Plain-English label | What it gates |
|-----|------|---------------------|---------------|
| `invoices.view_all` | View Scope | View all invoices | See every customer invoice. |
| `invoices.view_own` | View Scope | View own settlement | A driver can see their own pay stub. |
| `invoices.create` | Action | Create invoice | Generate a customer invoice from a delivered load. |
| `invoices.edit` | Action | Edit invoice | Modify line items, amounts, terms. |
| `invoices.delete` | Action | Delete / void invoice | Remove or void an invoice. |
| `invoices.submit_factoring` | Action | Submit to factoring | Send the invoice to the factor company. |
| `invoices.approve` | Action | Approve invoice for sending | Office approval gate before invoice goes to customer. |
| `settlements.create` | Action | Create settlement | Generate a driver or carrier settlement. |
| `settlements.edit` | Action | Edit settlement | Modify settlement line items. |
| `settlements.approve` | Action | Approve settlement | Final approval before paying the driver/carrier. |
| `settlements.pay` | Action | Mark settlement as paid | Update the payment status. |
| `ar.view` | View Scope | View accounts receivable | See AR aging report. |
| `ap.view` | View Scope | View accounts payable | See AP aging report. |
| `banking.view` | Field | View bank account info | See routing, account number, balance. |
| `banking.edit` | Action | Edit bank account info | Update bank accounts. |

### 3.10 Reports & Analytics

| Key | Type | Plain-English label | What it gates |
|-----|------|---------------------|---------------|
| `reports.view_operational` | View Scope | View operational reports | On-time %, miles driven, deadhead, etc. |
| `reports.view_financial` | View Scope | View financial reports | P&L, AR aging, AP aging, gross margin. |
| `reports.view_safety` | View Scope | View safety reports | CSA scores, accidents, violations. |
| `reports.view_driver_performance` | View Scope | View driver performance | Per-driver KPIs (miles, on-time %, MPG). |
| `reports.export` | Action | Export reports | CSV / PDF export of any report. |

### 3.11 Workspace & Administration

| Key | Type | Plain-English label | What it gates |
|-----|------|---------------------|---------------|
| `workspace.view` | View Scope | View workspace settings | See the workspace profile page. |
| `workspace.edit` | Action | Edit workspace settings | Modify name, logo, address, business type, time zone, currency, etc. |
| `workspace.edit_legal` | Action | Edit legal identifiers | Specifically: legal name, EIN, DOT#, MC#. UI shows a confirmation modal; server logs the change. |
| `workspace.transfer_ownership` | Action | Transfer ownership | Hand the workspace to another user. |
| `workspace.delete` | Action | Delete workspace | Permanently delete the workspace and all its data. |
| `workspace.billing.view` | View Scope | View billing & subscription | See plan, payment method, invoices from us (Muvx). |
| `workspace.billing.edit` | Action | Edit billing & subscription | Change plan, update payment. |
| `members.view` | View Scope | View team members | See the members list. |
| `members.invite` | Action | Invite new member | Send an invitation. |
| `members.edit_role` | Action | Change member's role | Promote, demote, change role assignment. |
| `members.suspend` | Action | Suspend member | Workspace-scoped suspension. |
| `members.lift_suspension` | Action | Lift suspension | Restore access. |
| `members.remove` | Action | Remove member | Delete the membership row. |
| `roles.view` | View Scope | View roles & permissions | See the Roles page. |
| `roles.create_custom` | Action | Create custom role | Add a new role. |
| `roles.edit` | Action | Edit any role's permissions | Toggle permissions on any role. |
| `roles.delete_custom` | Action | Delete custom role | Remove a custom role. |
| `audit_log.view` | View Scope | View audit log | See who did what. |

### 3.12 Total count

**~115 permission toggles** across 11 modules. This is the full
vocabulary. The Roles UI will show them grouped by module. The default
matrix below decides which are ON for each of the 6 default roles.

---

## 4. Default Preset Matrix

This is what a brand-new workspace ships with. An Admin can change
any of these. **ON** = the toggle is enabled for that role by default.
**OFF** = the toggle is disabled.

> Legend: `✓` = ON, `−` = OFF, `—` = N/A (the toggle doesn't apply to that role's scope)

(Continued in the next section — matrix is too long for a single file write, see `PERMISSION_CATALOG_MATRIX.md`.)

## 5. Storage Plan — exactly how this lands in the database

### The `organization_role` table (already exists in our DB)

Better Auth's `dynamicAccessControl: { enabled: true }` already
created this table via our migration `0011_wandering_whirlwind.sql`:

```sql
CREATE TABLE IF NOT EXISTS "organization_role" (
  "id"               text NOT NULL,                -- primary key (BA requires it)
  "organization_id"  text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "role"             text NOT NULL,                -- role ID ("dispatcher", "junior_dispatcher", ...)
  "permission"       text NOT NULL,                -- JSON: { "resource": ["action1", "action2"] }
  "created_at"       timestamp with time zone DEFAULT NOW() NOT NULL,
  "updated_at"       timestamp with time zone DEFAULT NOW() NOT NULL,
  PRIMARY KEY ("id")
);
CREATE INDEX ON "organization_role"("organization_id");
CREATE INDEX ON "organization_role"("role");
```

This is the only storage we need. Each row holds a complete permission
set for one role in one workspace.

### Seeding on workspace creation

When `app/actions/workspace.ts` creates a new workspace (or when BA's
`organization.create` runs), we call:

```ts
import { PRESET_PERMISSIONS } from "@/lib/auth-roles"
import { db } from "@/lib/db"
import { organizationRole } from "@/lib/schema"
import { randomUUID } from "node:crypto"

export async function seedRolePresets(organizationId: string) {
  const rows = Object.entries(PRESET_PERMISSIONS).map(([roleId, permission]) => ({
    id: randomUUID(),
    organizationId,
    role: roleId,
    permission: JSON.stringify(permission),
    createdAt: new Date(),
    updatedAt: new Date(),
  }))
  await db.insert(organizationRole).values(rows)
}
```

After this runs once, the workspace is fully dynamic. The presets live
in code only for the seed.

### Reading effective permissions (the runtime gate)

A new server-side helper, replacing the inline `requirePermission` for
gates that need replace semantics:

```ts
// lib/permissions.ts
import { cache } from "react"
import { db } from "@/lib/db"
import { organizationRole, member } from "@/lib/schema"
import { eq, and } from "drizzle-orm"
import { ac, PRESET_PERMISSIONS, type ActionKey } from "@/lib/auth-roles"
import { auth } from "@/lib/auth"

/**
 * Returns the EFFECTIVE permission set for a role in a workspace.
 * If a DB row exists, the row wins (replace semantics).
 * If no DB row exists, the static preset is used (workspace predates
 * the seed; or it's a built-in role like `owner` whose row is optional).
 */
export const getEffectivePermissions = cache(async (
  organizationId: string,
  roleId: string
): Promise<Record<string, string[]>> => {
  const [row] = await db
    .select({ permission: organizationRole.permission })
    .from(organizationRole)
    .where(
      and(
        eq(organizationRole.organizationId, organizationId),
        eq(organizationRole.role, roleId)
      )
    )
    .limit(1)

  if (row) {
    return JSON.parse(row.permission) as Record<string, string[]>
  }
  return (PRESET_PERMISSIONS as Record<string, Record<string, string[]>>)[roleId] ?? {}
})

/**
 * Server gate: throws 403 if the current user's role in the active
 * workspace does NOT have the given permission key.
 *
 * Replaces the older requirePermission() for actions that are part
 * of the new permission catalog. The old one is kept for the resource-
 * level Better Auth defaults (organization, member, ac) that haven't
 * moved to the new system yet.
 */
export async function requireAction(actionKey: ActionKey): Promise<void> {
  const { userId, organizationId, role } = await getActiveMembership()
  if (!organizationId) throw new ForbiddenError("NOT_IN_WORKSPACE")
  const perms = await getEffectivePermissions(organizationId, role)
  const [resource, action] = actionKey.split(".") as [string, string]
  if (!perms[resource]?.includes(action)) {
    throw new ForbiddenError(`MISSING_${actionKey}`)
  }
}
```

The `actionKey` is a single string like `"loads.create"` or
`"rates.view_linehaul"`. The split is `resource.action`. We don't
represent this as `Record<resource, action[]>` like BA's
`createAccessControl` because that's a much heavier type for a
~115-toggle system. We use a flat string catalog.

### Client-side permission check (for UI gates)

We don't use BA's `authClient.organization.checkRolePermission` —
that one doesn't know about dynamic roles and only does static checks.
Instead, we ship an endpoint that returns the current user's effective
permissions:

```
GET /api/settings/my-permissions
→ {
    role: "dispatcher",
    permissions: { "loads": ["view_all", "view_assigned", "create", ...], ... },
    role_name: "Dispatcher",
    is_custom: false
  }
```

The UI fetches this on mount (TanStack Query, `staleTime: 60_000`),
caches it, and uses it for every gate:

```tsx
const { data: perms } = useMyPermissions()
const canSeeRate = perms?.permissions.rates?.includes("view_linehaul") ?? false
const canEditLoad = perms?.permissions.loads?.includes("edit") ?? false
```

This is what kills the `if (role === "dispatcher")` pattern. Every
gate is a `canX` boolean derived from the user's actual permissions.
A custom `junior_dispatcher` role with `rates.view_linehaul` toggled
off behaves identically to the stock `dispatcher` with that toggle
off, with zero code change.

### Toggle UI (the Roles & Permissions page)

A future redesign. The current Roles page in the screenshot is a
42-row permission dump that no fleet owner can read. The new design
will be a single grid of 11 modules × 6 default roles, with each
cell a toggle switch. The grid loads:

- `GET /api/settings/role-catalog` — returns `{ roles: [...], resources: [...] }` (existing endpoint, updated to use the new model)
- `GET /api/settings/my-permissions` — to know which toggles the current user is allowed to edit (Owner/Admin only, per the `roles.edit` permission)

Toggling a cell calls:
```
POST /api/settings/role-catalog/update
body: { role: "dispatcher", resource: "loads", action: "edit", enabled: true }
```

This is a thin wrapper that reads the current row, splices the action
in/out of the JSON, and writes back. The exact endpoint is
`/api/settings/role-catalog/update` and uses the `roles.edit` permission
gate.

---

## 6. What the next conversation needs from you

Before I write any code, I need answers to these:

### Q1 — Driver: customer name on a load

You said earlier: *"driver ko sirf ye pta hona chahiye kha ye kha tk jaana hai load, not to whom load is going."*

I encoded this as `customers.view_name: OFF for driver`. But I should
confirm: does the driver see the **facility name** (the receiver/shipper
location — e.g., "Acme Distribution Center, Dallas TX")? That's the
physical place they're going, not the customer. My read: yes, they
see the facility, because otherwise they can't navigate. So the
distinction is:

- **Facility name and address** (the physical building): visible to driver.
- **Customer / broker name** (the company that hired the carrier): hidden from driver.

Is that the right line? Or should the facility name also be hidden and
the driver just sees an address?

### Q2 — Dispatcher: rate visibility default

I set `rates.view_linehaul: ON for dispatcher` by default. Many
fleets prefer Junior Dispatchers to NOT see rates (the Junior
Dispatch role negotiates without knowing what the Senior Dispatch
negotiated earlier). My recommendation: keep the default ON, and
document in the Roles UI that Admins should toggle OFF for
Junior Dispatcher custom roles. Confirm?

### Q3 — Safety: customer/broker name

I set `customers.view_name: ON for safety` so they can identify
which load a driver was on when an incident happened. They cannot
see credit/contact. Is that right?

### Q4 — Custom role creation: which role can create?

Right now I have `roles.create_custom: ON for owner + admin`. Should
a Safety officer be able to create a "Safety Officer Lead" custom
role? My read: no, only Owner/Admin. Custom roles can be created by
Owner/Admin, but their *permission set* is whatever the Admin
toggles. Safety uses the stock `safety` role.

### Q5 — Audit log visibility

I set `audit_log.view: ON for owner + admin` only. Should Accounting
also see audit events for invoice actions? My read: yes, they should
see audit events for `invoices.*` and `settlements.*` actions, but
not member-management events. That's a more granular permission
(`audit_log.view_financial`, `audit_log.view_members`, etc.) — do
we want to add those, or is "ON for Owner/Admin only" good enough
for now?

### Q6 — Workspace deletion safety

I made `workspace.delete: ON for owner` only. Is that right? In real
SaaS, this is often a 2-step confirmation: type the workspace name to
confirm, and require re-auth (password re-entry) within 5 minutes.
We don't have re-auth yet. Should we add it as part of this work or
ship the simple version first and add re-auth later?

### Q7 — Driver DQ file access

I gave the driver `dq_file.upload: ON` so they can upload their
medical cert / training certs to their own file. They get
`dq_file.view_all: OFF` so they can't see other drivers' files. But
can a driver see **their own** DQ file? The current toggle set
doesn't have a "view own DQ file" — they only have `hos.view_own`.
My recommendation: add a `dq_file.view_own` toggle, ON for driver
by default. Confirm?

---

## 7. After you answer Q1–Q7

I'll do this, in this order, with check-ins between each:

1. **Phase A — Foundation (no UI yet):**
   - Update `lib/auth-roles.ts` to expose `statement` (resources × actions), `PRESET_PERMISSIONS` (default map of role → permission), and a typed `ActionKey` union.
   - Add `lib/permissions.ts` with `getEffectivePermissions` and `requireAction`.
   - Add `seedRolePresets(organizationId)` and call it from the workspace creation action.
   - Wire `GET /api/settings/my-permissions`.
   - Run typecheck + build. Commit.

2. **Phase B — Replace existing role checks:**
   - Find every existing `requirePermission({ resource, action })` call. For each, decide: stays on the BA resource-level system (organization, member, ac, workspace defaults), or moves to the new `ActionKey` system. Migrate the ones that move.
   - Remove the static `ac.newRole({...})` declarations in `lib/auth-roles.ts` (the role objects) — they're no longer the source of truth. The presets become plain `Record<roleId, Record<resource, action[]>>` data.
   - Run typecheck + build. Commit.

3. **Phase C — UI for /settings/roles (the redesign):**
   - New grid component, 11 modules × 6 default roles, toggle switches.
   - "Create custom role" dialog with permission selector.
   - Confirmation modals on sensitive actions.
   - Run typecheck + build + better-design review. Commit.

4. **Phase D — Driver portal (separate work, not blocking the role system):**
   - `/driver-portal/*` route.
   - Server-filtered `/api/driver/*` endpoints.
   - Mobile-first PWA.
   - Run typecheck + build. Commit.

Each phase ends with a "Done" report that includes:
- Diff against TODO.md
- Test/verification output (typecheck, build, dev server smoke)
- Self-review against the workflow questions in §2 of the previous ROLES_PLAN.md (now retired)

---

## 8. Why we retired `ROLES_PLAN.md`

It tried to be the source of truth for the role model in static
TypeScript. We now know:

1. Real carriers want to toggle permissions without code changes.
2. Better Auth's `dynamicAccessControl` already gives us DB-stored roles
   — we just need to use replace semantics instead of merge.
3. The role IDs (`owner`, `admin`, `dispatcher`, `accounting`, `safety`,
   `driver`) are **default presets** that ship with every new
   workspace. They're not a fixed catalog.
4. The ~115 permission keys are the catalog. The roles are just
   different ON/OFF combinations of those keys.

`ROLES_PLAN.md` is kept in git history for the workflow-level analysis
in its §2 (which is good and is being reused). The implementation
plan in §3 is replaced by this document.
