# MUVX TMS — Implementation Roadmap

This document outlines the prioritized, sequential roadmap to achieve complete functional parity with the original client TMS while maintaining the superior architecture, multi-tenancy, and security of the Next.js platform.

---

## Priority Classifications

- **P0**: Security vulnerabilities, data loss risks, broken critical workflows, tenant isolation failures.
- **P1**: Core TMS operations missing or degraded (Invoicing, Multi-stop Loads, Printable BOL/Rate Con, Master Customers).
- **P2**: Financial settlements & secondary workflows (Accounts Payable, Carrier Pay, Payroll, Fuel Import, Split Loads).
- **P3**: Enhancements and supplementary tools (Excel XLSX exports, FleetHunt telematics, advanced analytics).

---

## Phase 1: Core TMS Operational Parity (P1)

### Task 1.1: Live Invoicing & Billing Module
- **Priority**: **P1**
- **Affected Files**:
  - `app/(dashboard)/invoices/page.tsx`
  - `app/(dashboard)/invoices/[id]/page.tsx`
  - `components/tms/generate-invoice-dialog.tsx`
  - `components/tms/apply-payment-dialog.tsx`
  - `app/actions/tms-billing.ts`
  - `lib/dal.ts`
- **Required Behavior**:
  - Replace `ModulePage` placeholder with a live Invoices table (Invoice #, Customer, Load #, Due Date, Amount, Paid Amount, Balance, AR Status: `Due`, `Partially Paid`, `Paid`, `Short Paid`, `Overpaid`).
  - Add "Generate Invoice" action for loads in `delivered` status with base rate, fuel surcharge, extra accessorial expenses, and discounts.
  - Add "Apply Payment" modal allowing accountants to record check #, date, and amount, updating balance and status.
- **Dependencies**: Existing `invoice` and `arPayment` tables in `lib/schema.ts`.
- **Acceptance Criteria**:
  - Delivering a load surfaces it for billing.
  - Recording an AR payment updates the invoice balance and writes an audit log row.
  - `bunx tsc --noEmit` passes with 0 errors.

---

### Task 1.2: Multi-Stop Load Creation & Canadian/US Sales Tax Engine
- **Priority**: **P1**
- **Affected Files**:
  - `components/new-load-form.tsx`
  - `app/api/loads/route.ts`
  - `app/(dashboard)/loads/[id]/page.tsx`
  - `lib/schema.ts`
- **Required Behavior**:
  - Upgrade `NewLoadForm` to support dynamic multi-stop routes (multiple pickups and multiple deliveries with facility name, address, date, and appointment window).
  - Add currency selector (`CAD` vs `USD`).
  - Add Sales Tax engine (`None`, `GST`, `HST`, `PST`, `QST`) computing `finalRate = rate + tax1 + tax2`.
- **Dependencies**: None.
- **Acceptance Criteria**:
  - Dispatchers can create a load with 2 pickups and 2 drops.
  - Final rate dynamically computes sales taxes when applicable.
  - Route stops render chronologically on the load detail view.

---

### Task 1.3: Printable Bill of Lading (BOL) & Rate Confirmation Documents
- **Priority**: **P1**
- **Affected Files**:
  - `app/(dashboard)/trips/[id]/bol/page.tsx`
  - `app/(dashboard)/trips/[id]/rate-confirmation/page.tsx`
  - `lib/pdf/generate-bol.ts`
  - `lib/pdf/generate-rate-conf.ts`
- **Required Behavior**:
  - Printable, browser-friendly Bill of Lading route at `/trips/[id]/bol` displaying shipper/consignee stops, piece counts, weight, commodity, and signature blocks.
  - Printable Carrier Rate Confirmation route at `/trips/[id]/rate-confirmation` detailing agreed rate, accessorials, instructions, and carrier acceptance signature block.
- **Dependencies**: Trip and Load records.
- **Acceptance Criteria**:
  - Clicking "Print BOL" renders a clean document formatted for standard 8.5" x 11" paper printing and PDF download.
  - Matches freight industry standards.

---

### Task 1.4: Master Customer & Facility Catalogs
- **Priority**: **P1**
- **Affected Files**:
  - `lib/schema.ts` (add `customer` and `facility` tables)
  - `lib/dal.ts` (`getCustomersForOrg`, `getFacilitiesForOrg`)
  - `app/(dashboard)/customers/page.tsx`
  - `components/tms/add-customer-dialog.tsx`
  - `components/new-load-form.tsx`
- **Required Behavior**:
  - Dedicated Customers management screen with billing contact, phone, email, currency preference, and payment terms.
  - In `NewLoadForm`, allow selecting an existing customer from a searchable dropdown instead of typing free-text names repeatedly.
- **Dependencies**: Migration for `customer` and `facility` tables.
- **Acceptance Criteria**:
  - Adding a customer persists under the active `tenantId`.
  - Creating a load auto-fills customer billing information.

---

## Phase 2: Financial Settlements & Expense Workflows (P2)

### Task 2.1: Accounts Payable & Trip Expense Review
- **Priority**: **P2**
- **Affected Files**:
  - `app/(dashboard)/accounts-payable/page.tsx`
  - `components/tms/add-expense-dialog.tsx`
  - `app/actions/tms-ap.ts`
- **Required Behavior**:
  - Replace `ModulePage` with live expenses table (Category: Fuel, Tolls, Scales, Lumpers, DEF; Amount; Trip #; Unit #; Vendor; Status).
  - Add modal to log trip expenses with receipt attachment.
  - Accountant approval workflow to mark expenses as approved/reimbursed.
- **Dependencies**: Existing `apExpense` table in `lib/schema.ts`.
- **Acceptance Criteria**:
  - Expenses associate with active trips.
  - Total trip expenses subtract from load revenue in profitability metrics.

---

### Task 2.2: Carrier Pay & Outside Carrier Directory
- **Priority**: **P2**
- **Affected Files**:
  - `app/(dashboard)/carrier-pay/page.tsx`
  - `components/tms/confirm-carrier-payment-dialog.tsx`
  - `app/actions/tms-carrier.ts`
  - `lib/schema.ts` (add `carrier` table)
- **Required Behavior**:
  - Support assigning an outside carrier (MC#, DOT#) to a trip.
  - Upon trip delivery, automatically generate a pending `carrierPayment` record with agreed rate.
  - Payment confirmation modal to record check/wire reference.
- **Dependencies**: Existing `carrierPayment` table.
- **Acceptance Criteria**:
  - Delivering a carrier trip creates a pending payment item on the Carrier Pay board.
  - Marking paid updates status and records an audit log row.

---

### Task 2.3: Driver Payroll & Pay Stub Generation
- **Priority**: **P2**
- **Affected Files**:
  - `app/(dashboard)/payroll/page.tsx`
  - `app/(dashboard)/payroll/[id]/page.tsx`
  - `lib/pdf/generate-paystub.ts`
  - `app/actions/tms-payroll.ts`
- **Required Behavior**:
  - Aggregate unbilled `payItem` records per driver for a given pay period.
  - Calculate gross pay based on miles, empty miles, or hourly rate.
  - Apply recurring deductions (fuel card, insurance, escrow).
  - Generate printable PDF Pay Stub.
- **Dependencies**: Existing `payStub` and `payItem` tables.
- **Acceptance Criteria**:
  - Generated pay stubs match gross minus deductions.
  - Pay stubs can be printed or downloaded as PDF.

---

### Task 2.4: Merged PDF Invoice Package (Invoice + Rate Conf + POD)
- **Priority**: **P2**
- **Affected Files**:
  - `lib/pdf/merge-package.ts`
  - `app/api/invoices/[id]/package/route.ts`
- **Required Behavior**:
  - Assemble a single combined PDF billing packet containing:
    1. Generated Invoice
    2. Signed Rate Confirmation
    3. Proof of Delivery (POD)
- **Dependencies**: `pdf-lib`.
- **Acceptance Criteria**:
  - One-click download of the complete billing package ready to email brokers.

---

### Task 2.5: Bulk Fuel Card CSV Import
- **Priority**: **P2**
- **Affected Files**:
  - `components/tms/import-fuel-dialog.tsx`
  - `app/actions/tms-fuel.ts`
- **Required Behavior**:
  - Upload CSV/Excel statement from fuel card providers (Comdata, EFS, Fleet One).
  - Parse card number, truck unit number, gallons, cost, and location.
  - Bulk insert into `apExpense` table.
- **Dependencies**: CSV parser.
- **Acceptance Criteria**:
  - Uploading a sample CSV imports transactions and matches to trucks by unit number.

---

## Phase 3: Advanced Operations & Journey Splitting (P2/P3)

### Task 3.1: Split Loads & Multi-Leg Journey Splitting
- **Priority**: **P2**
- **Affected Files**:
  - `lib/schema.ts` (add `load_leg` table)
  - `components/loads/split-load-dialog.tsx`
  - `components/loads/journey-legs.tsx`
- **Required Behavior**:
  - Allow splitting a load into multiple legs (`LD-0021.1`, `LD-0021.2`) at a designated yard or GPS split point.
  - Allocate revenue proportionally based on mileage.
  - Allow assigning separate drivers/trips to each leg.
- **Dependencies**: `load` and `trip` tables.
- **Acceptance Criteria**:
  - Parent load aggregates status across all child legs.

---

### Task 3.2: Cargo Claims & TONU Cancellation Flow
- **Priority**: **P2**
- **Affected Files**:
  - `components/tms/cancel-load-dialog.tsx`
  - `components/tms/claims-section.tsx`
- **Required Behavior**:
  - Cancel dialog with TONU fee option, generating an invoice for TONU reimbursement.
  - Cargo claims section on load details with claim status, amount, and supporting documents.
- **Dependencies**: Invoicing module.
- **Acceptance Criteria**:
  - Selecting TONU cancellation creates a draft invoice for the customer.

---

### Task 3.3: AI Rate Confirmation OCR Upload
- **Priority**: **P2**
- **Affected Files**:
  - `components/loads/upload-rate-conf.tsx`
  - `app/api/ai/parse-rate-conf/route.ts`
- **Required Behavior**:
  - File dropzone on load creation screen to upload PDF/image rate confirmations.
  - Calls Gemini Flash API with structured JSON output schema.
  - Pre-fills tender number, customer, pickup/drop stops, appointments, rate, and commodity.
- **Dependencies**: Google Gemini API key.
- **Acceptance Criteria**:
  - Dropping a broker PDF auto-populates the load form for human review and approval.

---

### Task 3.4: Telematics & FleetHunt GPS Integration
- **Priority**: **P3**
- **Affected Files**:
  - `lib/telematics/fleethunt.ts`
  - `app/api/telematics/sync/route.ts`
- **Required Behavior**:
  - Periodic background sync fetching live truck coordinates and actual odometer miles from FleetHunt API.
  - Updates `truck.currentLocation` and `truck.currentMiles`.
- **Dependencies**: FleetHunt API credentials.
- **Acceptance Criteria**:
  - Truck locations update automatically on the fleet board.
