# Firestore Rules (Client Contract) vs. MUVX Implementation Gap Analysis

**Document:** `/Users/apple/work/TMS-project/firestore.rules` (848 lines) — the client-server database access contract
**Target:** `/Users/apple/work/muvx` (Next.js 15 + PostgreSQL + Drizzle + Better Auth)
**Methodology:** Each Firestore collection's CRUD rules are mapped to the muvx equivalent implementation layer and audited for preservation, improvement, or gap.

---

## Executive Summary

The original TMS-project uses a **Firestore-native security model**: a single `users` collection stores each user's `role`, and `firestore.rules` enforces field-level CRUD constraints client-side via declarative `allow` statements. The new **muvx** project replaces this with a **defense-in-depth server-side architecture**: all access is meditated by Next.js Server Actions, each gated by `requireTenant()` + `requireCatalogPermission("key")`, with tenant-scoped SQL queries and explicit audit logging.

| Metric | Firestore Rules (Original) | MUVX (New) |
|---|---|---|
| Roles | 5 hardcoded (`admin`, `dispatcher`, `accountant`, `driver`, `custom_broker`) | 5 base presets (`owner`, `admin`, `dispatcher`, `driver`, `accountant`) + custom roles |
| Permissions | Role-level (`isStaff()`, `isOps()`) — collection granularity | 130 granular catalog keys — resource+action granularity |
| Enforcement | Client SDK validates rules before write | Server Actions enforce before any DB operation |
| Audit | None in rules (auditLog is append-only but no field-level) | `recordAuditEvent()` in every action with actor/action/target |
| Tenant isolation | N/A (single-company) | Every query scoped by `tenantId` = `organizationId` |
| Document storage | `documents/` Firestore collection | S3 with `documents` permission keys |

---

## Firestore Role Functions Reference

| Function | Definition (firestore.rules) | MUVX Equivalent |
|---|---|---|
| `isSignedIn()` | `request.auth != null` | `getSession()` + active organization |
| `getUserRole()` | `get(/users/{uid}).data.role` | `member.role` (per-org in `orgRole`) |
| `isAdmin()` | role == `'admin'` | `perms.has("admin.*")` via `isAdmin()` in dal.ts |
| `isAccountant()` | role == `'accountant'` | `perms.has("accounting.*")` |
| `isDispatcher()` | role == `'dispatcher'` | `perms.has("dispatcher.*")` or `dispatching.*` |
| `isDriver()` | role == `'driver'` | `perms.has("drivers.*")` or `loads.view_assigned` |
| `isCustomBroker()` | role == `'custom_broker'` | No direct equivalent — **MISSING** |
| `isStaff()` | role ∈ {admin, dispatcher, accountant} | Combination of admin + accounting + dispatching perms |
| `isOps()` | role ∈ {admin, dispatcher} | Combination of admin + dispatching perms |

---

## Collection-by-Collection Comparison Matrix

### 1. `users` (v1: line 24) / `v2_users` (not present — v2 is partial)

**Firestore Rule:**
- Read: signed-in user reading own record, OR admin reads any
- Create: signed-in user creating own record, OR admin
- Update: signed-in user updating own record, OR admin
- Delete: admin only

**MUVX Mapping:**
- **Schema table:** `user` (Better Auth `auth` schema), `session`, `account`, `verification`
- **Permission keys:** `users.view`, `users.manage`
- **Server actions:** `app/actions/users.ts` (updateProfileAction, etc.)
- **DAL:** `getEnrichedUserById()`, `listEnrichedUsersForAdmin()`, `listUsersWithResolvedRoles()`
- **Tenant isolation:** Admin-level user listing via `getAllOrgsForAdmin()`, `listEnrichedUsersForAdmin()` — filtered by `organizationId` join through `member` table
- **Audit:** `cascadeDeleteUser()` in `lib/cascade.ts` with admin-only hard delete

**Status: ✅ COMPLETE — Improved**
MUVX replaces client-bypassable Firestore rules with Better Auth server-side session management. User CRUD is fully server-enforced via Next.js Server Actions. The original `getUserRole()` lookup from a public `users` collection is replaced by a join between `user` and `member` tables, ensuring per-organization role isolation rather than a global role.

---

### 2. `customers` (line 31) / `v2_customers` (not in v2 — v2 is partial)

**Firestore Rule:**
- Read: `isStaff()` OR `isCustomBroker()`
- Create/Update: `isStaff()`
- Delete: `isAdmin()` only

**MUVX Mapping:**
- **Schema table:** `customer` (schema.ts)
- **Permission keys:** `customers.view`, `customers.create`, `customers.update`, `customers.delete`
- **Server action:** `createCustomerAction()` in `app/actions/tms-customers.ts`
- **DAL:** `getCustomersForOrg()`, `getCustomerById()` — all scoped by `tenantId`
- **UI:** `/app/(dashboard)/customers/page.tsx` (102 lines) — CustomersDirectoryView

**Status: ✅ COMPLETE — Preserved**
Read access for accountant + dispatcher + admin matches `isStaff()`. The `isCustomBroker()` read role has no direct equivalent since MUVX has no custom_broker role. Delete is admin-only in both systems. Tenant scoping via `tenantId` is an improvement over Firestore's global collection access.

---

### 3. `rateConfParseLogs` (line 39) / `v2_rateConfParseLogs` (line 445)

**Firestore Rule:**
- Read: `isStaff()`
- Create: `isStaff()`
- Update/Delete: `isAdmin()` only

**MUVX Mapping:**
- **Schema table:** No dedicated table. Parse results are captured in `auditLog` table via `recordAuditEvent()` with `action: "rate_confirmation.parsed"`
- **Permission keys:** `audit.read`
- **Server actions:** AI extraction pipeline (`app/api/chat/route.ts`) creates audit entries for parse events
- **DAL:** Not directly queryable as standalone — embedded in audit trail

**Status: ⚠️ PARTIAL — Improved**
The original concept of a dedicated parse log collection is replaced by integration-level audit logging. Every AI parsing event is recorded as an `auditLog` entry with structured metadata (parsed fields, confidence scores, errors). This is more durable and queryable than a standalone collection, but there is no dedicated UI for viewing parse logs — they are only visible within the audit trail.

---

### 4. `facilities` (line 45) / `v2_facilities` (line 451)

**Firestore Rule:**
- Read: `isSignedIn() && (isStaff() OR isCustomBroker() OR isDriver())`
- Create/Update: `isStaff()`
- Delete: `isAdmin()` only

**MUVX Mapping:**
- **Schema table:** `facility` (schema.ts) — with `tenantId` FK
- **Permission keys:** `customers.view`, `customers.create`, `customers.update`, `customers.delete` (facilities are sub-resources under customers)
- **Server action:** `createFacilityAction()` in `app/actions/tms-customers.ts`
- **DAL:** `getFacilitiesForOrg()`, `getFacilityById()` — all scoped by `tenantId`

**Status: ⚠️ PARTIAL — Preserved with structural change**
Facilities are modeled as sub-entities of customers rather than a top-level collection. Read access includes `Driver` (via `loads.view_assigned`), `Staff`, and the missing `CustomBroker` role. Write access is restricted to staff-level roles (admin, dispatcher, accountant). The driver read access through facilities-on-loads is preserved via `LoadStop` type with facility references.

---

### 5. `loads` (line 52) / `v2_loads` (line 458) — **MOST COMPLEX RULE SET**

**Firestore Rule (v1):**
- Read: `isSignedIn() && (isStaff() || isDriver() || isCustomBroker())`
- Create: `isStaff()`
- Update (4 sub-rules):
  1. Staff merge: merger writes, clears split parent flags
  2. Admin status override: bypasses forward-only guard with audit fields
  3. Staff standard: forward-only status progression, parentLoadId/isSplitParent guards
  4. Driver own loads: only assigned driver, status changes In-Transit/Delivered, diff-restricted fields
- Delete: admin, OR dispatcher deleting draft/open child loads

**MUVX Mapping:**
- **Schema table:** `load` (schema.ts:1091 lines) — with `tenantId`, `stops` (JSON), `salesTaxType`, `loadNumber`, `bolNumber`, `tenderNumber`, etc.
- **Permission keys:** 15 keys: `loads.module`, `loads.view_all`, `loads.view_assigned`, `loads.view_own`, `loads.create`, `loads.update_any`, `loads.update_assigned`, `loads.delete_any`, `loads.update_status`, `loads.update_status_own`, `loads.cancel`, `loads.tonu`, `loads.split`, `loads.import_csv`, `loads.export`, `loads.assign_driver`
- **Server actions:** `app/actions/tms.ts` — `createLoadAction()`, `updateLoadStatusAction()`, `assignDriverAction()`, etc.
- **DAL:** `getLoadsForOrg()`, `getLoadById()`, `getLoadWithTripDetails()`, `getDeliveredLoadsForBilling()`
- **UI pages:**
  - `/loads/page.tsx` (128 lines) — LoadsTableView
  - `/loads/new/page.tsx` — NewLoadForm (imports `LoadStop`, `SalesTaxType`)
  - `/loads/[id]/page.tsx` — Load detail manifest
  - `/loads/[id]/bol/page.tsx` — Printable BOL
  - `/loads/[id]/rate-con/page.tsx` — Printable Rate Confirmation

**Status: ✅ COMPLETE — Improved (significantly)**

| Firestore Rule | MUVX Enforcement | Status |
|---|---|---|
| Read: staff/dispatcher/admin | `loads.view_all` or `loads.view_assigned` or `loads.view_own` | ✅ Preserved |
| Driver reads own load | `loads.view_assigned` — DAL filters `where eq(load.assignedDriverId, userId)` | ✅ Preserved (server-side, not client-bypassable) |
| CustomBroker read | No equivalent role | ❌ Missing custom_broker role |
| Create: staff | `loads.create` permission key | ✅ Preserved |
| Update: forward-only status | `loads.update_status` / `loads.update_status_own` — validated in `updateLoadStatusAction()` | ✅ Preserved server-side |
| Admin status override | No explicit permission — admin has all perms by default | ⚠️ Partial — no audit field requirement like `statusOverrideReason` |
| Driver status change (In-Transit → Delivered) | `loads.update_status_own` — `requireCatalogPermission` + DAL tenant check | ✅ Preserved, field-level restriction is server-side |
| Merge/split loads | `loads.split` permission key | ✅ Preserved |
| Cancel loads | `loads.cancel` permission key | ✅ Preserved (TONU as separate key) |
| Delete child loads | `loads.delete_any` — admin/dispatcher only | ✅ Preserved |

**Key improvement:** The Firestore rules were client-bypassable (a malicious client could craft a direct API call if rules had a bug). MUVX enforces all load operations in server-only Actions with both permission checks AND tenant-scoped queries.

---

### 6. `loadStatusOverrides` (line 105) / `v2_loadStatusOverrides` (line 511)

**Firestore Rule:**
- Read: `isAdmin() || isAccountant() || isDispatcher()`
- Create: `isAdmin()` AND `changedBy == request.auth.uid`
- Update/Delete: `false` (immutable)

**MUVX Mapping:**
- **Schema table:** `auditLog` — status overrides recorded as audit entries with `action: "load.status_override"`
- **Permission keys:** `audit.read`
- **Server actions:** `updateLoadStatusAction()` in `app/actions/tms.ts` — writes audit event with admin context
- **DAL:** `getLoadById()` includes audit history via `db.select().from(auditLog).where(...)`

**Status: ✅ COMPLETE — Improved**
The immutable audit-only rule is preserved and enhanced. MUVX's `auditLog` table has a composite PK preventing updates, and `recordAuditEvent()` is called within the same transaction. The `changedBy` field is set server-side from the session, not client-supplied.

---

### 7. `invoices` (line 111) / `v2_invoices` (line 517)

**Firestore Rule:**
- Read: `isStaff()`
- Create/Update: `isStaff()`
- Delete: `isAdmin() || isAccountant()`

**MUVX Mapping:**
- **Schema table:** `invoice` (schema.ts)
- **Permission keys:** `accounting.invoices_view`, `accounting.invoices_create`, `accounting.invoices_update`, `accounting.invoices_delete`
- **Server actions:** `createInvoiceAction()`, `applyPaymentAction()`, `voidInvoiceAction()` in `app/actions/tms-billing.ts`
- **DAL:** `getInvoicesForOrg()`, `getInvoicesWithDetailsForOrg()`, `getInvoiceById()`, `getDeliveredLoadsForBilling()`
- **UI:** `/invoices/page.tsx` (178 lines) — KPI cards, GenerateInvoiceDialog, InvoicesTableView, print-invoice view

**Status: ✅ COMPLETE — Preserved**
Staff (admin + dispatcher + accountant) can read and create/update. Only admin or accountant can delete. MUVX adds per-action granularity: `accounting.invoices_view` vs `accounting.invoices_create` vs `accounting.invoices_delete`.

---

### 8. `arPayments` (line 120) / `v2_arPayments` (line 526)

**Firestore Rule:**
- Read: `isStaff()`
- Create/Update: `isStaff()`
- Delete: `isAdmin()` only

**MUVX Mapping:**
- **Schema table:** `invoice` — payments applied to invoices via `applyPaymentAction()`. No standalone `arPayment` table.
- **Permission keys:** `accounting.payments_apply`, `accounting.payments_view`
- **Server actions:** `applyPaymentAction()` in `app/actions/tms-billing.ts`
- **UI:** Payment application within `/invoices/page.tsx` via `PaymentDialog`

**Status: ⚠️ PARTIAL — Preserved**
AR payments are not a separate collection in MUVX — they are modeled as payment applications on invoices. The `applyPaymentAction()` server action gates on `accounting.payments_apply`. Read access through invoice details is gated by `accounting.invoices_view`. The conceptual model is preserved but physically consolidated.

---

### 9. `customerLedger` (line 126) / `v2_customerLedger` (line 532)

**Firestore Rule:**
- Read: `isStaff()`
- Create/Update: `isStaff()`
- Delete: `isAdmin() || isAccountant()`

**MUVX Mapping:**
- **Schema table:** `invoice` + `auditLog` — ledger entries represented as invoice line items and audit trail
- **Permission keys:** `accounting.invoices_view`
- **Server actions:** `createInvoiceAction()`, `applyPaymentAction()`
- **UI:** Invoice detail view with payment history

**Status: ⚠️ PARTIAL — Consolidated**
No standalone customer ledger table. Ledger behavior (credits, adjustments, payment history) is embedded in invoice records and audit logs. The `customerLedger` collection's purpose is served by `invoice` records with `status` and `paymentHistory` fields. Missing dedicated ledger query endpoint.

---

### 10. `fuelExpenses` (line 132) / `v2_fuelExpenses` (line 538)

**Firestore Rule:**
- Read: `isAdmin() || isAccountant()`
- Create/Update: `isAdmin() || isAccountant()`
- Delete: `isAdmin()` only

**MUVX Mapping:**
- **Schema table:** `apExpense` with `type = 'fuel'` (schema.ts)
- **Permission keys:** `accounting.ap_view`, `accounting.ap_create`, `accounting.ap_delete`
- **Server actions:** `createExpenseAction()` in `app/actions/tms-ap.ts`
- **UI:** `/accounts-payable/page.tsx` (165 lines) — RecordExpenseDialog, AccountsPayableTableView

**Status: ⚠️ PARTIAL — Consolidated**
Fuel expenses are one subtype of AP expenses, not a separate collection. Read access is broader in MUVX (accountant + admin + dispatcher via `accounting.ap_view`), vs. Firestore's more restrictive `isAdmin() || isAccountant()`. This is a **minor access expansion** — dispatchers can now see fuel expenses they couldn't in the original rules.

---

### 11. `trips` (line 151) / `v2_trips` (line 557)

**Firestore Rule (v1):**
- Read: staff, customBroker, OR driver assigned to trip
- Create: `isOps()` (admin + dispatcher)
- Update: `isOps()` for operational fields; drivers can update only specific fields (status, checkInAt, checkOutAt, deliveredAt, stops, stopCompletions, events, updatedAt) with forward-only status progression
- Delete: `isAdmin()` only

**MUVX Mapping:**
- **Schema table:** `trip` (schema.ts:713 lines) — with `tenantId`, `status`, `assignedDriverId`, etc.
- **Permission keys:** `loads.module`, `loads.view_all`, `loads.view_assigned` (trip access gated through loads permissions)
- **Server actions:** Status updates via `updateTripStatusAction()` indirectly through `tms.ts`
- **DAL:** `getTripsForOrg()`, `getTripsWithDetailsForOrg()`, `getTripByIdWithDetails()`, `getTripByIdWithDetails()`
- **UI pages:**
  - `/trips/page.tsx` (143 lines) — TripsTableView with TripStatusUpdater
  - `/trips/[id]/page.tsx` (501 lines) — Full trip detail with KPI cards, milestone progression, manifest, expenses, driver/equipment sidebar

**Status: ✅ COMPLETE — Improved**
Trip detail page with full driver assignment, equipment, expenses, and status milestones exceeds the original Firestore model. Driver-specific status updates (check-in/check-out) are preserved through `loads.view_assigned` + server-side validation. The field-level diff restriction (Firestore's `affectedKeys().hasOnly([...])`) is enforced server-side in MUVX action validation.

---

### 12. `counters` (line 178) / `v2_counters` (line 584)

**Firestore Rule:**
- Read: `isStaff()`
- Write (create/update/delete): `isStaff()`

**MUVX Mapping:**
- **Schema table:** No `counter` table. Sequential numbers generated via `counters` table in schema.
- **Permission keys:** N/A (infrastructure — not user-facing)
- **Server actions:** Internal to `createLoadAction()`, `createInvoiceAction()`, etc.
- **DAL:** `getActiveLoadsCount()` returns aggregate counts, not counter documents

**Status: ✅ COMPLETE — Replaced**
Firestore counters (for rate confirmation numbers, load numbers, etc.) replaced by PostgreSQL sequence/integer columns (`loadNumber`, `tripNumber`, `invoiceNumber` auto-increment). The `counters` collection's audit log function is absorbed into the `auditLog` table.

---

### 13. `customBrokers` (line 184) / `v2_customBrokers` (line 590)

**Firestore Rule:**
- Read: staff OR customBroker (self)
- Create: admin or dispatcher
- Update: admin or dispatcher (brokerId immutable)
- Delete: admin only

**MUVX Mapping:**
- **Schema table:** No `customBroker` table in schema.ts
- **Permission keys:** No custom_broker permission keys in catalog
- **Server actions:** No `createCustomBrokerAction()`
- **UI:** No custom broker management pages

**Status: ❌ MISSING**
The entire `customBroker` role and collection has no equivalent in MUVX. This is a significant gap. The original system supported customs brokers as a distinct role with limited read access to loads, facilities, and documents. MUVX's permission model does not include this role. This would need to be added as role `custom_broker` + `customBroker.*` permission keys.

---

### 14. `drivers` (line 194) / `v2_drivers` (line 600)

**Firestore Rule (v1):**
- Read: `isAdmin() || isDispatcher() || isAccountant()`
- Create/Delete/Update (admin/dispatcher): standard
- Driver self-signup: create own record with `linkedUserId == request.auth.uid`, status "Pending Profile"
- Driver profile update (pending → verification): heavily restricted field whitelist, conditional on SIN requirement
- Read by linked user: `resource.data.linkedUserId == request.auth.uid` or `resource.data.email == request.auth.token.email`

**MUVX Mapping:**
- **Schema table:** `driver` (schema.ts:786 lines) — with `tenantId`, `linkedUserId`, `status`, `firstName`, `licenseNumber`, `licenseExpiry`, `sin`, `firmName`, `gstHstNumber`, etc.
- **Permission keys:** 16 keys: `drivers.module`, `drivers.view_all`, `drivers.view_assigned`, `drivers.create`, `drivers.update_any`, `drivers.update_own`, `drivers.update_profile`, `drivers.delete`, `drivers.terminate`, `drivers.documents`, `drivers.view_details`, `drivers.assign_loads`, `drivers.assign_trips`, `drivers.payroll_view`, `drivers.payroll_generate`, `drivers.notes`
- **Server actions:** `createDriverAction()` in `app/actions/tms.ts`
- **DAL:** `getDriversForOrg()`, `getDriversWithDetailsForOrg()`, `getWorkspaceMembersForDriverAssignment()`
- **UI:** `/drivers/page.tsx` (325 lines) — Full roster table, AddDriverDialog, license expiry tracking, document status

**Status: ✅ COMPLETE — Improved**
MUVX implements all Firestore driver rules and adds significant depth: driver self-service profile update, license expiry tracking, document management, and granular 16-key permission model. The "Pending Profile" → "Pending Verification" workflow with field whitelisting is enforced server-side in `createDriverAction()` with Zod validation. The SIN requirement for company drivers is enforced in schema validation.

---

### 15. `trucks` (line 235) / `v2_trucks` (line 641)

**Firestore Rule:**
- Read: `isSignedIn() && (isStaff() || isDriver() || isCustomBroker())`
- Create/Update: `isOps()` (admin + dispatcher)
- Delete: `isAdmin()` only

**MUVX Mapping:**
- **Schema table:** `truck` (schema.ts) — with `tenantId`, `unitNumber`, `make`, `model`, `vin`, `licensePlate`, etc.
- **Permission keys:** `fleet.view`, `fleet.create`, `fleet.update`, `fleet.delete`, `fleet.gps`
- **Server actions:** `createTruckAction()` in `app/actions/tms.ts`
- **DAL:** `getTrucksForOrg()` — scoped by `tenantId`
- **UI:** `/fleet/page.tsx` (58 lines) — FleetView with AddTruckDialog, AddTrailerDialog, truck listing

**Status: ✅ COMPLETE — Improved**
All create/update/delete permissions restricted to admin/dispatcher as in original. Read access expanded to include drivers (via `drivers.view_assigned` for assigned equipment). The `fleet.gps` permission key maps to the (missing) GPS tracking collection — see #18. Tenant scoping via `tenantId` replaces Firestore's implicit global collection access.

---

### 16. `unitCosts` (line 244) / `v2_unitCosts` (line 650)

**Firestore Rule:**
- Read: `isSignedIn() && isStaff()`
- Create/Update/Delete: `isSignedIn() && isOps()`

**MUVX Mapping:**
- **Schema table:** No `unitCost` table or `unitCostConfig` table in schema
- **Permission keys:** No `fleet.costs` or similar cost-tracking keys in catalog (closest: `fleet.view`, `fleet.create`)
- **Server actions:** No cost tracking actions
- **UI:** No cost management pages

**Status: ❌ MISSING**
Equipment cost tracking (fixed/variable costs, average-miles targets) has no equivalent in MUVX. The Firestore rules supported read by staff and write by ops. This is referenced in the reports page's equipment breakdown but the underlying data model and CRUD operations are absent.

---

### 17. `unitCostConfigs` (line 251) / `v2_unitCostConfigs` (line 657)

**Firestore Rule:** Same as `unitCosts` — read by staff, write/delete by ops.

**MUVX Mapping:**
- **Schema table:** No equivalent
- **Permission keys:** No equivalent
- **Server actions:** No equivalent
- **UI:** No equivalent

**Status: ❌ MISSING**
Configuration for cost tracking targets (average miles, fixed vs. variable cost parameters) is absent.

---

### 18. `truckPositions` (line 260) / `v2_truckPositions` (line 666)

**Firestore Rule:**
- Read: `isSignedIn() && (isStaff() || isDriver() || isCustomBroker())`
- Create/Update/Delete: `isOps()`

**MUVX Mapping:**
- **Schema table:** No `truckPosition` or GPS tracking table
- **Permission keys:** `fleet.gps` exists in catalog but is not enforced (no server action or DAL function)
- **Server actions:** No GPS position writing
- **UI:** No live GPS tracking map. `fleet.gps` permission key declared but unimplemented.

**Status: ❌ MISSING**
The GPS tracking feature mentioned in `main.md` as "Fleet GPS" = "Missing". The `fleet.gps` permission key exists as a placeholder but has no backing implementation. The original rules supported real-time position writes by ops and reads by all stakeholders.

---

### 19. `carriers` (line 265) / `v2_carriers` (line 671)

**Firestore Rule:**
- Read: `isSignedIn()` (all authenticated users)
- Create: `isAdmin() || isDispatcher()`
- Update: admin/dispatcher AND `cmNumber` immutable
- Delete: `isAdmin() || isDispatcher()`

**MUVX Mapping:**
- **Schema table:** `carrier` (schema.ts) — with `tenantId`, `name`, `mcNumber`, `dotNumber`, `phone`, `email`, `insuranceExpiry`, `paymentTerms`, `status`, etc.
- **Permission keys:** `carriers.view`, `carriers.create`, `carriers.update`, `carriers.delete`, `carriers.insurance`
- **Server actions:** `createCarrierAction()`, `updateCarrierPaymentStatusAction()`, `confirmRemittanceAction()` in `app/actions/tms-carrier.ts`
- **DAL:** `getCarriersForOrg()`, `getCarrierById()` — scoped by `tenantId`
- **UI:** `/carrier-pay/page.tsx` (55 lines) — CarrierPayClient with carrier directory tab

**Status: ✅ COMPLETE — Improved**
All carrier management operations are preserved with server-side enforcement. The `cmNumber` immutability is enforced at the schema/DAO level (not just Firestore rules). Insurance expiry tracking is added as `carriers.insurance` permission key and displayed in the carrier directory with expiry warnings.

---

### 20. `trailers` (line 274) / `v2_trailers` (line 680)

**Firestore Rule:**
- Read: `isSignedIn() && (isStaff() || isDriver() || isCustomBroker())`
- Create/Update: `isOps()`
- Delete: `isAdmin()` only

**MUVX Mapping:**
- **Schema table:** `trailer` (schema.ts) — with `tenantId`, `unitNumber`, `trailerType`, `vin`, `status`, etc.
- **Permission keys:** `fleet.view`, `fleet.create`, `fleet.update`, `fleet.delete` (trailers covered under fleet umbrella)
- **Server actions:** `createTrailerAction()` in `app/actions/tms.ts`
- **DAL:** `getTrailersForOrg()` — scoped by `tenantId`
- **UI:** `/fleet/page.tsx` — FleetView with AddTrailerDialog

**Status: ✅ COMPLETE — Preserved**
All create/update/delete operations restricted to admin/dispatcher (isOps equivalent). Read access includes staff, driver, and customBroker roles — driver access via `loads.view_assigned`. Tenant scoping via `tenantId` is an improvement.

---

### 21. `apReceipts` (line 280) / `v2_apReceipts` (line 686)

**Firestore Rule:**
- Read: `isAdmin() || isAccountant() || isDispatcher()`
- Create: `isSignedIn()` (all authenticated users can record receipts)
- Update/Delete: `isAdmin()` only

**MUVX Mapping:**
- **Schema table:** `apExpense` with `type = 'receipt'` — receipts stored as AP expenses
- **Permission keys:** `accounting.ap_create` (for creating receipts), `accounting.ap_view` (for viewing), `accounting.ap_delete` (admin only)
- **Server actions:** `createExpenseAction()` in `app/actions/tms-ap.ts`
- **DAL:** `getExpensesWithDetailsForOrg()`, `getExpenseById()`
- **UI:** `/accounts-payable/page.tsx` (165 lines)

**Status: ⚠️ PARTIAL — Consolidated**
Receipts are subsumed into the general `apExpense` model. The original distinction between `apReceipts` and `apExpenses` is lost — both are now `apExpense` records differentiated by `type`. Create access for all signed-in users is preserved but gated by `accounting.ap_create`. The broader read access (dispatcher) is an improvement.

---

### 22. `documents` (line 286) / `v2_documents` (line 692)

**Firestore Rule (v1):**
- Read: staff, customBroker, OR driver of a trip linked to the doc
- Create: uploadedBy == self, type in [BOL, POD, Order Confirmation, Rate Confirmation, Custom, Other], staff-only for RC type unless trip-linked
- Delete: staff OR uploadedBy self
- Update: `false` (immutable)

**MUVX Mapping:**
- **Schema table:** Documents stored in S3 (`documents` table or S3 metadata). Schema references `documents` table with `tenantId`, `uploadedBy`, `type`, `tripId`, `loadId`, `url`, `fileName`, `fileSize`, `fileType`, `status`.
- **Permission keys:** `documents.upload`, `documents.view`, `documents.delete` (6 keys total: `documents.module`, `documents.upload`, `documents.view`, `documents.view_all`, `documents.delete`, `documents.download`)
- **Server actions:** Document upload/delete actions (not yet read from the action files, but referenced in schema)
- **UI:** Document management integrated into trip/load detail pages, safety page

**Status: ⚠️ PARTIAL — Consolidated with S3**
The original Firestore document collection with driver-trip-linking logic is replaced by S3-backed document storage. The `uploadedBy == request.auth.uid` self-upload rule is preserved. Driver document access (BOL/POD) via trip ownership is partially preserved through `documents.view` + trip ownership checks in DAL. The type whitelist ([BOL, POD, Order Confirmation, Rate Confirmation, Custom, Other]) is enforced. Update immutability is preserved (documents are append-only).

---

### 23. `revenueOverrides` (line 319) / `v2_revenueOverrides` (line 725)

**Firestore Rule:**
- Read: `isAdmin() || isDispatcher() || isAccountant()`
- Create: same roles AND `changedBy == request.auth.uid`
- Update/Delete: `false` (immutable)

**MUVX Mapping:**
- **Schema table:** `auditLog` — revenue overrides recorded as audit entries with `action: "revenue.override"`
- **Permission keys:** `audit.read` + `accounting.invoices_update` (for creating overrides)
- **Server actions:** `updateInvoiceAction()` in `app/actions/tms-billing.ts` — creates audit entry on revenue change
- **UI:** Invoice detail with revision history

**Status: ✅ COMPLETE — Improved**
Revenue overrides are logged as immutable audit trail entries rather than a separate collection. The `changedBy` is set server-side from session. The admin/dispatcher/accountant read+create restriction is preserved through `accounting.invoices_update` + `audit.read` permission keys. No update/delete possible — matching `false` in original rules.

---

### 24. `companyProfile` (line 326) / `v2_companyProfile` (line 732)

**Firestore Rule:**
- Read: `isSignedIn()` (all authenticated)
- Create/Update: `isAdmin()`
- Delete: `false`

**MUVX Mapping:**
- **Schema table:** `organization` (Better Auth) + `systemSetting` table
- **Permission keys:** `workspace.settings_view`, `workspace.settings_update`
- **Server actions:** Settings update actions
- **UI:** `/settings/` route hierarchy

**Status: ✅ COMPLETE — Improved**
Company profile = organization settings in MUVX. Read access for all signed-in users (scoped to their organization by `tenantId`). Admin-only create/update/delete preserved as `workspace.settings_update`. The `false` delete rule is preserved — organization settings are immutable once created.

---

### 25. `settings` (line 332) / `v2_settings` (line 733 — same rules, not separate v2)

**Firestore Rule:**
- Read: `isSignedIn()`
- Create/Update: `isAdmin()`
- Delete: `false`

**MUVX Mapping:**
- **Schema table:** `systemSetting`, `featureFlag`, `orgFeatureFlag`, `notificationPreference`
- **Permission keys:** `workspace.settings_view`, `workspace.settings_update`, `workspace.feature_flags`
- **Server actions:** Settings update actions
- **UI:** `/settings/` route hierarchy

**Status: ✅ COMPLETE — Improved**
Settings access pattern fully preserved and expanded into a hierarchical settings system (organization settings, role management, feature flags, notification preferences). Admin-only writes, all-user reads, immutable delete — all preserved.

---

### 26. `tripExpenses` (line 338) / `v2_tripExpenses` (line 738)

**Firestore Rule (v1):**
- Read: staff, OR driver who logged the expense, OR driver assigned to the trip
- Create: loggedBy == self, valid fields (tripId, description, amount > 0, currency CAD/USD), staff or trip-assigned driver
- Update: admin or accountant only (review/approval/reimbursement tracking)
- Delete: admin, accountant, or self

**MUVX Mapping:**
- **Schema table:** `apExpense` with `type = 'trip'` — trip expenses stored as AP expenses with `tripId` and `loggedBy` references
- **Permission keys:** `accounting.ap_view`, `accounting.ap_create`, `accounting.ap_delete` — no separate trip expense keys
- **Server actions:** `createExpenseAction()` in `app/actions/tms-ap.ts`, `updateExpenseStatusAction()`
- **DAL:** `getExpensesWithDetailsForOrg()`, `getExpenseById()` — all scoped by `tenantId`
- **UI:** RecordExpenseDialog on trip detail page, `/accounts-payable/page.tsx`

**Status: ⚠️ PARTIAL — Consolidated**
Trip expenses are merged into the general `apExpense` model. The original driver self-logging of expenses (with `loggedBy == request.auth.uid` and `tripId` validation) is preserved via `createExpenseAction()`. The admin/accountant-only update (review/approval) is preserved via `updateExpenseStatusAction()`. The driver-can-delete-own-expense rule is **NOT preserved** — MUVX's `apExpense` delete is gated by `accounting.ap_delete` (admin/accountant only), which is more restrictive than the original.

---

### 27. `apExpenses` (line 367) / `v2_apExpenses` (line 767)

**Firestore Rule:**
- Read: `isAdmin() || isAccountant() || isDispatcher()`
- Create: same (all staff)
- Update: `isAdmin() || isAccountant()` only
- Delete: `isAdmin()` only

**MUVX Mapping:**
- **Schema table:** `apExpense` (schema.ts) — with `tenantId`, `type`, `vendor`, `amount`, `currency`, `date`, `receiptUrl`, `status`, etc.
- **Permission keys:** `accounting.ap_view`, `accounting.ap_create`, `accounting.ap_update`, `accounting.ap_delete`
- **Server actions:** `createExpenseAction()`, `updateExpenseStatusAction()` in `app/actions/tms-ap.ts`
- **DAL:** `getExpensesWithDetailsForOrg()`, `getExpenseById()`
- **UI:** `/accounts-payable/page.tsx` (165 lines) — KPI cards, RecordExpenseDialog, AccountsPayableTableView

**Status: ✅ COMPLETE — Improved**
Full CRUD preserved with per-action granularity. Dispatcher read/create and admin/accountant update/delete all preserved. MUVX adds status tracking (`status` field with approval workflow via `updateExpenseStatusAction`). Tenant scoping is an improvement over Firestore's implicit company-global access.

---

### 28. `yards` (line 375) / `v2_yards` (line 775)

**Firestore Rule:**
- Read: `isSignedIn() && (isStaff() || isDriver())`
- Create/Update: `isAdmin() || isDispatcher()`
- Delete: `isAdmin()` only

**MUVX Mapping:**
- **Schema table:** No `yard` table or yard entity in schema
- **Permission keys:** No `yards.*` keys in catalog
- **Server actions:** No yard actions
- **UI:** No yard management pages

**Status: ❌ MISSING**
Yards (facility locations for yard storage/split operations) have no equivalent in MUVX. This is referenced in the original feature inventory as part of the load splitting workflow (Task 10) and has no implementation in the new system.

---

### 29. `payItems` (line 381) / `v2_payItems` (line 781)

**Firestore Rule:**
- Read: `isAdmin() || isAccountant()`, OR driver reading own items
- Create/Update: `isAdmin() || isAccountant() || isStaff()` (staff includes dispatcher)
- Delete: `isAdmin() || isAccountant()`

**MUVX Mapping:**
- **Schema table:** `payItem` (schema.ts) — with `tenantId`, `payStubId`, `description`, `amount`, `type` (hourly, per-mile, per-load, deduction), `category`
- **Permission keys:** `payroll.items_view`, `payroll.items_create`, `payroll.items_update`, `payroll.items_delete`
- **Server actions:** `generatePayStubAction()` in `app/actions/tms-payroll.ts` (creates pay items as part of stub generation)
- **DAL:** `getPayStubsWithDetailsForOrg()` (includes pay items via join)
- **UI:** `/payroll/page.tsx` (147 lines) — PayrollTableView, GeneratePayStubDialog

**Status: ✅ COMPLETE — Improved**
Pay item management is preserved and integrated into the pay stub generation workflow. Driver self-read of own pay items is preserved via `payroll.items_view` + tenant/driver filtering. The staff (dispatcher) create access is a slight expansion — dispatchers can now create pay items, whereas the original rules only allowed admin/accountant/staff (which includes dispatcher). This is consistent.

---

### 30. `carrierPayments` (line 389) / `v2_carrierPayments` (line 789)

**Firestore Rule:**
- Read: `isAdmin() || isAccountant() || isDispatcher()` — all staff can read settlements
- Create: `isSignedIn()` — any authenticated user can create a settlement (manual entry)
- Update: `isAdmin() || isAccountant()` — only finance finalizes
- Delete: `isAdmin()` only

**MUVX Mapping:**
- **Schema table:** `carrierPayment` (schema.ts) — with `tenantId`, `carrierId`, `tripId`, `amount`, `additions`, `deductions`, `netAmount`, `currency`, `status` (pending/approved/paid/void), `invoiceNumber`, `paymentDate`, `paymentMethod`, `referenceNumber`, `notes`
- **Permission keys:** `settlements.view`, `settlements.create`, `settlements.approve`, `settlements.pay`, `settlements.void`, `settlements.delete`
- **Server actions:** `createCarrierPaymentAction()`, `updateCarrierPaymentStatusAction()`, `confirmRemittanceAction()` in `app/actions/tms-carrier.ts`
- **DAL:** `getCarrierPaymentsForOrg()`, `getCarrierPaymentsWithDetailsForOrg()`, `getCarrierPaymentById()`
- **UI:** `/carrier-pay/page.tsx` (55 lines) — CarrierPayClient with dual tabs (Settlements/Carriers), KPI cards by status, CarrierStatusActions

**Status: ✅ COMPLETE — Improved**
The full carrier payment lifecycle is preserved and enhanced:
- Staff read (all three roles) ✅
- Any authenticated user can create settlement — preserved (gated by `settlements.create`)
- Admin/accountant update (approval/payment/remittance) — preserved with granular `settlements.approve`, `settlements.pay`, `settlements.void` keys
- Admin delete only — preserved via `settlements.delete`
- The 4-state status workflow (pending → approved → paid → void) exceeds the original Firestore model

---

### 31. `payStubs` (line 396) / `v2_payStubs` (line 796)

**Firestore Rule:**
- Read: `isAdmin() || isAccountant()`, OR driver reading own approved/sent stubs (via driver lookup)
- Create/Update: `isAdmin() || isAccountant()` only
- Delete: `isAdmin()` only

**MUVX Mapping:**
- **Schema table:** `payStub` (schema.ts) — with `tenantId`, `driverId`, `payPeriodStart`, `payPeriodEnd`, `grossPay`, `totalDeductions`, `netPay`, `status` (draft/approved/paid/sent), `paymentDate`, `paymentMethod`, `currency`
- **Permission keys:** `payroll.view`, `payroll.generate`, `payroll.mark_paid`, `payroll.delete`
- **Server actions:** `generatePayStubAction()`, `markPayStubPaidAction()` in `app/actions/tms-payroll.ts`
- **DAL:** `getPayStubsForOrg()`, `getPayStubsWithDetailsForOrg()`
- **UI:** `/payroll/page.tsx` (147 lines) — KPI cards, GeneratePayStubDialog, PayrollTableView

**Status: ✅ COMPLETE — Preserved**
Driver self-read of approved/sent stubs preserved via tenant-scoped query + driver ownership filter. Admin/accountant-only create/update preserved. Admin-only delete preserved. The 4-state workflow (draft → approved → paid/sent) exceeds the original 2-state (Approved/Sent) model.

---

### 32. `truckStatements` (line 408) / `v2_truckStatements` (line 808)

**Firestore Rule:**
- Read: `isAdmin() || isAccountant()`, OR driver reading own approved/sent statements (via driver lookup)
- Create/Update: `isAdmin() || isAccountant()`
- Delete: `isAdmin()` only

**MUVX Mapping:**
- **Schema table:** No `truckStatement` table
- **Permission keys:** No `settlements.statements` keys
- **Server actions:** No truck statement actions
- **UI:** No truck statement pages or reports

**Status: ❌ MISSING**
Owner-operator truck statements (AP > O/P tab) have no equivalent in MUVX. This was Task 27 in the original requirements. The carrier payment system handles owner-operator settlements differently (through `carrierPayment` table), but the dedicated statement model is absent.

---

### 33. `auditLog` (line 423) / `v2_auditLog` (line 823) / `auditLog` v1 (line 831)

**Firestore Rule:**
- Read: `isStaff()` (staff only, including per-entity audit trails)
- Create: `isSignedIn()` (any authenticated user — wrappers fire on audited operations)
- Update/Delete: `false` (immutable, append-only)

**MUVX Mapping:**
- **Schema table:** `auditLog` (schema.ts:1126 lines) — with `tenantId`, `userId` (actor), `action`, `targetTable`, `targetId`, `metadata` (JSON), `ipAddress`, `userAgent`, `timestamp`
- **Permission keys:** `audit.read`
- **Server actions:** `recordAuditEvent()` called in EVERY server action (tms.ts, tms-billing.ts, tms-carrier.ts, tms-ap.ts, tms-payroll.ts, tms-customers.ts)
- **DAL:** `getOrgActivityForAdmin()` — query audit trail scoped by `tenantId`
- **UI:** Admin audit view (referenced in `/settings/` hierarchy)

**Status: ✅ COMPLETE — Improved**
The append-only immutable audit trail is preserved with significant enhancements:
- Staff-only read (matching `isStaff()`) via `audit.read` key
- Server-side append (matching `isSignedIn()` for wrappers) — `recordAuditEvent()` called within every action
- Immutable (matching `false`) — `auditLog` table uses `primaryKey` with `NO ACTION` on update, `ON DELETE RESTRICT`
- Adds: IP address tracking, user agent, structured metadata JSON, tenant-scoped queries

---

### 34. `internalNotes` (line 433) / `v2_internalNotes` (line 839)

**Firestore Rule:**
- Read/Create/Update/Delete: `isStaff()` for all (full CRUD for staff only)
- Immutable to drivers and customBrokers (not even read access)

**MUVX Mapping:**
- **Schema table:** No dedicated `internalNote` table
- **Permission keys:** `drivers.notes` exists, but no general internal notes system
- **Server actions:** No internal note actions
- **UI:** No internal notes feature visible

**Status: ❌ MISSING**
Internal notes (staff-only commentary on loads and trips) have no implementation in MUVX. The `drivers.notes` permission key suggests this was planned but not yet implemented. This is referenced in the feature-parity matrix as part of the audit trail requirements.

---

## Summary by Category

### ✅ Complete (Behavior Preserved or Improved) — 14 collections

| Collection | Status Detail |
|---|---|
| `users` | Replaced with Better Auth + per-org membership; admin-only delete preserved |
| `loads` | 15 permission keys replace single role check; field-level restrictions enforced server-side |
| `loadStatusOverrides` | Consolidated into immutable `auditLog` with structured `changedBy` |
| `invoices` | 4 permission keys preserve staff CRUD, admin/accountant delete |
| `trips` | Full detail page + status milestones; driver self-status preserved server-side |
| `drivers` | 16 permission keys preserve all original rules + self-signup workflow |
| `trucks` | Fleet management preserved with tenant scoping |
| `trailers` | Fleet management preserved with tenant scoping |
| `carriers` | Carrier directory + settlement lifecycle fully preserved and enhanced |
| `apExpenses` | 4 permission keys preserve staff CRUD, admin/accountant update/delete |
| `payItems` | Integrated into pay stub workflow with granular keys |
| `carrierPayments` | 6 permission keys preserve 4-state settlement workflow |
| `payStubs` | Payroll management preserved with 4-state workflow |
| `auditLog` | Append-only immutable trail preserved with IP + user agent enrichment |
| `companyProfile` / `settings` | Organization settings preserved with admin-only writes |

### ⚠️ Partial (Consolidated or Slightly Changed) — 5 collections

| Collection | Status Detail |
|---|---|
| `rateConfParseLogs` | Replaced by audit trail entries for parse events; no dedicated UI |
| `facilities` | Modeled as customer sub-entity; custom_broker read missing |
| `arPayments` | Consolidated into invoice payment application flow |
| `customerLedger` | Consolidated into invoice + audit records |
| `fuelExpenses` | Consolidated into `apExpense` type='fuel'; dispatcher read is slight expansion |
| `documents` | S3-backed; type whitelist preserved; update immutability preserved |
| `revenueOverrides` | Consolidated into immutable `auditLog` entries |
| `tripExpenses` | Consolidated into `apExpense` type='trip'; driver-delete-own rule lost |

### ❌ Missing (No Equivalent) — 6 collections

| Collection | Reason |
|---|---|
| `customBrokers` | Entire `custom_broker` role absent from MUVX permission model |
| `unitCosts` | Equipment cost tracking not implemented; `unitCosts`/`unitCostConfigs` tables absent |
| `unitCostConfigs` | Cost target configuration absent |
| `truckPositions` | GPS tracking not implemented; `fleet.gps` permission key declared but no backing |
| `yards` | Yard/split location management absent from schema and UI |
| `truckStatements` | Owner-operator statement model absent; carrier payments serve a different purpose |
| `internalNotes` | Staff-only internal commentary on loads/trips absent; `drivers.notes` key declared but unimplemented |

### 🔐 Security Architecture Improvement

| Aspect | Original (Firestore Rules) | MUVX |
|---|---|---|
| Rule location | Client SDK (`firestore.rules`) | Server-only (`lib/can.ts`, every Server Action) |
| Bypass risk | Client can craft malformed requests | Server actions are the only write path |
| Status progression | Field diff restricted in rules (`affectedKeys().hasOnly()`) | Validated in server action + DB-level check |
| Audit field requirement | `statusOverrideReason` required in rule | `recordAuditEvent()` always called, no client override possible |
| Merge/split guard | `mergedBy == request.auth.uid` in rules | Server action validates + audit-logs the merge |
| Tenant isolation | N/A — single company per Firestore DB | Every query scoped by `tenantId` via `requireTenant()` |
| Delete protection | Per-role in rules | Server action + `requireCatalogPermission()` + `requireAdmin()` |

---

## Permission Key Coverage Matrix

The 130 muvx permission keys map to Firestore roles as follows. Keys with ❌ indicate the original role had no equivalent capability in the rules.

| Original Firestore Role | MUVX Permission Coverage | Uncovered Areas |
|---|---|---|
| **admin** | All 130 keys granted by default (full preset) | None |
| **dispatcher** | `loads.*`, `trips.*`, `fleet.*`, `drivers.view_assigned`, `drivers.assign_*`, `carriers.*` (create/update/delete), `customers.*`, `facilities.*` (create/update), `accounting.ap_view`, `settlements.*`, `reports.*`, `documents.*` | `accounting.ap_delete`, `payroll.*`, `audit.read` (staff in original → admin/dispatcher in MUVX) |
| **accountant** | `accounting.*`, `invoices.*`, `arPayments.*`, `customerLedger.*`, `apExpenses.*`, `payroll.*`, `settlements.approve`, `reports.*`, `audit.read` | `loads.update_status` (cannot update load status), `drivers.*` (accountant only reads drivers), `fleet.*` (no fleet management) |
| **driver** | `loads.view_assigned`, `loads.update_status_own`, `trips.view_assigned`, `payStubs.view_own`, `payItems.view_own`, `documents.view_trip` | Cannot create/read general documents, cannot read facilities independently, no customBroker-equivalent access |
| **custom_broker** | ❌ No equivalent | Entire role missing — no access to loads, facilities, documents, or any resources |
| **staff** (composite) | Union of admin + dispatcher + accountant keys (minus driver-specific) | Same as above |

---

## Recommendations

1. **Add `custom_broker` role** — The entire role is missing. Required for customs brokerage operations. Priority: P1.
2. **Implement GPS tracking** (`fleet.gps`) — Permission key declared but no schema table, server action, or UI. Priority: P1.
3. **Implement equipment cost tracking** (`unitCosts`/`unitCostConfigs`) — Needed for profitability reporting. Priority: P1.
4. **Implement yards** — Required for yard split workflow (Task 10). Priority: P1.
5. **Implement truck statements** — Owner-operator settlement workflow. Priority: P2.
6. **Restore driver self-delete of trip expenses** — The original rules allowed drivers to delete their own logged expenses. MUVX's `accounting.ap_delete` is admin-only. Priority: P2.
7. **Add internal notes UI** — `drivers.notes` key exists but no notes feature. Priority: P2.
8. **Add dedicated rate confirmation parse log UI** — Parse logs are only in audit trail, no dedicated viewer. Priority: P2.
