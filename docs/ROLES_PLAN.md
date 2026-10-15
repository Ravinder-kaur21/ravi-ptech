# Muvx TMS — Role & Permission Model
*Working draft. Code changes go in after sign-off.*

## 0. Why this exists

Our current `lib/auth-roles.ts` has 8 role IDs (6 real + 2 stale), but the permission
strings are made up — there's no `load:create` vs `invoice:create` distinction; it's
all just "this role can read X". That's why the Roles page in the screenshot was a
42-row permission dump that no fleet owner could read.

A real carrier thinks in workflows, not in `ac.create`:
- "Can my dispatcher see what my driver is making?"
- "Can my accountant see live dispatch, or only completed loads?"
- "Can my driver see who else is on the load?"
- "Can my safety officer edit a driver file?"

This document says: **for each of our 6 roles, what is the answer to those
questions?** Then we map those answers onto Better Auth's
`createAccessControl` statement shape.

## 1. The 6 roles (no more, no less)

| ID | Label | Device | Carrier analog |
|----|-------|--------|----------------|
| `owner` | Owner | Desktop | Principal / CEO — "god mode for one person" |
| `admin` | Administrator | Desktop | Operations Manager / IT — everything except billing/banking |
| `dispatcher` | Dispatcher | Desktop | Lives in dispatch board 8+ hrs/day |
| `accounting` | Accounting | Desktop | AR/AP, settlements, invoices |
| `safety` | Safety & Compliance | Desktop | HOS logs, DQ files, drug clearinghouse |
| `driver` | Driver | Mobile (PWA) | Sees only their own work, no commercials |

**Removed from current auth-roles.ts:**
- `member` — was a fallback with no real meaning. Better Auth's `defaultStatements.member` already gives a default of "no permissions" so we don't need a wrapper.
- `operations_manager` — was a duplicate of `admin`. Owner and Admin cover the gap.

## 2. What each role actually does (workflow-level)

These are the answers to the questions a fleet owner asks. Source: FMCSA
HOS rules (§395, §391.51), the standard carrier workflow described in
TMS literature, and your last message.

### 2.1 Owner
**A single human being, not a job function.** The Owner can do everything
admin can do, plus ownership transfer, billing, banking, deleting the
workspace, and changing the DOT#/MC#/EIN.

| Question | Answer |
|----------|--------|
| Can edit workspace profile, banking, EIN, DOT, MC? | **Yes** (with audit log) |
| Can transfer ownership to another user? | **Yes** (the only role that can) |
| Can delete the workspace? | **Yes** (the only role that can) |
| Can suspend or change any member's role? | **Yes** |
| Can see every load, trip, invoice, settlement, driver file? | **Yes** |
| Can impersonate other roles for support? | **Yes** |

### 2.2 Administrator (Admin / Ops Manager)
**The COO.** Everything operational, but NOT the things that affect
company survival: banking, EIN, ownership transfer, workspace deletion.

| Question | Answer |
|----------|--------|
| Can edit workspace profile (name, logo, address, phone, business type)? | **Yes** |
| Can edit DOT, MC, EIN? | **Yes** (with audit log) — they're the compliance officer in most fleets |
| Can manage members (invite, suspend, change role)? | **Yes** (except can't promote anyone to Owner) |
| Can delete the workspace? | **No** |
| Can transfer ownership? | **No** |
| Can see banking? | **No** (Owner-only) |
| Can see all loads, trips, drivers, invoices, settlements? | **Yes** |
| Can create/edit custom roles? | **Yes** |

### 2.3 Dispatcher
**The board operator.** Their day is: assign loads, track trucks, call
brokers, fix problems. They need to see enough to dispatch, but they should
NOT see financials, pay rates, or driver net pay.

| Question | Answer |
|----------|--------|
| Can create/edit/cancel loads? | **Yes** |
| Can assign drivers and trucks to loads? | **Yes** |
| Can see live dispatch board (all in-transit loads)? | **Yes** |
| Can see driver HOS availability (on/off duty, hours remaining)? | **Yes** — but only "Drive: 6h left" not the raw log |
| Can see driver CDL/medical expiry? | **Yes** (read-only) |
| Can see customer/broker contact info? | **Yes** (operationally required) |
| Can see the rate (linehaul, fuel surcharge) on a load? | **Default: Yes** (per §371, rate confirmations are dispatch documents). **Toggle: workspace setting `dispatcher_can_view_rates` — default `on` for Ops Manager level, off for Junior Dispatcher**. |
| Can see company EIN, banking, AR/AP, settlements? | **No** |
| Can see driver net pay / settlement? | **No** |
| Can see another fleet's data? | **No** (workspace scope) |
| Can edit workspace settings? | **No** |

### 2.4 Accounting
**The money.** They take what dispatch did and turn it into invoices and
settlements. They need read access to the load record to verify what
happened, but should never touch the live board.

| Question | Answer |
|----------|--------|
| Can create/edit invoices (customer-facing)? | **Yes** |
| Can create/edit settlements (driver/carrier pay)? | **Yes** |
| Can submit to factoring companies? | **Yes** |
| Can see completed loads (status = delivered, POD on file)? | **Yes** |
| Can see in-transit loads? | **Read-only** (for ETA → invoice timing) |
| Can see rate confirmations? | **Yes** |
| Can see BOL, POD, lumper receipts? | **Yes** |
| Can see driver master record (name, address, tax info, pay rate)? | **Yes** (for settlement generation) |
| Can edit loads, change driver assignment, cancel a load? | **No** |
| Can see HOS logs? | **No** |
| Can edit workspace settings? | **No** |

### 2.5 Safety & Compliance
**The DOT auditor's right hand.** They manage driver qualification files
(DQ file per §391.51), HOS/ELD logs, DVIRs, drug & alcohol clearinghouse
queries, accident reports, and the company's CSA scores.

| Question | Answer |
|----------|--------|
| Can see HOS logs for every driver? | **Yes** |
| Can see DVIR (vehicle inspection) records? | **Yes** |
| Can see/edit driver DQ file (CDL, medical cert, MVR, employment history)? | **Yes** (CDL expiry is a hard deadline — must be able to update) |
| Can flag a driver as "out of service"? | **Yes** (preventing them from being assigned to a load) |
| Can query FMCSA drug & alcohol clearinghouse? | **Yes** (per query log) |
| Can see accident/incident reports? | **Yes** (CRUD) |
| Can see loads? | **Read-only** (for context — which load was the driver on when the incident happened) |
| Can see rates / customer info? | **Read-only minimum** (just enough to identify the load) |
| Can see invoices, settlements, banking? | **No** |
| Can assign loads? | **No** |
| Can edit workspace settings? | **No** |

### 2.6 Driver
**The person behind the wheel.** Mobile-first, stripped-down UI. They
must not see anything commercial, and they only see the load they're
working on RIGHT NOW (not the whole pipeline).

| Question | Answer |
|----------|--------|
| Can see their currently assigned load? | **Yes** (just the one) |
| Can see pickup address, delivery address, appointment times? | **Yes** |
| Can see facility contact (dock door, phone)? | **Yes** |
| Can see commodity (description, weight, pieces)? | **Yes** (so they know what to expect) |
| Can see special instructions (liftgate, hazmat, lumper)? | **Yes** |
| Can update trip status (Arrived, Loaded, En Route, Delivered)? | **Yes** (only their own trip) |
| Can upload BOL, POD, lumper receipt? | **Yes** |
| Can see the customer/broker NAME? | **No** (per your direction: "not to whom load is going") |
| Can see the rate / linehaul / fuel surcharge? | **No** |
| Can see other drivers? | **No** |
| Can see other drivers' loads? | **No** |
| Can see HOS log? | **Yes, only their own** (they need to know their own hours) |
| Can submit DVIR (pre-trip inspection)? | **Yes** (their own truck) |
| Can see own settlement / pay stub? | **Yes, only their own** (so they can dispute a pay check) |
| Can see workspace settings, members, billing? | **No** |
| Can see other workspaces' data? | **No** (server filter at API level) |

## 3. Mapping to Better Auth `createAccessControl`

Better Auth's pattern is:

```ts
import { createAccessControl } from "better-auth/plugins/access"

const statement = {
  resource_name: ["create", "read", "update", "delete"],
  // any action you want: "approve", "suspend", "transfer", etc.
} as const

const ac = createAccessControl(statement)

const role = ac.newRole({
  resource_name: ["create", "read", "update", "delete"],
})
```

### 3.1 The `statement` (resources × actions)

The actions a TMS needs on each resource. These come from the workflow
analysis above, not from made-up CRUD labels.

```ts
const statement = {
  // ── Better Auth defaults (do not remove) ─────────────────────────
  organization: ["update", "delete"],         // rename workspace, delete workspace
  member:        ["create", "update", "delete", "suspend"],  // manage team
  invitation:    ["create", "cancel"],        // invite people
  ac:            ["read", "create"],          // manage custom roles (dynamicAccessControl)

  // ── Workspace profile (legal/compliance/contact) ──────────────────
  workspace:     ["read", "update"],          // name, logo, address, phone, time zone, business type

  // ── Dispatch & Loads ──────────────────────────────────────────────
  load:          ["create", "read", "update", "delete", "assign_driver", "assign_truck", "cancel"],
  trip:          ["create", "read", "update", "delete", "status_update"],
  rate_view:     ["read"],                    // see $ on loads (dispatcher toggle)

  // ── Fleet & Drivers ───────────────────────────────────────────────
  driver:        ["create", "read", "update", "delete"],
  truck:         ["create", "read", "update", "delete"],
  trailer:       ["create", "read", "update", "delete"],

  // ── Safety & DOT compliance ───────────────────────────────────────
  hos_log:       ["create", "read", "update", "delete"],
  dvir:          ["create", "read", "update", "delete"],
  dq_file:       ["create", "read", "update"],   // driver qualification file
  accident:      ["create", "read", "update", "delete"],
  drug_alcohol:  ["read"],                       // FMCSA clearinghouse query

  // ── Accounting & Settlements ──────────────────────────────────────
  invoice:       ["create", "read", "update", "delete", "submit_factoring"],
  settlement:    ["create", "read", "update", "delete"],
  banking:       ["read", "update"],             // bank accounts, routing numbers
  report:        ["read"],                       // financial reports (P&L, aging, etc.)
} as const
```

### 3.2 Each role's permissions (using `ac.newRole`)

```ts
export const owner = ac.newRole({
  // Everything. The single human being who runs the company.
  organization: ["update", "delete"],
  member:        ["create", "update", "delete", "suspend"],
  invitation:    ["create", "cancel"],
  ac:            ["read", "create"],
  workspace:     ["read", "update"],
  load:          ["create", "read", "update", "delete", "assign_driver", "assign_truck", "cancel"],
  trip:          ["create", "read", "update", "delete", "status_update"],
  rate_view:     ["read"],
  driver:        ["create", "read", "update", "delete"],
  truck:         ["create", "read", "update", "delete"],
  trailer:       ["create", "read", "update", "delete"],
  hos_log:       ["create", "read", "update", "delete"],
  dvir:          ["create", "read", "update", "delete"],
  dq_file:       ["create", "read", "update"],
  accident:      ["create", "read", "update", "delete"],
  drug_alcohol:  ["read"],
  invoice:       ["create", "read", "update", "delete", "submit_factoring"],
  settlement:    ["create", "read", "update", "delete"],
  banking:       ["read", "update"],
  report:        ["read"],
})

export const admin = ac.newRole({
  // Operations. Same as owner MINUS ownership-transfer and workspace-delete and banking-update.
  organization: ["update"],                   // CANNOT delete workspace
  member:        ["create", "update", "delete", "suspend"],
  invitation:    ["create", "cancel"],
  ac:            ["read", "create"],          // can create custom roles
  workspace:     ["read", "update"],
  load:          ["create", "read", "update", "delete", "assign_driver", "assign_truck", "cancel"],
  trip:          ["create", "read", "update", "delete", "status_update"],
  rate_view:     ["read"],
  driver:        ["create", "read", "update", "delete"],
  truck:         ["create", "read", "update", "delete"],
  trailer:       ["create", "read", "update", "delete"],
  hos_log:       ["create", "read", "update", "delete"],
  dvir:          ["create", "read", "update", "delete"],
  dq_file:       ["create", "read", "update"],
  accident:      ["create", "read", "update", "delete"],
  drug_alcohol:  ["read"],
  invoice:       ["create", "read", "update", "delete", "submit_factoring"],
  settlement:    ["create", "read", "update", "delete"],
  banking:       ["read"],                    // CANNOT update banking
  report:        ["read"],
})

export const dispatcher = ac.newRole({
  // Board operator. Sees what they need to dispatch. Blind to money.
  load:          ["create", "read", "update", "assign_driver", "assign_truck", "cancel"],
  trip:          ["create", "read", "update", "status_update"],
  rate_view:     ["read"],                    // subject to workspace toggle (rate_view disabled → still no access)
  driver:        ["read", "update"],          // can update driver's current location/availability
  truck:         ["read"],
  trailer:       ["read"],
  hos_log:       ["read"],                    // can see "Driver X has 6h left" derived view
  dq_file:       ["read"],                    // CDL/medical expiry for dispatch decisions
  dvir:          ["read"],
})

export const accounting = ac.newRole({
  // Money. Read-only on ops, full CRUD on financial documents.
  load:          ["read"],                    // read-only for context
  trip:          ["read"],
  rate_view:     ["read"],                    // always — they need it for invoicing
  driver:        ["read"],                    // read for settlement generation
  truck:         ["read"],
  invoice:       ["create", "read", "update", "delete", "submit_factoring"],
  settlement:    ["create", "read", "update", "delete"],
  report:        ["read"],
})

export const safety = ac.newRole({
  // DOT compliance. Read-only on ops, full CRUD on safety records.
  load:          ["read"],                    // context only
  trip:          ["read"],
  driver:        ["read", "update"],          // can update DQ file fields
  truck:         ["read"],
  hos_log:       ["create", "read", "update", "delete"],
  dvir:          ["create", "read", "update", "delete"],
  dq_file:       ["create", "read", "update"],
  accident:      ["create", "read", "update", "delete"],
  drug_alcohol:  ["read"],
})

export const driver = ac.newRole({
  // Mobile-only. Server filters their data to only their own records.
  load:          ["read"],                    // only their assigned load (server filter)
  trip:          ["read", "status_update"],   // only their own trip (server filter)
  hos_log:       ["create", "read"],          // only their own (server filter)
  dvir:          ["create", "read"],
  settlement:    ["read"],                    // only their own (server filter)
})
```

### 3.3 Notes on what I added to BA's default resource set

| New resource | Why it's not just "load" or "invoice" |
|--------------|----------------------------------------|
| `hos_log` | Hours-of-Service logs are a regulated data type (ELD rule, 7-year retention). Drivers and Safety mutate them, dispatchers read summaries. Splitting from `trip` makes the permission explicit. |
| `dvir` | Driver Vehicle Inspection Reports. Same regulatory status as HOS. |
| `dq_file` | Driver Qualification File (§391.51). CDL, medical cert, MVR, employment history. Has its own audit requirement. |
| `accident` | Accident / incident reports. Has its own retention (5 years per most state laws). |
| `drug_alcohol` | FMCSA Drug & Alcohol Clearinghouse query. Auditable. Safety-only. |
| `rate_view` | A standalone "can see $ on a load" permission. Lets us turn it off per-workspace for junior dispatchers. |
| `banking` | Bank accounts, routing numbers, ACH info. Owner-only update. |
| `report` | Read access to financial reports (P&L, AR/AP aging, settlement summary). |
| `ac` | BA's dynamic-access-control resource — controls who can create/edit custom roles. |

### 3.4 Actions that are NOT just CRUD

These are real TMS actions that don't map to plain CRUD. Each is a
discrete action a role can take:

- `load:assign_driver` — dispatcher puts a driver on a load
- `load:assign_truck` — dispatcher pairs a truck to a load
- `load:cancel` — dispatcher cancels a booked load
- `trip:status_update` — driver or dispatcher posts a status event (Arrived, Loaded, etc.)
- `member:suspend` — admin or owner suspends a member
- `invoice:submit_factoring` — accounting submits an invoice to a factor
- `organization:delete` — owner-only, deletes the workspace
- `banking:update` — owner-only, edits bank routing/ACH

Better Auth allows any string as an action — we just declare it in the
statement.

## 4. What changes in the codebase

Once this is approved, the following edits land together:

| File | Change |
|------|--------|
| `lib/auth-roles.ts` | Replace statement + role definitions with the 6 above. Drop `member` and `operations_manager` from `ROLE_IDS`. Drop `WORKSPACE_FIELD_PERMISSIONS` and the `canEditField` / `getEditableFieldSet` helpers (already dead). |
| `lib/auth.ts` | Pass the 6 roles to the `organization` plugin's `roles: {}` map. The keys must be `"owner"`, `"admin"`, `"dispatcher"`, `"accounting"`, `"safety"`, `"driver"`. |
| `lib/auth-client.ts` | Same — the client side needs the same 6 role objects to evaluate permissions. |
| `app/api/settings/role-catalog/route.ts` | Returns the 6 roles + their statements, no need to merge dynamic roles for now (DAC adds custom roles on top, not replace these). |
| `app/actions/workspace.ts` | Already done — only the resource-level `workspace:update` gate remains. |
| `components/settings/workspace-client.tsx` | Already done — reads role from `getActiveMember()`. |
| `app/actions/invitation.ts` and any other `ASSIGNABLE_ROLES` consumer | Update to use the new list (drops `member`, `operations_manager`; adds nothing). |
| `app/api/admin/workspaces/*` and any superadmin code | Confirm there's no hardcoded role ID list. |
| `TODO.md` | Add a "Phase 3 C4" entry: design + build the new Roles page (TMS-module-based, not 42-row permission dump). |
| `docs/ROLES_PLAN.md` (this file) | Becomes the canonical reference; move into `lib/auth-roles.ts` as a top-of-file comment block. |

## 5. Things this plan does NOT cover (out of scope for this pass)

These need separate planning, not part of the role model:

- **Driver mobile UI** (`/driver-portal/*` route + server-filtered API). Roles are clear; UX is next.
- **Stop-local timezones** (`@date-fns/tz` for appointment display). Permission system has nothing to do with this.
- **The new Roles page design** (TMS-module summary cards, not a permission matrix). Needs Better Design MCP pass.
- **Custom role creation UI** (Dynamic Access Control is wired but the create-role dialog is still using the old per-resource form). Needs redesign.
- **Rate-view workspace toggle** (UI for `dispatcher_can_view_rates`). Workspace setting + check in dispatcher permission gate.
- **Audit-log enrichment for sensitive actions** (Owner changes EIN, role promotions, workspace deletion). Already have `recordAuditEvent()` — needs to be called in those specific paths.

## 6. Open questions before I write code

1. **Owner count**: Should we allow multiple Owners in a workspace (like an LLC with two principals), or strictly one? Multiple Owners is what most TMS products do, and it matches BA's `creatorRole: "owner"` model — the workspace's first user becomes owner, but transfer-ownership is allowed. **My recommendation: allow multiple Owners.** The current code already supports it.

2. **Dispatcher "see rates" toggle**: Should it be a single workspace setting (`dispatcher_can_view_rates: boolean`, default `true`), or per-dispatcher? **My recommendation: workspace setting.** Simpler, matches how the industry actually works (Ops Manager vs. Junior Dispatcher is a function-level distinction, not per-user).

3. **Can a driver see their own settlement?** (e.g., "This load earned you $X for the week"). My recommendation: yes, but only the line items that affect their own pay. The server filters `WHERE driver_id = ctx.userId`. This is already implied in the role above (`settlement: ["read"]`), but I want explicit sign-off because it's a privacy choice.

4. **Can a driver edit their own HOS log after the fact?** FMCSA allows driver annotations, but the original record must be preserved (§395.30). My recommendation: yes, with annotations; the original event stays in the audit log. This means `hos_log: ["create", "read"]` for driver is correct, and edits to existing events create new annotated records rather than overwriting.

5. **Can a driver see/edit their DQ file?** (§391.51 — CDL, medical cert.) Some of this is FMCSA-managed (CDL), some is the carrier's responsibility (medical cert, MVR, road test). My recommendation: driver can see their own DQ file (read-only) and upload new docs (medical cert renewal, training certificate) for Safety to approve. So `dq_file: ["read", "create"]` for driver, with the create going to a "pending review" state, not directly approved.

If you disagree with any of 1–5, say so before I touch `auth-roles.ts`. Otherwise, answer "go" and I'll:
1. Update `lib/auth-roles.ts` to the model in section 3
2. Update `lib/auth.ts` and `lib/auth-client.ts` to register the 6 roles
3. Run typecheck + build to confirm 0 errors
4. Commit as `Phase 3 C4: rewrite role model to 6 TMS-native roles`
5. Stop there. UI redesign and driver portal come next, separately.
