# Original Client Project Feature Inventory: MUVX TMS (TanStack / Firebase)

This document provides a comprehensive, file-by-file inventory of every functional capability, dialog, data model, validation rule, workflow, and integration implemented in the original client codebase located at `/Users/apple/work/TMS-project`.

---

## 1. Architecture & Core Stack

- **Framework**: Hybrid TanStack Start / React Router DOM (`react-router-dom` v7.18.4, `vite` v8.3.2)
- **Data Store**: Google Firebase Firestore (`firebase` v12.19.0, `firebase-admin` v14.5.0)
- **Authentication**: Firebase Authentication (`firebase/auth`) with role-based document lookup in `users` collection
- **UI & Styling**: Tailwind CSS v4, Radix UI primitives, Lucide React icons, Sonner toasts
- **PDF & Document Processing**: `jspdf`, `jspdf-autotable`, `pdf-lib` (client-side generation)
- **Spreadsheet & Data Export**: `xlsx` (SheetJS) and custom CSV utilities (`src/lib/csvExport.ts`)
- **Mapping & Geocoding**: Leaflet (`leaflet`, `react-leaflet`), Mapbox GL (`mapbox-gl`, `maplibre-gl`), Google Places API
- **AI Document Parsing**: Google Gemini Flash via HTTP API (`src/lib/rateConfParse.server.ts`)

---

## 2. Global Shell & Navigation

**Source Files**:
- `src/router/AppRouter.tsx`
- `src/components/layout/AppShell.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/Topbar.tsx`
- `src/components/layout/GlobalSearch.tsx`
- `src/components/layout/NotificationBell.tsx`
- `src/context/NotificationsContext.tsx`

### Implemented Capabilities:
1. **Role-Gated Routing**: Routes guarded by `ProtectedRoute.tsx` checking `role`:
   - `admin`: All routes, Settings, Dev Seed, Master Data
   - `dispatcher`: Loads, Trips, Drivers, Fleet, Carrier Pay, Accounts Payable
   - `accountant`: Loads, Invoices, Accounts Payable, Reports, Expense Review, Driver Pay, Carrier Pay
   - `driver`: My Pay (`/my-pay`), Assigned Trip Detail (`/trips/:id`), BOL print (`/trips/:id/bol`)
2. **Global Omnibox Search (`GlobalSearch.tsx`)**: Searches across loads, trips, drivers, and customers with keyboard shortcut navigation (`Cmd+K`).
3. **Notification Bell (`NotificationBell.tsx`, `NotificationsContext.tsx`)**: Real-time alerts for ETA drift, license expiration, missed pickups, and unassigned loads.
4. **Config Warning Banner (`ConfigWarning.tsx`)**: Surfaces missing Firebase web API keys or environmental misconfigurations.

---

## 3. Dashboard & Operational Analytics

**Source Files**:
- `src/pages/DashboardPage.tsx`
- `src/lib/dashboardMetrics.ts`
- `src/components/dashboard/`

### Implemented Capabilities:
1. **Live Operational KPI Cards**:
   - Active Loads count (segmented by status)
   - Unassigned Loads count (requiring immediate dispatcher attention)
   - Delayed / At-Risk Loads count (ETA past scheduled appointment)
   - Active Drivers on Road
   - Revenue MTD (Month-To-Date) in CAD and USD
   - On-Time Delivery Rate percentage
2. **AR Aging Summary**: Current, 30 days, 60 days, 90+ days overdue balances.
3. **Dispatcher Action Queue**: Quick-filter links directly to unassigned loads, at-risk trips, and pending invoices.

---

## 4. Loads & Order Management (Full Workflow)

**Source Files**:
- `src/pages/LoadsPage.tsx`
- `src/pages/LoadDetailPage.tsx`
- `src/firebase/loads.ts`
- `src/components/loads/CreateLoadDialog.tsx`
- `src/components/loads/EditLoadDialog.tsx`
- `src/components/loads/SplitLoadDialog.tsx`
- `src/components/loads/SplitToYardDialog.tsx`
- `src/components/loads/MergeLegsDialog.tsx`
- `src/components/loads/AdminStatusOverrideDialog.tsx`
- `src/components/loads/ChangeLoadCustomerDialog.tsx`
- `src/components/loads/OverrideRevenueDialog.tsx`
- `src/components/loads/EditRateDistributionDialog.tsx`
- `src/components/loads/SendCheckCallDialog.tsx`
- `src/components/loads/LoadTrackingCard.tsx`
- `src/components/loads/LoadClaimSection.tsx`
- `src/components/loads/OrderAttributesField.tsx`
- `src/components/loads/JourneyLegs.tsx`
- `src/components/loads/LegsTable.tsx`
- `src/components/loads/detail/LoadActivityRail.tsx`
- `src/components/loads/detail/LoadDocumentTiles.tsx`

### Implemented Capabilities:
1. **Load Lifecycle Statuses**:
   `Draft` $\rightarrow$ `Open` $\rightarrow$ `Assigned` $\rightarrow$ `In-Transit` $\rightarrow$ `Delivered` $\rightarrow$ `Completed` $\rightarrow$ `Invoiced` $\rightarrow$ `Cancelled`.
2. **Tabs in Load Board (`LoadsPage.tsx`)**:
   - `Drafts`: Unconfirmed loads
   - `Active Loads`: `Open`, `Assigned`, `In-Transit`
   - `Delivered Load`: Delivered, awaiting POD or invoice finalization
   - `Order Book`: Historical master list of all loads
3. **Data Grid Features**:
   - Customizable column visibility (`useColumnVisibility.ts`, `FieldsPanel.tsx`)
   - Resizable table columns with drag handles (`useResizableColumns.ts`)
   - Multi-column sort (`useSort.ts`, `SortableTh.tsx`)
   - Advanced multi-filter panel (`FilterPanel.tsx`): customer, origin/destination state, date ranges, status
   - Bulk selection and CSV export (`BulkActionBar.tsx`, `csvExport.ts`)
4. **Load Creation (`CreateLoadDialog.tsx`)**:
   - Customer picker or inline customer creation
   - Tender number and customer reference
   - Multi-stop pickups and multi-stop drops (`LoadStop[]`)
   - Google Places address autocompletion with latitude/longitude capture
   - Military appointment windows (sharp time, window, TBA, after/before time)
   - Commodity description, piece count, weight (lbs), refrigerated toggle & temperature setting
   - Currency toggle (`CAD` vs `USD`)
   - Canadian / US Sales Tax engine (`SalesTaxType`: `None`, `GST`, `HST`, `PST`, `QST`), automatic calculation of `finalRate`
   - Cross-border references: `parsPapsNumber`, customs broker assignment
   - Rate confirmation PDF upload and AI extraction trigger
5. **Split Load & Journey Leg Architecture**:
   - Splits a single load into multiple legs (`LD-0021.1`, `LD-0021.2`)
   - Supports Terminal, City/State, or GPS split points
   - Automatic revenue allocation per leg based on mileage ratio
   - Manual leg revenue override (`OverrideRevenueDialog.tsx`, `EditRateDistributionDialog.tsx`)
   - Split to Yard / Cross-dock (`SplitToYardDialog.tsx`)
   - Leg merging (`MergeLegsDialog.tsx`) preserving historical split counters (`maxSplitSuffix`)
6. **Cargo Claims Management (`LoadClaimSection.tsx`)**:
   - Claim status (`Open`, `Resolved`), claim amount, claim description, supporting document upload
7. **Cancellation & TONU Handling (`CancelConfirmDialog.tsx`)**:
   - Cancel as "No Charge" or "TONU" (Truck Order Not Used)
   - Automatically generates an Accounts Receivable record for TONU billing
8. **Check Calls & Tracking**:
   - Check call recording (`SendCheckCallDialog.tsx`) with status, timestamp, location, and dispatcher notes
   - Real-time tracking card (`LoadTrackingCard.tsx`) showing progress percentage

---

## 5. Trips & Multi-Stop Dispatch

**Source Files**:
- `src/pages/TripsPage.tsx`
- `src/pages/TripDetailPage.tsx`
- `src/firebase/trips.ts`
- `src/components/trips/CreateTripDialog.tsx`
- `src/components/trips/CreateBlankTripDialog.tsx`
- `src/components/trips/BreakdownSplitDialog.tsx`
- `src/components/trips/CarrierRatePromptDialog.tsx`
- `src/components/trips/DispatchConfirmDialog.tsx`
- `src/components/trips/EditTripDialog.tsx`
- `src/components/trips/MileageRecalcDialog.tsx`
- `src/components/trips/PodLoadPickerModal.tsx`
- `src/components/trips/TripEventsSection.tsx`
- `src/components/trips/TripExpensesSection.tsx`
- `src/components/trips/TripStatusTracker.tsx`
- `src/components/trips/TripTrackingPanel.tsx`
- `src/pages/BolPrintPage.tsx`
- `src/pages/RateConfirmationPrintPage.tsx`
- `src/lib/generateBOL.ts`

### Implemented Capabilities:
1. **Trip Lifecycle Statuses**:
   `Created` $\rightarrow$ `Assigned` $\rightarrow$ `In-Transit` $\rightarrow$ `Delivered`.
2. **Dual Assignment Models (`assignmentType`)**:
   - **Company Driver**: Assigned driver, truck, trailer; automatically creates payroll `PayItem` on delivery.
   - **Contracted Carrier**: Assigned 3rd-party carrier with agreed carrier rate; automatically creates `carrierPayment` on delivery.
3. **Trip Assembly**:
   - Multi-load consolidation into a single trip (LTL / multi-stop truckload).
   - Stop ordering and route sequence visualization (`stopsChainImpl`).
   - Blank trip creation (`CreateBlankTripDialog.tsx`) for repositioning or empty moves.
4. **In-Flight Operations**:
   - Mid-route breakdown split (`BreakdownSplitDialog.tsx`): creates a recovery trip with remaining stops when equipment breaks down.
   - Driver check-calls, arrival timestamps, and event logging (`TripEventsSection.tsx`).
   - On-the-road trip expense logging (`TripExpensesSection.tsx`: fuel, tolls, scales, lumper fees).
   - Recalculate trip miles based on actual stops (`MileageRecalcDialog.tsx`).
5. **Automated Post-Delivery Fan-Out (`onTripDelivered`)**:
   - Automatically marks all linked load legs as `Delivered`.
   - Generates payroll item for company drivers or carrier payment record for outside carriers.
   - Allocates fixed and variable truck/trailer unit costs based on completed mileage.
6. **Printable Operations Documents**:
   - **Bill of Lading (BOL)**: `/trips/:id/bol` (`BolPrintPage.tsx`, `generateBOL.ts`) with shipper/consignee stops, piece counts, weight, signature lines.
   - **Carrier Rate Confirmation**: `/trips/:id/rate-confirmation` (`RateConfirmationPrintPage.tsx`) with agreed rate, special instructions, and terms.

---

## 6. Fleet & Equipment Management

**Source Files**:
- `src/pages/FleetPage.tsx`
- `src/firebase/trucks.ts`
- `src/firebase/trailers.ts`
- `src/firebase/carriers.ts`
- `src/components/fleet/FleethuntLinkDialog.tsx`
- `src/components/fleet/UnitCostsDialog.tsx`
- `src/lib/fleethunt.server.ts`
- `src/lib/unitCost.ts`

### Implemented Capabilities:
1. **Power Units (Tractors / Trucks)**:
   - Unit number with uniqueness validation (`isUnitNumberTaken`)
   - Ownership models: Company Owned, Owner-Operator, Leased
   - Equipment details: Make, model, year, VIN, license plate, registration expiration, fuel capacity
   - Status: Available, In-Use, Maintenance, Out-of-Service
   - GPS Telematics integration: FleetHunt link pairing (`FleethuntLinkDialog.tsx`)
   - Cost-per-mile financial model (`UnitCostsDialog.tsx`): monthly fixed costs, maintenance reserves, variable cost per mile
2. **Trailers**:
   - Unit number with uniqueness validation (`isTrailerUnitTaken`)
   - Equipment types: Dry Van (53'), Reefer (53'), Flatbed (48'), Step Deck, Conestoga
   - Status: Available, In-Use, Maintenance
3. **Outside Carriers Roster**:
   - Carrier directory with MC#, DOT#, contact, address, insurance certificate expiration date, active/inactive status

---

## 7. Professional Drivers & Compliance

**Source Files**:
- `src/pages/DriversPage.tsx`
- `src/pages/DriverMyPayPage.tsx`
- `src/firebase/drivers.ts`
- `src/firebase/adminCreateDriver.ts`
- `src/lib/licenseLifecycle.ts`
- `src/firebase/licenseAutoDeactivation.ts`
- `src/components/drivers/DriverDocUpload.tsx`
- `src/components/drivers/LicenseLifecycleBanner.tsx`

### Implemented Capabilities:
1. **Driver Profiles**:
   - Full name, phone, email, date of birth, address
   - Classification: Company Driver, Owner-Operator, Team Driver
   - CDL license number, province/state, expiration date
2. **License Lifecycle & Automated Safety Guard**:
   - Expiration warning banners (30-day / 15-day warnings)
   - Automated driver deactivation upon license expiration (`licenseAutoDeactivation.ts`) blocking dispatch assignment
3. **Compliance Document Management (`DriverDocUpload.tsx`)**:
   - File uploads for CDL front/back, Medical Certificate, Drug & Alcohol Test, Safety Abstract
4. **Compensation & Tax Profiles**:
   - Pay types: Hourly, Per-Mile (segmented by City $/mi, Highway $/mi, Empty $/mi), Percentage of Gross
   - Canadian & US tax provinces with provincial withholding calculations
   - Recurring pay items (recurring escrow deductions, fuel card, health insurance)
5. **Driver Mobile/Web Portal**:
   - Driver account provisioning (`adminCreateDriverLogin.ts`)
   - Driver self-service portal (`DriverMyPayPage.tsx`) showing assigned trips, rate stubs, and payment history

---

## 8. Invoicing & Accounts Receivable (AR)

**Source Files**:
- `src/pages/InvoicesPage.tsx`
- `src/pages/InvoicePrintPage.tsx`
- `src/firebase/invoices.ts`
- `src/firebase/arPayments.ts`
- `src/firebase/customerLedger.ts`
- `src/components/invoices/FinalizeInvoiceDialog.tsx`
- `src/components/invoices/EditInvoiceDialog.tsx`
- `src/components/invoices/ApplyPaymentDialog.tsx`
- `src/components/invoices/SendInvoiceEmailDialog.tsx`
- `src/components/invoices/DocumentPackageSelector.tsx`
- `src/components/invoices/CustomerStatusTab.tsx`
- `src/lib/pdfMerge.ts`
- `src/lib/invoiceDocs.ts`

### Implemented Capabilities:
1. **Invoice Generation**:
   - Automatically generated from delivered loads or manually created
   - Finalize invoice modal (`FinalizeInvoiceDialog.tsx`): Base rate, additional charges/expenses, discount calculation (percentage or flat amount) with standardized discount reasons (`Volume`, `Loyalty`, `Promotional`, `Damage Adjustment`, `Fuel Surcharge Waiver`)
2. **Document Package Merging (`DocumentPackageSelector.tsx`, `pdfMerge.ts`)**:
   - Automatically merges Invoice PDF + Rate Confirmation PDF + Signed POD into a single billing packet PDF
3. **AR Payment Lifecycle (`computeArStatus`)**:
   - Statuses: `Due`, `Partially Paid`, `Paid`, `Short Paid`, `Overpaid`
   - Apply payment modal (`ApplyPaymentDialog.tsx`): Check #, EFT reference, payment date, amount
   - Short-pay resolution: Waiving balance vs issuing customer credit memo
4. **Customer Ledger & AR Aging**:
   - Aging buckets (Current, 1-30, 31-60, 61-90, 90+)
   - Customer statement printing and email dispatch (`SendInvoiceEmailDialog.tsx`)

---

## 9. Accounts Payable & Expense Management

**Source Files**:
- `src/pages/AccountsPayablePage.tsx`
- `src/pages/ExpenseReviewPage.tsx`
- `src/firebase/apExpenses.ts`
- `src/firebase/apReceipts.ts`
- `src/firebase/fuelExpenses.ts`
- `src/components/payments/ConfirmPaymentDialog.tsx`
- `src/components/payments/ImportFuelDialog.tsx`

### Implemented Capabilities:
1. **Trip Expense Tracking**:
   - Categories: Fuel, Tolls, Scales, Lumper Fees, Repair, DEF, Hotel
   - Receipt image uploads and verification
2. **Bulk Fuel Card Import (`ImportFuelDialog.tsx`)**:
   - CSV/Excel fuel card transactions import (Comdata, Fleet One, EFS)
   - Auto-matches fuel transactions to trucks based on unit number and transaction date
3. **Expense Review & Approval (`ExpenseReviewPage.tsx`)**:
   - Accountant approval queue to approve driver reimbursements or company expenses

---

## 10. Carrier Settlements & Driver Payroll

**Source Files**:
- `src/pages/CarrierPayPage.tsx`
- `src/pages/DriverPayPage.tsx`
- `src/pages/PayStubDetailPage.tsx`
- `src/pages/OwnerOperatorPayPage.tsx`
- `src/firebase/carrierPayments.ts`
- `src/firebase/payroll.ts`
- `src/firebase/truckStatements.ts`
- `src/lib/generatePayStub.ts`
- `src/lib/generateTruckStatement.ts`
- `src/components/payroll/ManualLaneDialog.tsx`
- `src/components/ownerops/TruckStatementDialog.tsx`

### Implemented Capabilities:
1. **Carrier Pay Settlements**:
   - Automatically created from carrier-assigned trips
   - Line items for detention, layover, late delivery deductions
   - Mark as paid with payment reference
2. **Driver Payroll (`DriverPayPage.tsx`, `PayStubDetailPage.tsx`)**:
   - Aggregates unbilled `payItem` records for the pay period
   - Empty mile calculations between consecutive trips
   - Manual lane additions (`ManualLaneDialog.tsx`)
   - Recurring deductions and additions (escrow, fuel deductions)
   - Corporation driver provincial tax calculations
   - PDF Pay Stub generation with company remit logo (`generatePayStub.ts`)
3. **Owner-Operator Settlements (`OwnerOperatorPayPage.tsx`)**:
   - Percentage of gross revenue calculations
   - Truck expenses deduction (fuel, maintenance, insurance)
   - Printable Truck Statement PDF generation (`generateTruckStatement.ts`)

---

## 11. Master Data & Entity Management

**Source Files**:
- `src/pages/MasterDataPage.tsx`
- `src/firebase/customers.ts`
- `src/firebase/facilities.ts`
- `src/firebase/yards.ts`
- `src/firebase/customBrokers.ts`
- `src/components/settings/YardsManager.tsx`

### Implemented Capabilities:
1. **Customers Master Directory**: Company name, billing address, phone, email, country (`Canada` / `United States`), credit terms.
2. **Facilities Directory**: Warehouse shippers/receivers with operating hours, dock requirements, contact info.
3. **Yards Directory (`YardsManager.tsx`)**: Cross-dock terminals and drop yards with coordinates for split-load operations.
4. **Custom Brokers Directory**: Customs brokerage firms for US/Canada border clearance.
5. **Spreadsheet Export**: One-click Excel (`XLSX`) and CSV export of all master data catalogs.

---

## 12. Settings, Security & Integrations

**Source Files**:
- `src/pages/SettingsPage.tsx`
- `src/pages/CompanyProfilePage.tsx`
- `src/firebase/companyProfile.ts`
- `src/firebase/auditLog.ts`
- `src/components/settings/TeamRoles.tsx`
- `src/components/settings/AuditTrail.tsx`
- `src/lib/rateConfParse.server.ts`
- `src/lib/fleethunt.server.ts`

### Implemented Capabilities:
1. **Company Profile**: Legal business name, USDOT#, MC#, base operating currency, company logo, factoring company remit-to notice on invoices.
2. **Audit Trail (`AuditTrail.tsx`, `auditLog.ts`)**: System activity log recording every create, update, delete, and status change with acting user UID, role, and timestamp.
3. **Team Roles Management (`TeamRoles.tsx`)**: Invite and assign user roles (`admin`, `dispatcher`, `accountant`, `driver`).
4. **AI Rate Confirmation Parser**: Google Gemini 1.5 Flash server endpoint extracting tender number, customer, stops, appointments, rate, commodity from PDF/images.
5. **FleetHunt GPS Integration**: Telematics link fetching truck positions and actual odometer mileage.
