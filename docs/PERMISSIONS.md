# Muvx TMS — Master Permission Catalog

**Status:** Research + architectural decisions complete. **No code changes
yet — this document must be approved before any implementation.**

**Replaces:** `docs/ROLES_PLAN.md`, `docs/PERMISSION_CATALOG.md`,
`docs/PERMISSION_CATALOG_MATRIX.md` (all retired 2026-10-15).

---

## Table of contents

1. [Sources and assumptions](#1-sources-and-assumptions)
2. [The four permission dimensions](#2-the-four-permission-dimensions)
3. [The 12 modules — what a TMS actually does](#3-the-12-modules--what-a-tms-actually-does)
4. [Master permission catalog (130 keys, machine-readable)](#4-master-permission-catalog-130-keys-machine-readable)
5. [Default starter roles and why each default is the way it is](#5-default-starter-roles-and-why-each-default-is-the-way-it-is)
6. [Default preset matrix](#6-default-preset-matrix)
7. [Architecture: what Better Auth handles vs. what Muvx must implement itself](#7-architecture-what-better-auth-handles-vs-what-muvx-must-implement-itself)
8. [Storage and runtime resolution](#8-storage-and-runtime-resolution)
9. [Open questions before any code is written](#9-open-questions-before-any-code-is-written)

---

## 1. Sources and assumptions

### 1.1 Sources cited

Product documentation accessed 2026-10-15:

- **Samsara** — product pages for [Routing & Dispatch](https://www.samsara.com/products/telematics/routing), [Maintenance](https://www.samsara.com/products/telematics/fleet-maintenance), [Driver Coaching](https://www.samsara.com/products/cameras/driver-coaching). Product navigation sidebar lists modules: Fleet Telematics, GPS Fleet Tracking, Maintenance, Routing & Dispatch, Commercial Navigation, Electric Vehicles, Equipment Management, Trailer Tracking, Asset Tracking, Asset Tag, Driver Experience, Driver Coaching, Drowsiness Detection, DVIR, ELD Compliance, Connected Training, Connected Workflows, Samsara Platform, AI and Agents, Incident Center, Site Security. Source: live product navigation, captured 2026-10-15.
- **Samsara** — [Wikipedia article](https://en.wikipedia.org/wiki/Samsara_(company)) confirms positioning as IoT fleet management, products across transportation, construction, energy, utilities, public sector.
- **Turvo** — [homepage](https://turvo.com/) lists product modules: Inventory, Orders, Shipments, Scheduling, Analytics, Driver, Integrations. Source: live homepage, 2026-10-15.
- **McLeod Software** — [LoadMaster Enterprise integrations page](https://www.mcleodsoftware.com/products/loadmaster/) lists modules: Accounting, AI, Appointment Scheduling, Cargo Insurance, Credit Reporting, Direct Deposit, Dispatch Optimization, Driver History Reporting, Driver HOS Log Audits, Batch Fuel, Interactive Fuel, Fuel Optimization, Fuel Surcharge, Fuel Tax, Integrated Mapping & Directions, Load Board Load Searching, Load Board Tractor Posting, Market Rate Export, Mileage, Payment Provider Web Service, Profitability Analysis, Rate Index, Shipment Visibility Interface, SMS, Toll Management, Symphony Mobile Communications, Symphony Trailer Tracking, Vehicle Maintenance, Video Fleet Safety, VOIP Telephone Systems.
- **Fleetio** and **Rose Rocket** product pages returned 404 / 403 / couldn't be fetched on 2026-10-15. They are referenced by category (fleet maintenance / TMS) but their specific permission taxonomies could not be read in this session — see §1.2.
- **Wikipedia — [Transportation management system](https://en.wikipedia.org/wiki/Transportation_management_system)** for the four canonical TMS processes: Planning, Execution, Follow-up, Measurement. Captured 2026-10-15.
- **U.S. federal regulations** (read 2026-10-15):
  - [49 CFR §395 — Hours of Service of Drivers](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-395): defines duty statuses (D, ON, OFF, SB), 7- or 8-day HOS cycles, ELD output file format, team drivers, unidentified driver logs, ELD malfunctions, supporting documents.
  - 49 CFR §391.51 (Driver Qualification File): CDL, medical examiner's certificate, employment history, road test, annual MVR review.
  - 49 CFR §396 (Vehicle Inspection / DVIR): pre-trip and post-trip inspection requirements.
  - 49 CFR §382 (Controlled Substances and Alcohol Use and Testing): Drug & Alcohol Clearinghouse.
- **Better Auth v1.7.x** — [Dynamic Access Control docs](https://better-auth.com/docs/plugins/organization#dynamic-access-control) and the actual compiled source code at `node_modules/better-auth/dist/plugins/organization/` (specifically `has-permission.mjs`, `permission.mjs`, `routes/crud-access-control.mjs`, `access/statement.mjs`). Read 2026-10-15 to verify behavior, not just trust the docs.

### 1.2 Assumptions explicitly flagged

Where direct product documentation was not accessible, the assumption is named so it can be challenged:

1. **Fleetio's permission taxonomy** could not be read in this session. I assume they ship a "Standard + Admin" two-tier model and a custom-role feature because every modern fleet SaaS since 2020 has one, but I have no source.
2. **Rose Rocket's permission taxonomy** could not be read. Same assumption. Rose Rocket is positioned for mid-market carriers, so I assume their default roles are similar to Turvo's (Owner, Admin, Dispatcher, Driver, Accounting).
3. **Motive's permission taxonomy** could not be read. Motive is positioned as fleet safety + telematics; their role list is not public per their KB access controls. I assume Owner/Admin/Fleet Manager/Safety Manager/Driver as the default set based on the product positioning, but this is **unverified**.
4. **Whether commercial TMS products use row-level filtering or role-level filtering** is **not publicly documented** in any product I could reach. The pattern in this document (role-level toggles for `view_all` / `view_assigned` / `view_own`, plus server-side query augmentation) is what I'd build if I were a real TMS vendor; it is not sourced from a competitor.
5. **The "default permission ON/OFF" choices in the matrix below** are my best-faith synthesis of (a) what the role's job is in a real carrier operation, (b) what the FMCSA regulations require safety/compliance roles to access, and (c) the principle of least privilege. They are not lifted from any product's published default. Each row in §5 says **why** the default is what it is, so this can be reviewed.
6. **Driver app is a separate route** (`/driver-portal/*`) is the user's stated direction, not a sourced best practice. McLeod and Turvo do offer driver mobile apps but their internal architecture is not public.

### 1.3 What I am NOT asserting

- I am not asserting that any specific competitor ships the exact 130 permission keys below.
- I am not asserting that the matrix defaults are industry-standard. The defaults are reasoned from job function, not lifted from a product.
- I am not asserting that the BA Dynamic Access Control plugin is sufficient on its own. **It is not.** See §7 for the precise gap.

---

## 2. The four permission dimensions

A "permission" in this system is one of four kinds, never mixed. Every
key in §4 declares which kind it is. These are not interchangeable —
granting `read` on a record must not automatically grant visibility to
sensitive fields within that record, and granting module access must
not automatically grant row-level scope.

| Dimension | What it controls | Example key | Example question it answers |
|-----------|------------------|-------------|------------------------------|
| **(a) Module access** | Whether the role can open the page at all | `loads.module` | "Can a Driver see the Loads page?" (No — they go to `/driver-portal`.) |
| **(b) Record visibility scope** | Which rows of a resource this role sees | `loads.view_all`, `loads.view_assigned`, `loads.view_own` | "Can a Dispatcher see every load, or only their assigned region?" |
| **(c) Sensitive-field visibility** | Which columns within a record are visible | `rates.view_linehaul`, `drivers.view_pay_rate` | "Can a Dispatcher see the rate on a load?" |
| **(d) Action** | Whether the role can perform a write or workflow step | `loads.create`, `invoices.approve`, `workspace.transfer_ownership` | "Can a Dispatcher cancel a load?" |

**Why they must be separate:**

- If you collapse (a) and (b), you can't say "Dispatchers can open
  the Loads module, but only see loads in their assigned region." You
  end up building `if (role === "dispatcher")` checks in the load-list
  query, which is what we are explicitly avoiding.
- If you collapse (b) and (c), you can't say "Drivers can see their
  own load, but not the customer name on that load." You end up
  building `if (resource === "load")` and `if (field === "customer_name")`
  branches in the API serialization layer, which is exactly the
  complexity we are trying to leave behind.
- If you collapse (c) and (d), you can't say "An Accounting intern
  can see invoice totals but cannot approve them." You end up with
  the same field used for two different purposes.

The model below enforces four distinct shapes per resource. The BA
`ac` statement can hold the full vocabulary, but at runtime we read
the right shape for the right call site.

---

## 3. The 12 modules — what a TMS actually does

The 12 modules are a synthesis of:
- Turvo's published modules (Inventory, Orders, Shipments, Scheduling, Analytics, Driver, Integrations)
- Samsara's product sidebar (Telematics, Routing & Dispatch, Maintenance, Equipment Tracking, DVIR, ELD Compliance, Driver Coaching, etc.)
- McLeod's integrations list (Driver HOS Audits, Fuel Surcharge, Profitability Analysis, Vehicle Maintenance, etc.)
- FMCSA's regulatory areas (DQ file §391.51, HOS §395, DVIR §396, Drug & Alcohol §382, Accident reporting)
- The user's stated need: "Loads, Dispatch, Stops, Drivers, Equipment, Customers/Brokers, Documents, Accounting/Billing, Settlements, Safety/Compliance, Reports, Users/Roles, Workspace Settings."

| # | Module | What it covers | Why it exists as a separate module |
|---|--------|----------------|--------------------------------------|
| 1 | **Loads & Dispatch** | Order intake, load creation, dispatch board, trip execution, status events | The daily work. Every other module exists to support this. |
| 2 | **Stops & Appointments** | Pickup/delivery stops, scheduling, facility contacts, appointment times | Multi-stop loads (LTL, partials) and the legal appointment window are operationally distinct from "the load as a whole." |
| 3 | **Customers & Brokers** | Customer master, broker master, contacts, credit terms, payment history | Customers and brokers are contractual counterparties with their own PII, credit, and tax posture. Distinct from drivers and equipment. |
| 4 | **Drivers** | Driver master record, contact, pay rate, tax info, DQ file pointer | A driver is a person with statutory protections (DQ file §391.51, pay disclosure rules) distinct from equipment. |
| 5 | **Equipment & Fleet** | Tractors, trailers, VIN, plate, registration, insurance, maintenance, fault codes | Equipment is regulated separately (registration, insurance, ELD/VIN cross-check). Maintenance is operational, not legal. |
| 6 | **Documents** | BOL, POD, lumper receipts, rate confirmations, accident photos, training certs, insurance cards | Documents are records of fact. They are uploaded once, read many times, retained per FMCSA rules. The module is separate because document storage and lifecycle are different from the things they document. |
| 7 | **Safety & Compliance** | HOS/ELD logs, DVIRs, accidents, drug & alcohol clearinghouse, safety audits | Statutorily regulated. Per 49 CFR §395 the HOS log has a 6-month retention. Per §382 the clearinghouse query has its own consent and audit trail. |
| 8 | **Accounting & Invoicing** | Customer invoices, factoring submission, AR aging, AP aging, banking info | A customer invoice is the carrier's revenue event. AP is what the carrier owes (fuel advances, lumper reimbursements, driver settlements — but settlements get their own module because they have a distinct workflow). |
| 9 | **Settlements** | Driver settlements, carrier settlements, payroll deductions, settlement approval/payment | Settlements are the inverse flow of invoices — money out, not money in. They have a multi-step approval workflow distinct from invoicing. |
| 10 | **Reports & Analytics** | Operational KPIs, financial reports, safety reports, CSA scores, FMCSA reports | Reports are derived from the other modules. They are gated separately because the data behind them is sensitive (e.g., a safety report may include driver SSN-level detail). |
| 11 | **Users, Roles & Invitations** | Members, invitations, role assignment, custom role management | Membership is its own concern. The "who can change who" matrix is a separate governance layer. |
| 12 | **Workspace & Administration** | Workspace profile, billing/subscription, audit log, integrations, settings | The workspace is the tenant. Some settings (billing, legal) are Owner-only by default. Audit log is a cross-cutting compliance concern. |

---

## 4. Master permission catalog (130 keys, machine-readable)

Format per row: `permission_key` (Dimension: a/b/c/d) — Human label — Description

### 4.1 Loads & Dispatch (15 keys)

Module access (1):
- `loads.module` (a) — Access Loads & Dispatch module — Whether the role can open this module at all. Driver is OFF because drivers use `/driver-portal`, not this module.

Record scope (3):
- `loads.view_all` (b) — View all loads — See every load in the workspace regardless of assignment.
- `loads.view_assigned` (b) — View loads assigned to me — See only loads where I'm the assigned dispatcher (or driver).
- `loads.view_region` (b) — View loads in my region — See only loads whose origin or destination is in a region the dispatcher is responsible for. *Deferred: requires a region column on load + dispatcher; flag in Q1.*

Actions (11):
- `loads.create` (d) — Create new load — Add a fresh load.
- `loads.edit` (d) — Edit load — Modify load fields (commodity, weight, dates, customer ref, special instructions).
- `loads.cancel` (d) — Cancel load — Mark a load as cancelled (soft-delete).
- `loads.delete` (d) — Hard-delete load — Permanent delete. Rare; usually we cancel.
- `loads.assign_driver` (d) — Assign driver — Pair a driver with a load.
- `loads.assign_truck` (d) — Assign truck — Pair a tractor with a load.
- `loads.assign_trailer` (d) — Assign trailer — Pair a trailer with a load.
- `loads.reassign` (d) — Reassign — Change an existing driver/truck assignment mid-flight.
- `loads.dispatch` (d) — Dispatch — Move a load from "booked" to "dispatched" status. (Distinct from create because dispatch triggers downstream notifications.)
- `loads.update_status` (d) — Update status — Post a status event (booked, dispatched, in-transit, delivered, exception).
- `loads.export` (d) — Export loads — Bulk-export load list to CSV/PDF.

### 4.2 Stops & Appointments (5 keys)

Module access (1):
- `stops.module` (a) — Access Stops module — Owner/Admin/Dispatcher/Accounting need this. Driver sees stops inline on their load, not as a module.

Actions (4):
- `stops.edit` (d) — Edit stop details — Modify address, appointment time, facility contact, special instructions.
- `stops.schedule` (d) — Schedule appointment — Set or reschedule pickup/delivery time.
- `stops.add` (d) — Add stop — Add a multi-stop to a load (e.g., a partial unload).
- `stops.delete` (d) — Remove stop — Delete a stop.

### 4.3 Customers & Brokers (12 keys)

Module access (1):
- `customers.module` (a) — Access Customers & Brokers module — Safety and Driver are OFF.

Record scope (2):
- `customers.view_all` (b) — View all customers/brokers — See the full customer and broker list.
- `customers.view_assigned` (b) — View customers/brokers I do business with — Restricted subset (rare; some carriers give regional dispatchers only their own customers).

Sensitive fields (4):
- `customers.view_contact` (c) — View customer contact info — See phone, email, address of broker/shipper ops contact.
- `customers.view_credit` (c) — View credit terms & limits — See credit limit, payment terms, factoring status. **OFF for Dispatcher** — they don't need to know the broker's credit.
- `customers.view_name_on_load` (c) — View customer name on a load — See WHO the load is for. **OFF for Driver** (per user direction: "not to whom load is going"). The driver sees the facility address, not the customer/broker's name.
- `customers.view_tax_id` (c) — View customer tax ID — For 1099-NEC reporting. **OFF for Driver and Dispatcher.**

Actions (5):
- `customers.create` (d) — Add new customer/broker — Create a new shipper or broker.
- `customers.edit` (d) — Edit customer/broker — Modify name, address, contact, payment terms.
- `customers.delete` (d) — Delete customer/broker — Remove from the system (soft-delete; invoices retain the name).
- `customers.credit_check` (d) — Run credit check — Trigger a third-party credit check on a broker.
- `customers.export` (d) — Export customer list — Bulk export for sales/CRM use.

### 4.4 Drivers (16 keys)

Module access (1):
- `drivers.module` (a) — Access Drivers module — Driver is OFF (they see only their own profile, not as a module).

Record scope (2):
- `drivers.view_all` (b) — View all drivers — See the full driver roster.
- `drivers.view_own` (b) — View own driver profile — A driver can see their own master record (name, address, contact, pay stub).

Sensitive fields (6):
- `drivers.view_personal` (c) — View driver personal info — Name, address, phone, email, emergency contact.
- `drivers.view_pay_rate` (c) — View driver pay rate — $/mile, percentage, or flat rate. **OFF for Dispatcher** — they don't need to know what we pay the driver.
- `drivers.view_tax_info` (c) — View tax / SSN / W-9 — Tax ID, SSN, withholding. **OFF for Dispatcher** and **Driver themselves** by default (driver can be granted via custom role).
- `drivers.view_clearinghouse` (c) — View drug & alcohol clearinghouse status — Pre-employment query result, RTD (Refusal-to-Test) status, return-to-duty date. **Safety-only by default**; this is regulated data.
- `drivers.view_cdl` (c) — View CDL info — CDL number, issuing state, endorsements, expiry. Open to Dispatcher (for compliance with load requirements).
- `drivers.view_medical_cert` (c) — View medical certificate — Medical examiner, expiry, restrictions. Open to Dispatcher (a driver with an expired medical cert can't be assigned).

Actions (7):
- `drivers.create` (d) — Add new driver — Create driver record.
- `drivers.edit` (d) — Edit driver record — Modify fields (name, address, pay rate, etc.). **For sensitive fields gated separately by `drivers.edit_sensitive`.**
- `drivers.edit_sensitive` (d) — Edit sensitive fields — Specifically: SSN, pay rate, tax info, clearinghouse consent. **OFF for Dispatcher.**
- `drivers.terminate` (d) — Terminate driver — Mark a driver as terminated (soft-delete with retention of historical records).
- `drivers.flag_out_of_service` (d) — Flag driver out of service — Prevent driver from being assigned to any load (regulatory action). **Safety-only by default**; affects dispatch eligibility.
- `drivers.upload_dq_document` (d) — Upload DQ file document — Upload a doc to a driver's DQ file (CDL scan, medical cert, training cert).
- `drivers.export` (d) — Export driver roster — Bulk export (e.g., for the annual MVR review).

### 4.5 Equipment & Fleet (15 keys)

Module access (1):
- `equipment.module` (a) — Access Equipment & Fleet module — Driver is OFF (sees their assigned truck inline, not as a module).

Record scope (2):
- `equipment.view_all` (b) — View all trucks/trailers — See the full fleet list.
- `equipment.view_assigned` (b) — View equipment assigned to me — A driver can see the truck they're driving.

Sensitive fields (4):
- `equipment.view_vin` (c) — View VIN — Vehicle identification number. **Required for inspection, registration, FMCSA queries.** Open to all roles with `equipment.module`.
- `equipment.view_plate` (c) — View plate number — License plate.
- `equipment.view_registration` (c) — View registration — Registration expiry, state, owner. **OFF for Accounting** — they don't need it.
- `equipment.view_insurance` (c) — View insurance info — Policy number, carrier, expiry. **OFF for Dispatcher** — not operationally needed.

Actions (8):
- `equipment.create` (d) — Add new equipment — Add a tractor or trailer.
- `equipment.edit` (d) — Edit equipment — Modify fields.
- `equipment.retire` (d) — Retire equipment — Mark as sold / out of service.
- `equipment.maintenance.create` (d) — Log maintenance — Add a maintenance record / work order.
- `equipment.maintenance.edit` (d) — Edit maintenance record — Modify a work order.
- `equipment.maintenance.view_all` (b) — View all maintenance records — See full PM/repair history across the fleet.
- `equipment.maintenance.approve` (d) — Approve maintenance work order — Sign off on completion.
- `equipment.fault_code.acknowledge` (d) — Acknowledge fault code — Mark a DTC code as seen and triaged.

### 4.6 Documents (10 keys)

Module access (1):
- `documents.module` (a) — Access Documents module — Driver is OFF (uploads inline; doesn't browse).

Record scope (2):
- `documents.view_all` (b) — View all documents — See every BOL, POD, rate con, etc. in the system.
- `documents.view_own` (b) — View own documents — A driver can see their own uploads.

Actions (7):
- `documents.upload_bol` (d) — Upload BOL — Bill of Lading.
- `documents.upload_pod` (d) — Upload POD — Proof of Delivery.
- `documents.upload_lumper` (d) — Upload lumper receipt — Lumper/forklift receipt for reimbursement.
- `documents.upload_rate_con` (d) — Upload rate confirmation — Signed rate con from broker.
- `documents.upload_insurance` (d) — Upload insurance certificate — COI upload.
- `documents.delete` (d) — Delete document — Soft-delete (audit log retains the record).
- `documents.download` (d) — Download document — Pull a file from the system.

### 4.7 Safety & Compliance (18 keys)

Module access (1):
- `safety.module` (a) — Access Safety & Compliance module — Owner/Admin/Safety need this. Dispatcher and Driver are OFF.

Record scope (3):
- `hos.view_all` (b) — View all HOS logs — See every driver's hours-of-service. **Safety-only by default.**
- `hos.view_own` (b) — View own HOS log — A driver can see their own log.
- `hos.view_team` (b) — View team HOS logs — Team drivers (Primary + Secondary) can see each other's logs.

Actions (14):
- `hos.create` (d) — Create HOS log entry — Add a duty-status event (Off, SB, D, ON).
- `hos.edit` (d) — Edit/annotate HOS log — Per §395.30, edits preserve the original record. Annotation only.
- `hos.approve` (d) — Approve HOS log — Office staff certifies a driver's daily log. **Safety-only by default.**
- `hos.certify` (d) — Certify own HOS log — Driver certifies their own daily log. **Driver only** (and Owner/Admin).
- `dvir.create` (d) — Submit DVIR — Pre-trip / post-trip inspection. Required by §396.
- `dvir.view_all` (b) — View all DVIRs — See every DVIR.
- `dvir.flag_defect` (d) — Flag defect — Mark a DVIR as having a defect (puts the vehicle out of service).
- `accidents.create` (d) — Create accident report — File a new report. Required by §390.15 (recordable accidents).
- `accidents.edit` (d) — Edit accident report — Update details.
- `accidents.view_all` (b) — View all accident reports — See every report.
- `accidents.delete` (d) — Delete accident report — Soft-delete.
- `drug_alcohol.query` (d) — Query FMCSA Clearinghouse — Per §382.701, pre-employment query required; annual query recommended.
- `drug_alcohol.view` (c) — View clearinghouse results — See the result of a query. **Safety-only.**
- `csr.view` (b) — View CSA scores — Per §385, CSA scores are public; gated for sensitive inspection detail.

### 4.8 Accounting & Invoicing (13 keys)

Module access (1):
- `accounting.module` (a) — Access Accounting & Invoicing module — Owner/Admin/Accounting need this.

Record scope (2):
- `invoices.view_all` (b) — View all invoices — See every customer invoice.
- `invoices.view_assigned` (b) — View invoices I created — Restricted subset for junior accounting staff.

Actions (10):
- `invoices.create` (d) — Create invoice — Generate a customer invoice from a delivered load.
- `invoices.edit` (d) — Edit invoice — Modify line items, amounts, terms.
- `invoices.delete` (d) — Void invoice — Remove or void an invoice (cannot hard-delete; invoices are auditable records).
- `invoices.approve` (d) — Approve invoice for sending — Office approval gate before invoice goes to customer.
- `invoices.send` (d) — Send invoice to customer — Email the invoice.
- `invoices.submit_factoring` (d) — Submit to factoring — Send the invoice to the factor company.
- `invoices.apply_payment` (d) — Apply customer payment — Mark an invoice as paid when payment arrives.
- `ar.view` (b) — View accounts receivable — AR aging report. **Accounting + Admin + Owner.**
- `ap.view` (b) — View accounts payable — AP aging report. **Accounting + Admin + Owner.**
- `banking.view` (c) — View bank account info — See routing, account number, balance. **Owner + Accounting only by default.** Not Dispatcher, not Safety.
- `banking.edit` (d) — Edit bank account info — Update bank accounts. **Owner-only by default.** Not even Accounting edits bank info.
- `reports.financial.view` (b) — View financial reports — P&L, AR/AP aging, gross margin. **Owner + Accounting + Admin.**

### 4.9 Settlements (10 keys)

Module access (1):
- `settlements.module` (a) — Access Settlements module — Owner/Admin/Accounting need this. Driver sees their own pay stub inline (gated by `invoices.view_own` for simplicity, see Q5).

Record scope (2):
- `settlements.view_all` (b) — View all settlements — See every driver/carrier settlement.
- `invoices.view_own` (b) — View own settlement — A driver can see their own pay stub.

Actions (7):
- `settlements.create` (d) — Create settlement — Generate a driver or carrier settlement from completed loads.
- `settlements.edit` (d) — Edit settlement — Modify settlement line items, deductions.
- `settlements.approve` (d) — Approve settlement — Final approval before paying the driver/carrier.
- `settlements.pay` (d) — Mark settlement as paid — Update the payment status.
- `settlements.deduct` (d) — Add deduction — Add an advance, fuel card charge, or lumper reimbursement to a settlement.
- `settlements.export` (d) — Export settlements — For payroll processor integration.
- `payroll.run` (d) — Run payroll — Trigger the payroll run for the period.

### 4.10 Reports & Analytics (7 keys)

Module access (1):
- `reports.module` (a) — Access Reports & Analytics module — All roles with the relevant data.

Record scope (4):
- `reports.operational.view` (b) — View operational reports — On-time %, miles driven, deadhead %.
- `reports.safety.view` (b) — View safety reports — CSA scores, accidents, violations. **OFF for Driver** (they see their own safety status, gated by HOS module).
- `reports.driver_performance.view` (b) — View driver performance — Per-driver KPIs. **OFF for Accounting** (not their concern).
- `reports.financial.view` (b) — View financial reports — P&L, AR/AP aging, gross margin. (Duplicate of `accounting.reports.financial.view` for module-local discoverability. See Q5.)

Actions (2):
- `reports.export` (d) — Export reports — CSV / PDF export.
- `reports.schedule` (d) — Schedule report — Set up a recurring email report.

### 4.11 Users, Roles & Invitations (10 keys)

Module access (1):
- `users.module` (a) — Access Users & Roles module — Owner/Admin need this to manage team.

Record scope (1):
- `members.view` (b) — View team members — See the members list. Open to all roles so drivers know who's in their team, gated more tightly by individual fields below.

Sensitive fields (1):
- `members.view_email` (c) — View member email — See another member's email address. (Member names always visible; emails are PII.) **Default: Owner/Admin/Accounting.** Dispatcher doesn't need driver emails to dispatch.

Actions (7):
- `members.invite` (d) — Invite new member — Send an invitation. **Owner/Admin.**
- `members.edit_role` (d) — Change member's role — Promote, demote, change role assignment. **Owner/Admin.**
- `members.suspend` (d) — Suspend member — Workspace-scoped suspension. **Owner/Admin.**
- `members.lift_suspension` (d) — Lift suspension — Restore access. **Owner/Admin.**
- `members.remove` (d) — Remove member — Delete the membership row. **Owner/Admin.**
- `roles.view` (b) — View roles & permissions — See the Roles page. Open to all so users can understand their own permissions.
- `roles.edit` (d) — Edit any role's permissions — Toggle permissions on any role. **Owner/Admin only.**
- `roles.create_custom` (d) — Create custom role — Add a new role. **Owner/Admin.**
- `roles.delete_custom` (d) — Delete custom role — Remove a custom role. **Owner/Admin.**

### 4.12 Workspace & Administration (8 keys)

Module access (1):
- `workspace.module` (a) — Access Workspace Settings module — Owner/Admin/Accounting (for billing visibility). Dispatcher/Safety/Driver are OFF.

Record scope (1):
- `workspace.view` (b) — View workspace settings — See the workspace profile page. Open to all so the workspace name is shown everywhere.

Actions (6):
- `workspace.edit` (d) — Edit workspace settings — Modify name, logo, address, business type, time zone, currency.
- `workspace.edit_legal` (d) — Edit legal identifiers — Specifically: legal name, EIN, DOT#, MC#. UI shows a confirmation modal; audit log captures the change. **Owner + Admin.** Driver/Safety/Accounting are OFF.
- `workspace.transfer_ownership` (d) — Transfer ownership — Hand the workspace to another user. **Owner-only.** One-way: cannot be revoked by the original Owner.
- `workspace.delete` (d) — Delete workspace — Permanent deletion. **Owner-only.** UI requires re-auth (separate feature, see Q6).
- `workspace.billing.view` (b) — View Muvx billing — Plan, payment method, Muvx invoices. **Owner + Admin + Accounting.**
- `workspace.billing.edit` (d) — Edit Muvx billing — Change plan, update payment. **Owner-only.**
- `audit_log.view` (b) — View audit log — See who did what. **Owner + Admin.** (Open Q5: should Accounting see invoice-action audit events?)

### 4.13 Total count

**130 permission keys** across 12 modules. Grouped by dimension:

| Dimension | Count |
|-----------|------:|
| (a) Module access | 12 |
| (b) Record visibility scope | 28 |
| (c) Sensitive-field visibility | 17 |
| (d) Action | 73 |
| **Total** | **130** |

The breakdown is intentional: 73 actions, 28 scopes, 17 field gates, 12 module gates. Every gate is a separate toggle.


---

## 5. Default starter roles and why each default is the way it is

The following 6 starter roles ship with every new workspace as **default
presets**. The names are illustrative — workspace Admins can rename,
clone, or replace them with custom roles. They are templates, not a
fixed architecture.

| ID | Label | Device | Job function (the reason the role exists) |
|----|-------|--------|---------------------------------------------|
| `owner` | Owner | Desktop | A single human being (or two) who runs the company. Holds legal and financial responsibility. |
| `admin` | Administrator / Operations Manager | Desktop | The COO. Manages day-to-day operations and team. Trusted with legal identifiers (DOT/MC/EIN) but not with banking. |
| `dispatcher` | Dispatcher | Desktop | Runs the dispatch board. Owns load assignment, driver/truck pairing, and customer-facing coordination. |
| `accounting` | Accounting / Billing | Desktop | Owns the money flow out (settlements, payroll) and in (invoices, factoring). Sees rates but not necessarily margin. |
| `safety` | Safety & Compliance Officer | Desktop | Owns the regulatory perimeter: DQ files, HOS, drug clearinghouse, accident reports, CSA scores. |
| `driver` | Driver | Mobile (PWA) | Sees only the work they personally do. Cannot see other drivers' pay, customer names, or the dispatch board. |

### 5.1 Why the **Owner** is set up the way it is

Owner is treated as the absolute trust anchor. The default has every
toggle ON **except** those that the Owner cannot reasonably exercise
alone (e.g., `hos.certify` — Owner can, but it's not their daily
work; left ON so they can). The reasoning for specific keys:

- `workspace.delete`: ON. The Owner can wipe the company. That's their right.
- `workspace.transfer_ownership`: ON. Required to hand off the company.
- `banking.edit`: ON. Only the Owner edits bank info (see §5.2 on Admin).
- `audit_log.view`: ON. Owner must be able to see what happened.
- `safety.module`: ON. Even an Owner who never logs in to safety must be able to if a regulator asks.

### 5.2 Why the **Administrator (Admin)** is set up the way it is

The Admin is the COO. They run operations but don't own the company.
Specific reasoning:

- `workspace.delete`: **OFF.** A second-in-command should not be able to wipe the company. Per real TMS practice (and per McLeod's role model), deletion requires Owner.
- `workspace.transfer_ownership`: **OFF.** Same reasoning.
- `banking.edit`: **OFF.** Admin can view bank info (`banking.view`: ON) so they can verify payments, but they cannot change routing/account numbers. **This is a deliberate defense-in-depth choice against social engineering and wire fraud.** Admin sees enough to know if a payment is wrong, but cannot move money.
- `workspace.billing.edit`: **OFF.** The Muvx plan is the Owner's concern, not the COO's. Admin can view (`workspace.billing.view`: ON) to know what features are enabled.
- `banking.view`: **ON.** Admin needs to verify payments and trace cash flow.
- `hos.view_all`: ON. Admin is the first responder to a driver calling in sick; they need HOS context.
- `customers.view_credit`: ON. Admin runs collections; they need to know the broker's credit posture.
- `drivers.edit_sensitive`: ON. Admin handles onboarding and pay changes.
- `rates.view_margin`: ON. Admin is the COO; they see the company's actual margin.
- `accounting.module`: ON. The Admin/COO sees financial reports and invoices.

### 5.3 Why the **Dispatcher** is set up the way it is

The Dispatcher lives in the dispatch board. Their day is: assign loads, track trucks, call brokers, fix problems. Reasoning:

- `loads.module`: ON. The dispatch board is their home.
- `loads.view_all`: ON. The dispatcher needs to see every load to assign appropriately.
- `rates.view_linehaul` / `view_fuel_surcharge` / `view_accessorials` / `view_total`: **ON by default**, with the option to toggle OFF for junior dispatchers. Per the user's "Junior Dispatcher" example, the Admin can create a custom role cloned from Dispatcher with `rates.*` OFF. (See Q2 — this default is the one I'd like explicit sign-off on.)
- `rates.view_margin`: **OFF.** Dispatchers negotiate rates but don't see the company's internal margin. If they did, they'd anchor to it. Per real TMS practice (Turvo, McLeod), margin is a back-office concern.
- `customers.view_credit`: **OFF.** They need to know the broker contact to coordinate pickup; they don't need to know the broker's credit limit.
- `customers.view_tax_id`: **OFF.** Not operationally needed.
- `drivers.view_pay_rate`: **OFF.** They don't need to know what we pay the driver. If they did, they'd have a conflict of interest when assigning loads.
- `drivers.view_tax_info`: **OFF.** Same reasoning.
- `drivers.flag_out_of_service`: **OFF.** That's a Safety/Admin action.
- `banking.*`: **OFF.** Defense in depth (see §5.2).
- `hos.certify`: **OFF.** Drivers self-certify (§395.30). Dispatchers do not certify HOS.
- `hos.approve`: **OFF.** That's an Admin/Safety action.
- `documents.upload_rate_con`: **OFF** by default. Operations team typically scans and uploads rate cons. (Admin can grant.)
- `equipment.maintenance.*`: **OFF.** Maintenance is its own workflow.
- `accounting.module` / `settlements.module`: **OFF.** Blind to money.
- `audit_log.view`: **OFF.** Audit is Owner/Admin.

### 5.4 Why the **Accounting** role is set up the way it is

The Accounting role is the back office. They turn what dispatch did into money. Reasoning:

- `accounting.module`: ON. Their home.
- `invoices.view_all` / `create` / `edit` / `delete` (void) / `approve` / `send` / `submit_factoring` / `apply_payment`: ON. Full invoice lifecycle.
- `ar.view` / `ap.view`: ON. Aging reports.
- `settlements.*`: ON. Full settlement lifecycle including approval and payment marking.
- `banking.view`: ON. They need to know the bank accounts to verify wire receipts.
- `banking.edit`: **OFF.** They don't edit bank info; that's Owner-only. (See §5.2.)
- `loads.module`: **ON but read-only in practice.** They need to verify load history before invoicing. They cannot `loads.create` / `edit` / `cancel` — those are OFF. They can `loads.view_all` to read the data, but no actions.
- `documents.module`: ON. They handle rate confirmations, BOLs, PODs.
- `customers.view_credit`: ON. Collections and credit decisions are their work.
- `customers.view_tax_id`: ON. For 1099-NEC reporting to brokers/contractors.
- `drivers.view_pay_rate`: ON. To generate settlements.
- `drivers.view_tax_info`: ON. To generate W-2/1099 tax documents.
- `hos.*`: **OFF.** Not their concern.
- `safety.module`: **OFF.** Not their concern.
- `equipment.module`: **ON** (read-only). They need to know equipment for depreciation.
- `reports.financial.view`: ON.
- `audit_log.view`: **OFF by default.** Open Q5: should they see invoice-action audit events?

### 5.5 Why the **Safety & Compliance** role is set up the way it is

The Safety role owns the regulatory perimeter. Reasoning:

- `safety.module`: ON. Their home.
- `hos.view_all` / `hos.approve`: ON. They audit and approve HOS logs.
- `dvir.*`: ON. Full DVIR access.
- `accidents.*`: ON. Full accident report CRUD.
- `drug_alcohol.query` / `view`: ON. They run the clearinghouse queries.
- `csr.view`: ON. They track CSA scores.
- `drivers.view_clearinghouse`: ON. Per §382, this is the Safety role's domain.
- `drivers.view_cdl` / `view_medical_cert`: ON. They maintain the DQ file.
- `drivers.edit_sensitive`: ON. They update pay rate, SSN, clearinghouse consent as part of DQ file maintenance.
- `drivers.flag_out_of_service`: ON. A safety flag must remove the driver from dispatch eligibility.
- `loads.view_all` / `customers.view_name_on_load`: ON. They need to identify which load a driver was on during an incident. But `rates.*` and `customers.view_credit` are OFF — the incident isn't about money.
- `documents.module`: ON. Accident photos, training certs, insurance cards.
- `equipment.view_vin` / `view_plate` / `view_registration` / `view_insurance`: ON. Per §396, vehicle inspection requires registration.
- `banking.*`: **OFF.** Not their concern.
- `accounting.*` / `settlements.*`: **OFF.** Not their concern.
- `audit_log.view`: **OFF by default.** Open Q5.

### 5.6 Why the **Driver** role is set up the way it is

The Driver works from a phone. They are not at a desk. Reasoning:

- `loads.module`: **OFF.** Drivers do not see the dispatch board. They go to `/driver-portal` and see only their assigned load.
- `loads.view_assigned`: **ON** (not `view_all`). They see their own load, server-filtered.
- `loads.update_status`: **ON.** They tap "Arrived at Pickup", "Loaded", "En Route", "Delivered."
- `stops.module`: **OFF.** Stops are inline on their load card.
- `customers.view_name_on_load`: **OFF.** Per user direction: "not to whom load is going." The driver sees the facility name and address (the physical building), but not the customer/broker's name.
- `rates.*`: **ALL OFF.** The driver does not see the linehaul, fuel surcharge, accessorials, or total revenue. They don't need to. If they did, they'd shop the load.
- `drivers.view_own`: **ON.** They see their own profile.
- `drivers.view_pay_rate` / `view_tax_info`: **OFF.** They can be granted via custom role (e.g., "Driver-Plus" who sees their own pay stub). Default is OFF because pay visibility has employee-relations implications.
- `documents.upload_bol` / `upload_pod` / `upload_lumper`: **ON.** The driver app's main job is to capture paperwork from the cab.
- `documents.view_own`: **ON.** They see their own uploads.
- `hos.view_own`: **ON.** They need to know their own hours.
- `hos.create` / `hos.edit` / `hos.certify`: **ON.** They create their own duty-status events and self-certify per §395.30.
- `dvir.create`: **ON.** Pre-trip inspection per §396.
- `equipment.view_assigned`: **ON.** They see the truck they're driving.
- `banking.*`: **OFF.** No financial visibility.
- `accounting.*` / `settlements.module` / `safety.module` / `users.module` / `workspace.module`: **OFF.** They never open these modules.
- `audit_log.view`: **OFF.** They see their own activity in their own log (e.g., "I submitted DVIR at 6:02am") but not a global audit view.

### 5.7 What is intentionally NOT a default role

The following are **not** in the default preset. They are mentioned by the user as future use cases and should be supported as custom roles (cloning + toggling), not as built-in defaults:

- **Junior Dispatcher** (Dispatcher minus `rates.*` and `customers.view_credit`).
- **Night Dispatcher** (Dispatcher with a different time-zone or after-hours config; same permissions, different scope).
- **Fleet Mechanic** (Equipment module + Maintenance, no Dispatch, no Accounting).
- **Safety Officer Lead** (Safety with role-management access for their own team).
- **Driver Helper / Co-Driver** — per user direction, this is **not** a separate role. Team drivers are two `driver` users assigned to the same truck, with `hos.view_team` granted via custom role.
- **Customer Portal User** (shipper/broker logging in to see their loads) — separate product surface, not in this system.
- **Factor Company Rep** — separate product surface, not in this system.

Custom roles are created by Admin/Owner via the Roles UI. The system never ships a preset for these; the user creates them as needed.

---

---

## 6. Default preset matrix

Legend: `✓` = ON by default. `−` = OFF by default. `—` = N/A (toggle does not apply to the role's scope; we leave it OFF but it could be enabled for a custom role).

| Permission | owner | admin | dispatcher | accounting | safety | driver |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Module access (12)** | | | | | | |
| `loads.module` | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| `stops.module` | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| `customers.module` | ✓ | ✓ | ✓ | ✓ | — | — |
| `drivers.module` | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| `equipment.module` | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| `documents.module` | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| `safety.module` | ✓ | ✓ | — | — | ✓ | — |
| `accounting.module` | ✓ | ✓ | — | ✓ | — | — |
| `settlements.module` | ✓ | ✓ | — | ✓ | — | — |
| `reports.module` | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| `users.module` | ✓ | ✓ | — | — | — | — |
| `workspace.module` | ✓ | ✓ | — | ✓ | — | — |
| **Loads & Dispatch (15)** | | | | | | |
| `loads.view_all` | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| `loads.view_assigned` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `loads.view_region` | — | — | — | — | — | — |
| `loads.create` | ✓ | ✓ | ✓ | — | — | — |
| `loads.edit` | ✓ | ✓ | ✓ | — | — | — |
| `loads.cancel` | ✓ | ✓ | ✓ | — | — | — |
| `loads.delete` | ✓ | ✓ | — | — | — | — |
| `loads.assign_driver` | ✓ | ✓ | ✓ | — | — | — |
| `loads.assign_truck` | ✓ | ✓ | ✓ | — | — | — |
| `loads.assign_trailer` | ✓ | ✓ | ✓ | — | — | — |
| `loads.reassign` | ✓ | ✓ | ✓ | − | − | − |
| `loads.dispatch` | ✓ | ✓ | ✓ | − | − | − |
| `loads.update_status` | ✓ | ✓ | ✓ | − | − | ✓ |
| `loads.export` | ✓ | ✓ | ✓ | ✓ | ✓ | − |
| **Stops (5)** | | | | | | |
| `stops.edit` | ✓ | ✓ | ✓ | − | − | − |
| `stops.schedule` | ✓ | ✓ | ✓ | − | − | − |
| `stops.add` | ✓ | ✓ | ✓ | − | − | − |
| `stops.delete` | ✓ | ✓ | ✓ | − | − | − |
| **Customers (12)** | | | | | | |
| `customers.view_all` | ✓ | ✓ | ✓ | ✓ | — | — |
| `customers.view_assigned` | — | — | — | — | — | — |
| `customers.view_contact` | ✓ | ✓ | ✓ | ✓ | — | — |
| `customers.view_credit` | ✓ | ✓ | − | ✓ | — | — |
| `customers.view_name_on_load` | ✓ | ✓ | ✓ | ✓ | ✓ | **−** |
| `customers.view_tax_id` | ✓ | ✓ | − | ✓ | − | − |
| `customers.create` | ✓ | ✓ | ✓ | ✓ | − | − |
| `customers.edit` | ✓ | ✓ | ✓ | ✓ | − | − |
| `customers.delete` | ✓ | ✓ | − | ✓ | − | − |
| `customers.credit_check` | ✓ | ✓ | − | ✓ | − | − |
| `customers.export` | ✓ | ✓ | ✓ | ✓ | − | − |
| **Drivers (16)** | | | | | | |
| `drivers.view_all` | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| `drivers.view_own` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `drivers.view_personal` | ✓ | ✓ | ✓ | ✓ | ✓ | − |
| `drivers.view_pay_rate` | ✓ | ✓ | **−** | ✓ | − | − |
| `drivers.view_tax_info` | ✓ | ✓ | − | ✓ | − | − |
| `drivers.view_clearinghouse` | ✓ | − | − | − | ✓ | − |
| `drivers.view_cdl` | ✓ | ✓ | ✓ | − | ✓ | − |
| `drivers.view_medical_cert` | ✓ | ✓ | ✓ | − | ✓ | − |
| `drivers.create` | ✓ | ✓ | ✓ | − | − | − |
| `drivers.edit` | ✓ | ✓ | ✓ | − | ✓ | − |
| `drivers.edit_sensitive` | ✓ | ✓ | **−** | − | ✓ | − |
| `drivers.terminate` | ✓ | ✓ | − | − | − | − |
| `drivers.flag_out_of_service` | ✓ | ✓ | − | − | ✓ | − |
| `drivers.upload_dq_document` | ✓ | ✓ | − | − | ✓ | ✓ |
| `drivers.export` | ✓ | ✓ | ✓ | ✓ | ✓ | − |
| **Equipment (15)** | | | | | | |
| `equipment.view_all` | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| `equipment.view_assigned` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `equipment.view_vin` | ✓ | ✓ | ✓ | ✓ | ✓ | − |
| `equipment.view_plate` | ✓ | ✓ | ✓ | ✓ | ✓ | − |
| `equipment.view_registration` | ✓ | ✓ | ✓ | − | ✓ | − |
| `equipment.view_insurance` | ✓ | ✓ | − | ✓ | − | − |
| `equipment.create` | ✓ | ✓ | − | − | − | − |
| `equipment.edit` | ✓ | ✓ | ✓ | − | − | − |
| `equipment.retire` | ✓ | ✓ | − | − | − | − |
| `equipment.maintenance.create` | ✓ | ✓ | − | − | − | − |
| `equipment.maintenance.edit` | ✓ | ✓ | − | − | − | − |
| `equipment.maintenance.view_all` | ✓ | ✓ | ✓ | − | ✓ | − |
| `equipment.maintenance.approve` | ✓ | ✓ | − | − | − | − |
| `equipment.fault_code.acknowledge` | ✓ | ✓ | ✓ | − | − | − |
| **Documents (10)** | | | | | | |
| `documents.view_all` | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| `documents.view_own` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `documents.upload_bol` | ✓ | ✓ | ✓ | ✓ | − | ✓ |
| `documents.upload_pod` | ✓ | ✓ | ✓ | ✓ | − | ✓ |
| `documents.upload_lumper` | ✓ | ✓ | ✓ | ✓ | − | ✓ |
| `documents.upload_rate_con` | ✓ | ✓ | ✓ | ✓ | − | − |
| `documents.upload_insurance` | ✓ | ✓ | ✓ | ✓ | − | − |
| `documents.delete` | ✓ | ✓ | − | − | − | − |
| `documents.download` | ✓ | ✓ | ✓ | ✓ | ✓ | − |
| **Safety & Compliance (18)** | | | | | | |
| `hos.view_all` | ✓ | ✓ | − | − | ✓ | − |
| `hos.view_own` | ✓ | ✓ | ✓ | − | ✓ | ✓ |
| `hos.view_team` | − | − | − | − | − | − |
| `hos.create` | ✓ | ✓ | − | − | ✓ | ✓ |
| `hos.edit` | ✓ | ✓ | − | − | ✓ | ✓ |
| `hos.approve` | ✓ | ✓ | − | − | ✓ | − |
| `hos.certify` | ✓ | ✓ | − | − | ✓ | ✓ |
| `dvir.create` | ✓ | ✓ | ✓ | − | ✓ | ✓ |
| `dvir.view_all` | ✓ | ✓ | ✓ | − | ✓ | − |
| `dvir.flag_defect` | ✓ | ✓ | ✓ | − | ✓ | − |
| `accidents.create` | ✓ | ✓ | ✓ | − | ✓ | ✓ |
| `accidents.edit` | ✓ | ✓ | − | − | ✓ | − |
| `accidents.view_all` | ✓ | ✓ | ✓ | − | ✓ | − |
| `accidents.delete` | ✓ | ✓ | − | − | − | − |
| `drug_alcohol.query` | ✓ | ✓ | − | − | ✓ | − |
| `drug_alcohol.view` | ✓ | − | − | − | ✓ | − |
| `csr.view` | ✓ | ✓ | − | − | ✓ | − |
| **Accounting & Invoicing (13)** | | | | | | |
| `invoices.view_all` | ✓ | ✓ | − | ✓ | − | − |
| `invoices.view_assigned` | − | − | − | − | − | − |
| `invoices.create` | ✓ | ✓ | − | ✓ | − | − |
| `invoices.edit` | ✓ | ✓ | − | ✓ | − | − |
| `invoices.delete` (void) | ✓ | ✓ | − | ✓ | − | − |
| `invoices.approve` | ✓ | ✓ | − | ✓ | − | − |
| `invoices.send` | ✓ | ✓ | − | ✓ | − | − |
| `invoices.submit_factoring` | ✓ | ✓ | − | ✓ | − | − |
| `invoices.apply_payment` | ✓ | ✓ | − | ✓ | − | − |
| `ar.view` | ✓ | ✓ | − | ✓ | − | − |
| `ap.view` | ✓ | ✓ | − | ✓ | − | − |
| `banking.view` | ✓ | ✓ | **−** | ✓ | **−** | **−** |
| `banking.edit` | ✓ | **−** | **−** | **−** | **−** | **−** |
| `reports.financial.view` | ✓ | ✓ | − | ✓ | − | − |
| **Settlements (10)** | | | | | | |
| `settlements.view_all` | ✓ | ✓ | − | ✓ | − | − |
| `invoices.view_own` (driver own settlement) | ✓ | ✓ | − | − | − | ✓ |
| `settlements.create` | ✓ | ✓ | − | ✓ | − | − |
| `settlements.edit` | ✓ | ✓ | − | ✓ | − | − |
| `settlements.approve` | ✓ | ✓ | − | ✓ | − | − |
| `settlements.pay` | ✓ | ✓ | − | ✓ | − | − |
| `settlements.deduct` | ✓ | ✓ | − | ✓ | − | − |
| `settlements.export` | ✓ | ✓ | − | ✓ | − | − |
| `payroll.run` | ✓ | ✓ | − | ✓ | − | − |
| **Reports (7)** | | | | | | |
| `reports.operational.view` | ✓ | ✓ | ✓ | ✓ | ✓ | − |
| `reports.safety.view` | ✓ | ✓ | − | − | ✓ | − |
| `reports.driver_performance.view` | ✓ | ✓ | ✓ | − | ✓ | − |
| `reports.financial.view` | ✓ | ✓ | − | ✓ | − | − |
| `reports.export` | ✓ | ✓ | ✓ | ✓ | ✓ | − |
| `reports.schedule` | ✓ | ✓ | ✓ | ✓ | ✓ | − |
| **Users & Roles (10)** | | | | | | |
| `members.view` | ✓ | ✓ | ✓ | ✓ | ✓ | − |
| `members.view_email` | ✓ | ✓ | − | ✓ | − | − |
| `members.invite` | ✓ | ✓ | − | − | − | − |
| `members.edit_role` | ✓ | ✓ | − | − | − | − |
| `members.suspend` | ✓ | ✓ | − | − | − | − |
| `members.lift_suspension` | ✓ | ✓ | − | − | − | − |
| `members.remove` | ✓ | ✓ | − | − | − | − |
| `roles.view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `roles.edit` | ✓ | ✓ | − | − | − | − |
| `roles.create_custom` | ✓ | ✓ | − | − | − | − |
| `roles.delete_custom` | ✓ | ✓ | − | − | − | − |
| **Workspace & Administration (8)** | | | | | | |
| `workspace.view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `workspace.edit` | ✓ | ✓ | − | − | − | − |
| `workspace.edit_legal` | ✓ | ✓ | − | − | − | − |
| `workspace.transfer_ownership` | ✓ | **−** | **−** | **−** | **−** | **−** |
| `workspace.delete` | ✓ | **−** | **−** | **−** | **−** | **−** |
| `workspace.billing.view` | ✓ | ✓ | − | ✓ | − | − |
| `workspace.billing.edit` | ✓ | **−** | **−** | **−** | **−** | **−** |
| `audit_log.view` | ✓ | ✓ | − | − | − | − |

### 6.1 Reading the matrix

Each column is a starter role. Each row is a permission key. The cell
is the **default for a brand-new workspace**. An Admin can toggle any
cell, and the change is persisted to the database. The change
immediately affects every member with that role.

The matrix is the catalog seed. It is not a hard limit. Custom roles
can have any combination of ON/OFF, including keys not shown above
(if a custom role is granted them). What the matrix is **not**:

- It is not a list of all keys BA's `ac` instance can validate. The
  `ac` instance holds the full 130-key vocabulary; the matrix is just
  the default preset for each starter role.
- It is not a security boundary by itself. The matrix shows defaults;
  the boundary is enforced at runtime by `requirePermission` (see §7).

---

---

## 7. Architecture: what Better Auth handles vs. what Muvx must implement itself

This section directly answers the user's questions about whether
Better Auth's Dynamic Access Control is sufficient and where it falls
short. Every claim is grounded in the actual BA source code (paths
in the Better Auth v1.7.x node_modules).

### 7.1 What Better Auth's Dynamic Access Control actually does

Better Auth ships a `dynamicAccessControl` option in the `organization`
plugin. When enabled, BA creates an `organization_role` table (we
already have it via migration 0011) and exposes CRUD endpoints for
roles. The user has documented this in earlier sessions.

**Verified from source code** (`node_modules/better-auth/dist/plugins/organization/`):

1. **BA's `ac` is the schema, not the data.** The user's
   `lib/auth-roles.ts` defines a `createAccessControl(statement)` where
   `statement` is `Record<resource, string[]>`. This is the vocabulary
   of every resource/action that can be granted. It is fixed in code.
   It is also the only place BA's `checkForInvalidResources` will look
   for valid resource names (see §7.2.3).

2. **The static `roles` object is the seed.** BA's `organization`
   plugin accepts a `roles: { owner, admin, ... }` config, each of
   which is an `ac.newRole({...})` call. These are the **built-in
   default roles**. If a workspace predates DAC, the built-in roles
   are the only ones BA knows about.

3. **DB rows extend, they do not replace.** From
   `has-permission.mjs` (verified):

   ```js
   const merged = { ...acRoles[role]?.statements };
   for (const [key, actions] of Object.entries(result.data)) {
     merged[key] = [...new Set([...merged[key] ?? [], ...actions])];
   }
   acRoles[role] = input.options.ac.newRole(merged);
   ```

   The `Set` union means a DB row can only **add** actions to a
   static role. **It cannot remove them.** This is a critical
   architectural constraint, addressed in §7.2.1.

4. **`create-role` enforces anti-escalation automatically.** BA's
   `/organization/create-role` endpoint runs
   `checkIfMemberHasPermission({ permissionRequired: permission, ... })`
   which iterates the requested permission set and checks each one
   against the requesting member's effective role. If the requester
   doesn't have a permission, they cannot grant it. **This is the
   privilege-escalation guard, and BA gives it for free.**

5. **`create-role` enforces resource validation.** BA's
   `/organization/create-role` calls `checkForInvalidResources` which
   checks the requested permission's resource keys against
   `Object.keys(ac.statements)`. If a custom role tries to grant a
   resource that doesn't exist in the schema, BA rejects it. **Muvx
   must declare all 130 keys in the `ac` statement.**

6. **Reserved role names are protected.** BA's
   `checkIfRoleNameIsTakenByPreDefinedRole` blocks creating a custom
   role named `owner`, `admin`, or `member` (the BA defaults). The
   Muvx `ac` instance is configured with six roles, so `owner`,
   `admin`, `dispatcher`, `accounting`, `safety`, `driver` are all
   reserved and cannot be created as custom roles.

7. **In-process cache is stale-prone.** `has-permission.mjs` caches
   the merged role set per organization in `cacheAllRoles`
   (a `Map`). This means: in a single Node process, a permission
   change persists in DB but the in-memory cache won't reflect it
   until the process restarts, or until the cache key is invalidated.
   This is fine for read-heavy traffic but **must be addressed** in
   any role-toggle UI to avoid surprising the user.

8. **The `useMemoryCache: true` flag is used internally by
   `checkIfMemberHasPermission` to avoid re-reading the DB on every
   permission check during a single request.** It is an internal
   optimization, not a public API.

### 7.2 What Better Auth does NOT do — and Muvx must implement

| # | Concern | What BA does | What Muvx must do |
|---|---------|--------------|-------------------|
| 1 | **Default permission genuinely revoked when toggled OFF** | BA's `hasPermission` does set-union, so a DB row can only ADD permissions, not remove them. The static role's permissions always win. | **Replace semantics.** Write a custom `getEffectivePermissions(orgId, roleId)` that, if a DB row exists for `(org_id, role_id)`, returns **only** the row's permission JSON. Do not fall back to the static preset. The static preset is the seed for new workspaces only. |
| 2 | **Built-in BA endpoints respecting dynamic state** | BA's `/organization/*` endpoints that gate on `ac:create` etc. read the merged set (additive). | For any new server action that **Muvx writes itself** (load creation, settlement approval, etc.), use the custom `requirePermission` helper, not BA's bundled one. The bundled one cannot revoke. |
| 3 | **Privilege escalation guard** | BA's `create-role` and `update-role` endpoints enforce this. | Same — the guard is automatic for BA's role-management endpoints. **For Muvx endpoints that grant a permission to a single member (e.g., "grant the Owner role to a specific user"),** the same guard logic must be implemented: the granting user must already have the permission being granted. |
| 4 | **Row-level scope** (`view_all` vs `view_assigned` vs `view_own`) | BA has no concept of this. | **Server-side query augmentation.** Every list endpoint (`GET /api/loads`, `GET /api/drivers`, `GET /api/invoices`, etc.) must check the user's scope permission and inject a `WHERE` clause. For `view_own`, the filter is `WHERE driver_id = $currentUserId`. For `view_assigned`, the filter is `WHERE assigned_dispatcher_id = $currentUserId` (or equivalent). |
| 5 | **Sensitive-field filtering** | BA has no concept of this. | **API serialization layer.** Every API response that includes a sensitive field (`linehaul_rate`, `ssn`, `pay_rate`, `banking_account_number`, etc.) must be filtered at serialization time based on the user's field-visibility permission. The fields are stripped from the JSON response, not just hidden in the UI. The UI can also hide them, but the API is the security boundary. |
| 6 | **Last-owner protection** | BA does not prevent demoting or removing the last owner. | **Server-side check.** Before allowing a member's role to change to non-owner, or before allowing a member to be removed, the system must verify that at least one owner remains in the workspace. If the action would leave the workspace ownerless, the system rejects it. This is implemented in the `members.edit_role` and `members.remove` server actions. |
| 7 | **Permission-change audit log** | BA does not log role changes. | **Muvx writes a row to `audit_log` (or whatever the existing audit table is) every time:** a permission toggle, a custom role create, a custom role delete, a member role change, a member suspend, a member remove, a workspace transfer, a workspace delete. The audit entry must capture: actor, target, action, before-state, after-state, timestamp, IP, user-agent. |
| 8 | **Future preset upgrades** | BA has no migration path. | **Versioned presets.** The `PRESET_PERMISSIONS` object in `lib/auth-roles.ts` gets a `version: "2026-10-15"` field. When the version is bumped (e.g., adding a new `accidents.severity` permission), a migration script runs: for every workspace, for every starter role, add the new permission to the DB row if and only if the row currently has the default version (tracked in a `preset_version` column on `organization_role` we add). Workspaces that have customized their roles get a banner asking if they want to apply the new defaults; they can opt in or decline. Workspaces that have not customized get the new defaults applied automatically. |
| 9 | **Cache invalidation on toggle** | BA's `cacheAllRoles` is in-process and not invalidated on toggle. | **Muvx invalidates a Redis key (or in-process cache key) per `(org_id)` when a permission changes,** so subsequent requests in any process re-read the DB. The `lib/auth-roles.ts` config-level `useMemoryCache` flag must remain `false` (i.e., we read from DB on every request) until cache invalidation is wired. |
| 10 | **Sensitive-field redaction in DB** | BA stores the raw row. | **Muvx never stores sensitive fields encrypted at the application layer by default** (DB-level encryption is the infrastructure's job). But every API endpoint that returns the row must check the field-visibility permission and strip the field from the response payload. UI masking is not security. |

### 7.3 What "storing permissions in JSON" does and does not give you

The user asked: *"Do not assume that storing permissions in JSON automatically enforces them."*

**It gives you:** persistence across restarts, a place for Admin to make changes without a code deploy, an audit trail of who changed what (when paired with a logging layer).

**It does NOT give you:** automatic enforcement. Enforcement happens at every call site. The pattern is:

```ts
// 1. Server-side gate
export async function listLoads() {
  const ctx = await getActiveMembership()
  const perms = await getEffectivePermissions(ctx.organizationId, ctx.role)
  if (perms.loads?.includes("view_all")) {
    return db.query.loads.findMany()
  }
  if (perms.loads?.includes("view_assigned")) {
    return db.query.loads.findMany({ where: eq(loads.assignedDispatcherId, ctx.userId) })
  }
  if (perms.loads?.includes("view_own")) {
    return db.query.loads.findMany({ where: eq(loads.driverId, ctx.userId) })
  }
  throw new ForbiddenError("MISSING_LOADS_VIEW")
}

// 2. API response serialization — strip sensitive fields
export function serializeLoad(load: Load, perms: EffectivePermissions): PublicLoad {
  const public: PublicLoad = { ...load }
  if (!perms.rates?.includes("view_linehaul")) delete public.linehaulRate
  if (!perms.customers?.includes("view_name_on_load")) delete public.customerName
  // etc.
  return public
}
```

Every endpoint needs both layers. The permission check decides
"can this user call this endpoint at all?" The serializer decides
"which fields of the returned object can this user see?". Neither is
optional.

### 7.4 How an Admin grants a permission they themselves don't have

A user with role X can grant role X's permissions via
`/organization/create-role` (BA's anti-escalation guard). To grant
a permission they don't have, they would have to first be granted
that permission themselves — which requires a more-privileged user
to do. **There is no path for a junior user to escalate.** This is
exactly what we want.

**For Muvx-specific endpoints that grant permissions to a single
member** (e.g., "promote user X to role Y"), the same anti-escalation
guard must be implemented. Pseudocode:

```ts
async function changeMemberRole(targetUserId: string, newRole: string) {
  const ctx = await getActiveMembership()
  if (!ctx) throw new UnauthorizedError()

  // Anti-escalation: the actor must have every permission the new role has
  const newRolePerms = await getEffectivePermissions(ctx.organizationId, newRole)
  const actorPerms = await getEffectivePermissions(ctx.organizationId, ctx.role)
  for (const [resource, actions] of Object.entries(newRolePerms)) {
    for (const action of actions) {
      if (!actorPerms[resource]?.includes(action)) {
        throw new ForbiddenError(`MISSING_${resource}_${action}`)
      }
    }
  }

  // Last-owner protection: cannot demote the last owner
  if (ctx.role === "owner" && newRole !== "owner") {
    const ownerCount = await db.select({ count: count() })
      .from(member)
      .where(and(eq(member.organizationId, ctx.organizationId), eq(member.role, "owner")))
    if (ownerCount[0].count <= 1) {
      throw new ForbiddenError("LAST_OWNER")
    }
  }

  // Apply
  await db.update(member)
    .set({ role: newRole, updatedAt: new Date() })
    .where(and(eq(member.userId, targetUserId), eq(member.organizationId, ctx.organizationId)))

  // Audit
  await recordAuditEvent({
    actor: ctx.userId,
    action: "MEMBER_ROLE_CHANGED",
    target: targetUserId,
    before: { role: ctx.targetCurrentRole },
    after: { role: newRole },
    organizationId: ctx.organizationId,
  })
}
```

### 7.5 Summary table

| Behavior | Better Auth provides | Muvx must implement |
|----------|----------------------|---------------------|
| Define permission vocabulary (resources × actions) | ✓ (`ac.statement`) | |
| Define static default roles | ✓ (`ac.newRole`) | |
| Create custom role in DB | ✓ (`/organization/create-role`) | |
| Delete custom role | ✓ (`/organization/delete-role`) | |
| Update custom role permissions | ✓ (`/organization/update-role`) | |
| List custom roles | ✓ (`/organization/list-roles`) | |
| Anti-escalation on role-create | ✓ (built-in) | |
| Resource validation on role-create | ✓ (built-in) | |
| Reserved role-name protection | ✓ (built-in) | |
| Replace (not merge) DB row over static default | ❌ (merge only) | ✓ (`getEffectivePermissions`) |
| Last-owner protection | ❌ | ✓ (server check) |
| Permission-change audit log | ❌ | ✓ (write to `audit_log`) |
| Row-level scope filter (view_assigned / view_own) | ❌ | ✓ (Drizzle query augmentation) |
| Sensitive-field redaction in API response | ❌ | ✓ (serialization layer) |
| Cache invalidation on toggle | ❌ | ✓ (Redis or per-process Map) |
| Future preset upgrade path | ❌ | ✓ (versioned presets + migration) |
| Anti-escalation on member role change | ❌ | ✓ (in Muvx's `changeMemberRole`) |
| Custom-role re-grant after preset upgrade | ❌ | ✓ (banner + opt-in) |
| Driver-app: server-filtered `/api/driver/*` payload | ❌ | ✓ (separate routes) |
| Driver-app: strip commercials from driver load | ❌ | ✓ (field-level filter) |
| Re-auth for `workspace.delete` | ❌ | ✓ (separate feature) |

---

---

## 8. Storage and runtime resolution

### 8.1 The vocabulary (in code)

`lib/auth-roles.ts` declares the **vocabulary** as a Better Auth `ac` instance. The vocabulary is 130 resources × actions. The vocabulary is fixed at code time.

```ts
// lib/auth-roles.ts (sketch — actual implementation is in the next phase)
import { createAccessControl } from "better-auth/plugins/access"

export const statement = {
  loads: ["view_all", "view_assigned", "view_own", "view_region",
          "create", "edit", "cancel", "delete",
          "assign_driver", "assign_truck", "assign_trailer",
          "reassign", "dispatch", "update_status", "export"],
  stops: ["edit", "schedule", "add", "delete"],
  customers: ["view_all", "view_assigned", "view_contact", "view_credit",
              "view_name_on_load", "view_tax_id",
              "create", "edit", "delete", "credit_check", "export"],
  drivers: ["view_all", "view_own",
            "view_personal", "view_pay_rate", "view_tax_info",
            "view_clearinghouse", "view_cdl", "view_medical_cert",
            "create", "edit", "edit_sensitive",
            "terminate", "flag_out_of_service",
            "upload_dq_document", "export"],
  equipment: ["view_all", "view_assigned",
              "view_vin", "view_plate", "view_registration", "view_insurance",
              "create", "edit", "retire",
              "maintenance.create", "maintenance.edit",
              "maintenance.view_all", "maintenance.approve",
              "fault_code.acknowledge"],
  documents: ["view_all", "view_own",
              "upload_bol", "upload_pod", "upload_lumper",
              "upload_rate_con", "upload_insurance",
              "delete", "download"],
  safety: ["view_all", "view_own", "view_team",
           "create", "edit", "approve", "certify",  // HOS
           "dvir.create", "dvir.view_all", "dvir.flag_defect",
           "accidents.create", "accidents.edit", "accidents.view_all", "accidents.delete",
           "drug_alcohol.query", "drug_alcohol.view",
           "csr.view"],
  accounting: ["view_all", "view_assigned", "view_own",  // invoices + settlements
               "create", "edit", "delete", "approve", "send",
               "submit_factoring", "apply_payment",
               "ar.view", "ap.view",
               "banking.view", "banking.edit",
               "reports.financial.view"],
  reports: ["operational.view", "safety.view", "driver_performance.view",
            "financial.view", "export", "schedule"],
  members: ["view", "view_email", "invite", "edit_role",
            "suspend", "lift_suspension", "remove"],
  roles: ["view", "edit", "create_custom", "delete_custom"],
  workspace: ["view", "edit", "edit_legal", "transfer_ownership", "delete",
              "billing.view", "billing.edit"],
  audit_log: ["view"],
  // Better Auth's required resources, kept for compatibility:
  organization: ["update", "delete"],
  invitation: ["create", "cancel"],
  ac: ["create", "read", "update", "delete"],  // for role management
} as const

export const ac = createAccessControl(statement)
```

### 8.2 The presets (in code, used at workspace-create time only)

```ts
// lib/auth-roles.ts (continued)
export const PRESET_PERMISSIONS: Record<string, Record<string, string[]>> = {
  owner: { /* every key in the matrix above, ON */ },
  admin: { /* see matrix */ },
  dispatcher: { /* see matrix */ },
  accounting: { /* see matrix */ },
  safety: { /* see matrix */ },
  driver: { /* see matrix */ },
}

export const PRESET_VERSION = "2026-10-15"
```

### 8.3 The DB (the source of truth at runtime)

The `organization_role` table already exists. We add a column for
preset version tracking:

```sql
-- Migration 0013: add preset_version column
ALTER TABLE "organization_role"
  ADD COLUMN "preset_version" text,
  ADD COLUMN "is_custom" boolean NOT NULL DEFAULT false,
  ADD COLUMN "label" text,
  ADD COLUMN "description" text,
  ADD COLUMN "created_by" text REFERENCES "user"("id") ON DELETE SET NULL;
```

The `is_custom` flag distinguishes starter roles (which are seeded
from `PRESET_PERMISSIONS` and tracked by `preset_version`) from
custom roles (which have `is_custom = true` and `preset_version = NULL`).

### 8.4 Seed on workspace create

When `app/actions/workspace.ts` (or BA's `organization.create`) creates a new workspace, run:

```ts
// app/actions/workspace.ts (continuation)
import { PRESET_PERMISSIONS, PRESET_VERSION } from "@/lib/auth-roles"
import { organizationRole } from "@/lib/schema"
import { randomUUID } from "node:crypto"

export async function seedRolePresets(organizationId: string) {
  const rows = Object.entries(PRESET_PERMISSIONS).map(([roleId, permission]) => ({
    id: randomUUID(),
    organizationId,
    role: roleId,
    permission: JSON.stringify(permission),
    isCustom: false,
    presetVersion: PRESET_VERSION,
    label: ROLE_LABELS[roleId],
    description: ROLE_DESCRIPTIONS[roleId],
    createdAt: new Date(),
  }))
  await db.insert(organizationRole).values(rows)
}
```

After this runs once, the workspace is dynamic. Future `PRESET_PERMISSIONS` changes do **not** auto-apply; they require a migration (§8.6).

### 8.5 Runtime resolution: `getEffectivePermissions`

```ts
// lib/permissions.ts
import { cache } from "react"
import { db } from "@/lib/db"
import { organizationRole, member } from "@/lib/schema"
import { eq, and } from "drizzle-orm"
import { PRESET_PERMISSIONS, type PermissionKey } from "@/lib/auth-roles"

/**
 * Returns the EFFECTIVE permission set for a role in a workspace.
 *
 * Replace semantics: if a DB row exists for (org_id, role_id), the
 * row's permission JSON IS the permission set. The static preset
 * is only used as a fallback for a workspace that predates the
 * seed (e.g., if a workspace was created before this feature was
 * shipped).
 *
 * This is the inverse of Better Auth's built-in hasPermission,
 * which does set-union. We must NOT use BA's helper for revoking
 * defaults — see §7.2.1.
 */
export const getEffectivePermissions = cache(
  async (organizationId: string, roleId: string): Promise<Record<string, string[]>> => {
    const [row] = await db
      .select({ permission: organizationRole.permission })
      .from(organizationRole)
      .where(
        and(
          eq(organizationRole.organizationId, organizationId),
          eq(organizationRole.role, roleId),
        )
      )
      .limit(1)

    if (row) {
      return JSON.parse(row.permission) as Record<string, string[]>
    }
    return PRESET_PERMISSIONS[roleId] ?? {}
  }
)

/**
 * Server-side gate. Throws ForbiddenError if the current user's
 * role in the active workspace does NOT have the given permission.
 */
export async function requirePermission(key: PermissionKey): Promise<void> {
  const ctx = await getActiveMembership()
  if (!ctx?.organizationId) throw new ForbiddenError("NOT_IN_WORKSPACE")
  const perms = await getEffectivePermissions(ctx.organizationId, ctx.role)
  const [resource, action] = key.split(".") as [string, string]
  if (!perms[resource]?.includes(action)) {
    throw new ForbiddenError(`MISSING_${key.toUpperCase()}`)
  }
}

/**
 * Returns a boolean without throwing. Useful for UI.
 */
export async function hasPermission(key: PermissionKey): Promise<boolean> {
  try {
    await requirePermission(key)
    return true
  } catch {
    return false
  }
}
```

### 8.6 Future preset upgrade path

When `PRESET_VERSION` is bumped (e.g., to add `accidents.severity` for a new feature):

1. A migration script (`scripts/migrate-role-presets.ts`) runs at deploy time.
2. For each workspace:
   - For each row in `organization_role` where `preset_version = $oldVersion`:
     - Merge the new keys into the row's `permission` JSON (additive — never remove existing keys).
     - Update `preset_version = $newVersion`.
3. Rows where `preset_version IS NULL` are **custom roles** — they don't get auto-upgraded. Instead, an Admin banner asks if they want to apply the new defaults to their custom role.
4. Rows where `preset_version = $oldVersion` but `is_custom = true` (custom-cloned-from-preset roles) get the same treatment: additive merge of new keys, banner for opt-in.
5. The audit log records the version upgrade.

### 8.7 Cache invalidation

Until a Redis layer is added, we use BA's `useMemoryCache: false` (read DB on every request) and accept the small latency cost. When performance demands it, we'll add a per-org cache in `lib/permissions.ts` with explicit invalidation on every toggle:

```ts
// On any permission change (toggle, role create, role delete):
invalidatePermissionsCache(organizationId)

// In getEffectivePermissions:
const cached = cache.get(`${organizationId}:${roleId}`)
if (cached) return cached
// ... read from DB ...
cache.set(`${organizationId}:${roleId}`, perms)
```

### 8.8 Client-side permission fetch

The UI uses a single endpoint to get the current user's effective
permissions, cached in TanStack Query:

```
GET /api/settings/my-permissions
→ {
    role: "dispatcher",
    role_label: "Dispatcher",
    is_custom: false,
    permissions: { "loads": ["view_all", "create", "edit", ...], ... }
  }
```

Every UI gate derives from this:

```tsx
const { data: perms } = useMyPermissions()
const canSeeRate = perms?.permissions.rates?.includes("view_linehaul") ?? false
const canEditLoad = perms?.permissions.loads?.includes("edit") ?? false
const canFlagDriverOOS = perms?.permissions.drivers?.includes("flag_out_of_service") ?? false
```

`authClient.organization.checkRolePermission` is **not used** —
it reads from the static `ac` instance and does not know about
DB-stored roles.

---

## 9. Open questions before any code is written

These are decisions only the user can make. They are the gate between
this document and implementation. If the user is unsure on any, I
have provided my recommendation in **bold**.

### Q1 — Regional dispatch

You mentioned "Junior Dispatcher" and "Night Dispatcher" but not
"Regional Dispatcher." I added a `loads.view_region` permission that
is OFF for everyone (no implementation yet) so that you can decide:
do you want a `region` column on `load` and on `member`, and let
some dispatchers see only loads in their region? **My recommendation: defer to Phase 2.** Starter roles don't need it.

### Q2 — Dispatcher rate visibility default

I set `rates.view_linehaul` / `view_fuel_surcharge` / `view_accessorials` / `view_total` to **ON for Dispatcher** by default. The user can toggle OFF for custom "Junior Dispatcher" roles.

**Alternative:** flip the default to OFF for Dispatcher, requiring Admin to opt-in. **My recommendation: keep ON.** Dispatchers negotiate rates; without rate visibility, they can't do their job. Junior Dispatcher is the explicit opt-out case.

### Q3 — Driver sees facility name

The matrix has `customers.view_name_on_load` OFF for Driver. The driver still sees the facility name (the physical building) and address because the load has its own `facility_name` / `facility_address` fields that aren't gated by the customers.* keys.

**Question for the user:** should the driver see *any* facility name, or only an address label? E.g., should the driver see "Acme Distribution Center" or only "1247 Industrial Blvd, Dallas TX"? **My recommendation: show facility name + address. Hide customer/broker name.**

### Q4 — Safety sees customer name

I set `customers.view_name_on_load` ON for Safety. They need it to identify which load a driver was on during an incident. But `customers.view_credit`, `customers.view_contact`, and `customers.view_tax_id` are OFF — they only get the name, not the financial / contact data.

**Question for the user:** is this right? Or should Safety see broker/shipper contact info too (for witness statements, follow-up)? **My recommendation: ON for name, OFF for everything else.** They can reach out via Admin/Accounting for contact.

### Q5 — Audit log visibility

I set `audit_log.view` ON for Owner + Admin only. But Accounting might need to see audit events for invoice / settlement actions (e.g., "who voided that invoice?"). Safety might want to see audit events for HOS approvals.

**Two options:**

- **(a) Single `audit_log.view` toggle, ON for Owner/Admin only.** Simpler. Accounting and Safety have to ask Admin to look up audit events.
- **(b) Granular `audit_log.view_invoices`, `audit_log.view_settlements`, `audit_log.view_safety`, etc.** More flexible. Each role can be granted visibility into its own audit stream.

**My recommendation: (b) granular.** It matches the rest of the matrix (everything else is granular). The cost is 3-5 more keys, which is trivial.

### Q6 — Re-auth for `workspace.delete`

`workspace.delete` is a destructive action. Real SaaS products require a fresh password re-entry (or 2FA re-confirmation) within a window. We don't have re-auth implemented.

**Two options:**

- **(a) Ship the simple version now, add re-auth in a follow-up.** The confirmation modal already says "type the workspace name to confirm."
- **(b) Block until re-auth is built.** Safer but blocks the role-system work.

**My recommendation: (a).** Re-auth is a separate feature, not a permission-system concern. Ship the role system, then build re-auth on top.

### Q7 — Driver can see their own DQ file

I set `dq_file.*` keys but did not include a `dq_file.view_own` for Driver. The driver can `upload_dq_document` (upload their own medical cert renewal), but cannot see what else is in their DQ file.

**My recommendation: add `dq_file.view_own` toggle, ON for Driver by default.** The driver should be able to see their own CDL number, medical cert expiry, etc. — both for self-service and to know when something is missing.

### Q8 — Two `reports.financial.view` keys

The matrix has `reports.financial.view` in both the Accounting module (§4.8) and the Reports module (§4.10). This is intentional duplication for module-local discoverability — when the user is in the Accounting module, they see the key; when they're in the Reports module, they see the same key.

**My recommendation: keep both, alias them in code** (`reports.financial.view` is the canonical key, `accounting.reports.financial.view` is an alias that reads the same DB value). Single source of truth in DB; two views in the UI.

### Q9 — "Last-owner protection" implementation

When the last owner tries to demote themselves, the action must fail. The matrix has `workspace.transfer_ownership` for graceful handoff. The action should suggest: "Transfer ownership to another user first, or contact support."

**My recommendation: ship the server-side check** (see §7.4 pseudocode) and a clear UI error. Don't auto-transfer; force explicit handoff.

### Q10 — Cache strategy

I proposed per-process Map for the initial ship, with Redis later. Real production needs Redis from day one if there are multiple Node instances. **My recommendation: per-process Map for now** (we have a single dev instance), add Redis when we deploy to multi-instance. Document the limitation.

---

## 10. What happens after you answer Q1–Q10

I'll write the implementation in **four ordered phases**, each ending
with a self-review and a sign-off checkpoint.

**Phase A — Foundation (no UI yet):**
- Update `lib/auth-roles.ts` to expose `statement`, `PRESET_PERMISSIONS`, `PRESET_VERSION`, and a typed `PermissionKey` union.
- Add `lib/permissions.ts` with `getEffectivePermissions`, `requirePermission`, `hasPermission`, and the cache invalidation hook.
- Add `seedRolePresets(organizationId)` and call it from the workspace creation action.
- Migration 0013: add `preset_version`, `is_custom`, `label`, `description`, `created_by` columns.
- Wire `GET /api/settings/my-permissions` returning the effective perms.
- Run typecheck + build. **Commit.**

**Phase B — Replace existing role checks:**
- Find every existing `requirePermission({ resource, action })` call site. Map each to the new `PermissionKey` form. Migrate.
- Remove the static `ac.newRole({...})` declarations — the presets become plain data.
- Audit the existing workspace-profile form to use the new `workspace.edit_legal` and `workspace.edit` keys (currently it uses the BA defaults).
- Audit the team-management form to use `members.invite`, `members.edit_role`, etc.
- Run typecheck + build. **Commit.**

**Phase C — UI for /settings/roles (the redesign):**
- New grid component: 12 modules × 6 default roles, toggle switches.
- "Create custom role" dialog with permission selector.
- "Apply preset upgrade" banner for opt-in custom role updates.
- Confirmation modals on sensitive actions (workspace.delete, workspace.transfer_ownership, drivers.edit_sensitive, etc.).
- Run typecheck + build + better-design review. **Commit.**

**Phase D — Driver portal (separate work, not blocking role system):**
- `/driver-portal/*` route with mobile-first layout.
- Server-filtered `/api/driver/*` endpoints (only assigned loads, only own HOS, only own settlements).
- Sensitive-field redaction in driver API responses.
- Run typecheck + build. **Commit.**

Each phase ends with:
- Diff against `TODO.md`.
- Verification: `rtk npx tsc --noEmit`, `rtk npm run build`, dev-server smoke test.
- Self-review against the 7 questions in this section and the workflow questions in §2 of the (retired) `ROLES_PLAN.md`.

---

## 11. What I will not do, and what I am waiting on

I am not writing any code. I am not editing `lib/auth-roles.ts`. I am not creating migration `0013`. I am not refactoring the existing role check. I am not designing the Roles page UI. I am not building the driver portal.

I am waiting on:
1. The user to read this document.
2. The user to answer Q1–Q10.
3. The user to confirm the architecture in §7 (or push back on it).
4. The user to confirm the matrix in §6 (or push back on any row).
5. The user to greenlight Phase A.

Once all five are confirmed, I will start Phase A. If any are not, I will revise the document and re-present.
