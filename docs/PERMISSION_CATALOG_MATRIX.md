# Muvx TMS — Default Preset Matrix

*Companion to `docs/PERMISSION_CATALOG.md`. The full matrix is too wide
for a normal markdown table, so this file is dedicated to the
permission-key × role-id grid.*

## Legend

- `✓` = ON (the toggle is enabled for this role by default)
- `−` = OFF (the toggle is disabled)
- `—` = N/A (the toggle does not apply to this role's scope)

## The 6 default role IDs

| ID | Label | Device | Audience |
|----|-------|--------|----------|
| `owner` | Owner | Desktop | Single human (or two for a partnership) with full control |
| `admin` | Administrator | Desktop | Operations manager / IT — everything except ownership transfer, workspace deletion, banking |
| `dispatcher` | Dispatcher | Desktop | Lives in the dispatch board 8+ hrs/day |
| `accounting` | Accounting | Desktop | AR/AP, settlements, invoices, factoring |
| `safety` | Safety & Compliance | Desktop | HOS, DQ file, drug clearinghouse, accidents |
| `driver` | Driver | Mobile (PWA) | Sees only their own work, no commercials |

(Admin can create custom roles — e.g., `junior_dispatcher`, `night_dispatcher`,
`fleet_mechanic` — by cloning a preset and toggling.)

## The matrix

| Permission | owner | admin | dispatcher | accounting | safety | driver |
|------------|:---:|:---:|:---:|:---:|:---:|:---:|
| **1. Dispatch & Loads** | | | | | | |
| `loads.view_all` | ✓ | ✓ | ✓ | ✓ | ✓ | − |
| `loads.view_assigned` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `loads.create` | ✓ | ✓ | ✓ | − | − | − |
| `loads.edit` | ✓ | ✓ | ✓ | − | − | − |
| `loads.cancel` | ✓ | ✓ | ✓ | − | − | − |
| `loads.delete` | ✓ | ✓ | − | − | − | − |
| `loads.assign_driver` | ✓ | ✓ | ✓ | − | − | − |
| `loads.assign_truck` | ✓ | ✓ | ✓ | − | − | − |
| `loads.reassign` | ✓ | ✓ | ✓ | − | − | − |
| `loads.update_status` | ✓ | ✓ | ✓ | − | − | ✓ |
| `loads.export` | ✓ | ✓ | ✓ | ✓ | ✓ | − |
| **2. Stops & Appointments** | | | | | | |
| `stops.view_all` | ✓ | ✓ | ✓ | ✓ | ✓ | − |
| `stops.edit` | ✓ | ✓ | ✓ | − | − | − |
| `stops.schedule` | ✓ | ✓ | ✓ | − | − | − |
| `stops.add` | ✓ | ✓ | ✓ | − | − | − |
| `stops.delete` | ✓ | ✓ | ✓ | − | − | − |
| **3. Rates & Commercials** | | | | | | |
| `rates.view_linehaul` | ✓ | ✓ | ✓ | ✓ | − | − |
| `rates.view_fuel_surcharge` | ✓ | ✓ | ✓ | ✓ | − | − |
| `rates.view_accessorials` | ✓ | ✓ | ✓ | ✓ | − | − |
| `rates.view_total` | ✓ | ✓ | ✓ | ✓ | − | − |
| `rates.view_margin` | ✓ | ✓ | − | ✓ | − | − |
| `rates.edit` | ✓ | ✓ | ✓ | ✓ | − | − |
| **4. Customers & Brokers** | | | | | | |
| `customers.view_all` | ✓ | ✓ | ✓ | ✓ | − | − |
| `customers.view_name` | ✓ | ✓ | ✓ | ✓ | ✓ | − |
| `customers.view_contact` | ✓ | ✓ | ✓ | ✓ | − | − |
| `customers.view_credit` | ✓ | ✓ | − | ✓ | − | − |
| `customers.create` | ✓ | ✓ | ✓ | ✓ | − | − |
| `customers.edit` | ✓ | ✓ | ✓ | ✓ | − | − |
| `customers.delete` | ✓ | ✓ | − | ✓ | − | − |
| **5. Drivers** | | | | | | |
| `drivers.view_all` | ✓ | ✓ | ✓ | ✓ | ✓ | − |
| `drivers.view_personal` | ✓ | ✓ | ✓ | ✓ | ✓ | − |
| `drivers.view_pay_rate` | ✓ | ✓ | − | ✓ | − | − |
| `drivers.view_tax_info` | ✓ | ✓ | − | ✓ | − | − |
| `drivers.view_clearinghouse` | ✓ | ✓ | − | − | ✓ | − |
| `drivers.view_cdl` | ✓ | ✓ | ✓ | − | ✓ | − |
| `drivers.view_medical_cert` | ✓ | ✓ | ✓ | − | ✓ | − |
| `drivers.create` | ✓ | ✓ | ✓ | − | − | − |
| `drivers.edit` | ✓ | ✓ | ✓ | − | ✓ | − |
| `drivers.edit_sensitive` | ✓ | ✓ | − | − | ✓ | − |
| `drivers.terminate` | ✓ | ✓ | − | − | − | − |
| `drivers.flag_out_of_service` | ✓ | ✓ | − | − | ✓ | − |
| **6. Equipment & Fleet** | | | | | | |
| `equipment.view_all` | ✓ | ✓ | ✓ | ✓ | ✓ | − |
| `equipment.view_vin` | ✓ | ✓ | ✓ | ✓ | ✓ | − |
| `equipment.view_plate` | ✓ | ✓ | ✓ | ✓ | ✓ | − |
| `equipment.view_registration` | ✓ | ✓ | ✓ | − | ✓ | − |
| `equipment.view_insurance` | ✓ | ✓ | − | ✓ | − | − |
| `equipment.create` | ✓ | ✓ | − | − | − | − |
| `equipment.edit` | ✓ | ✓ | ✓ | − | − | − |
| `equipment.delete` | ✓ | ✓ | − | − | − | − |
| `equipment.maintenance.create` | ✓ | ✓ | − | − | − | − |
| `equipment.maintenance.view_all` | ✓ | ✓ | ✓ | − | ✓ | − |
| **7. Documents** | | | | | | |
| `documents.view_all` | ✓ | ✓ | ✓ | ✓ | ✓ | − |
| `documents.upload_bol` | ✓ | ✓ | ✓ | ✓ | − | ✓ |
| `documents.upload_pod` | ✓ | ✓ | ✓ | ✓ | − | ✓ |
| `documents.upload_lumper` | ✓ | ✓ | ✓ | ✓ | − | ✓ |
| `documents.upload_rate_con` | ✓ | ✓ | ✓ | ✓ | − | − |
| `documents.upload_other` | ✓ | ✓ | ✓ | ✓ | ✓ | − |
| `documents.delete` | ✓ | ✓ | − | − | − | − |
| `documents.download` | ✓ | ✓ | ✓ | ✓ | ✓ | − |
| **8. Safety & DOT Compliance** | | | | | | |
| `hos.view_all` | ✓ | ✓ | − | − | ✓ | − |
| `hos.view_own` | ✓ | ✓ | ✓ | − | ✓ | ✓ |
| `hos.edit` | ✓ | ✓ | − | − | ✓ | ✓ |
| `hos.approve` | ✓ | ✓ | − | − | ✓ | − |
| `dvir.view_all` | ✓ | ✓ | ✓ | − | ✓ | − |
| `dvir.create` | ✓ | ✓ | ✓ | − | ✓ | ✓ |
| `dq_file.view_all` | ✓ | ✓ | − | − | ✓ | − |
| `dq_file.edit` | ✓ | ✓ | − | − | ✓ | − |
| `dq_file.upload` | ✓ | ✓ | − | − | ✓ | ✓ |
| `accidents.view_all` | ✓ | ✓ | ✓ | − | ✓ | − |
| `accidents.create` | ✓ | ✓ | ✓ | − | ✓ | ✓ |
| `accidents.edit` | ✓ | ✓ | − | − | ✓ | − |
| `accidents.delete` | ✓ | ✓ | − | − | − | − |
| `drug_alcohol.query` | ✓ | ✓ | − | − | ✓ | − |
| `drug_alcohol.view` | ✓ | ✓ | − | − | ✓ | − |
| **9. Accounting & Settlements** | | | | | | |
| `invoices.view_all` | ✓ | ✓ | − | ✓ | − | − |
| `invoices.view_own` | ✓ | ✓ | − | − | − | ✓ |
| `invoices.create` | ✓ | ✓ | − | ✓ | − | − |
| `invoices.edit` | ✓ | ✓ | − | ✓ | − | − |
| `invoices.delete` | ✓ | ✓ | − | ✓ | − | − |
| `invoices.submit_factoring` | ✓ | ✓ | − | ✓ | − | − |
| `invoices.approve` | ✓ | ✓ | − | ✓ | − | − |
| `settlements.create` | ✓ | ✓ | − | ✓ | − | − |
| `settlements.edit` | ✓ | ✓ | − | ✓ | − | − |
| `settlements.approve` | ✓ | ✓ | − | ✓ | − | − |
| `settlements.pay` | ✓ | ✓ | − | ✓ | − | − |
| `ar.view` | ✓ | ✓ | − | ✓ | − | − |
| `ap.view` | ✓ | ✓ | − | ✓ | − | − |
| `banking.view` | ✓ | − | − | ✓ | − | − |
| `banking.edit` | ✓ | − | − | − | − | − |
| **10. Reports & Analytics** | | | | | | |
| `reports.view_operational` | ✓ | ✓ | ✓ | ✓ | ✓ | − |
| `reports.view_financial` | ✓ | ✓ | − | ✓ | − | − |
| `reports.view_safety` | ✓ | ✓ | − | − | ✓ | − |
| `reports.view_driver_performance` | ✓ | ✓ | ✓ | − | ✓ | − |
| `reports.export` | ✓ | ✓ | ✓ | ✓ | ✓ | − |
| **11. Workspace & Administration** | | | | | | |
| `workspace.view` | ✓ | ✓ | ✓ | ✓ | ✓ | − |
| `workspace.edit` | ✓ | ✓ | − | − | − | − |
| `workspace.edit_legal` | ✓ | ✓ | − | − | − | − |
| `workspace.transfer_ownership` | ✓ | − | − | − | − | − |
| `workspace.delete` | ✓ | − | − | − | − | − |
| `workspace.billing.view` | ✓ | ✓ | − | ✓ | − | − |
| `workspace.billing.edit` | ✓ | − | − | − | − | − |
| `members.view` | ✓ | ✓ | ✓ | ✓ | ✓ | − |
| `members.invite` | ✓ | ✓ | − | − | − | − |
| `members.edit_role` | ✓ | ✓ | − | − | − | − |
| `members.suspend` | ✓ | ✓ | − | − | − | − |
| `members.lift_suspension` | ✓ | ✓ | − | − | − | − |
| `members.remove` | ✓ | ✓ | − | − | − | − |
| `roles.view` | ✓ | ✓ | − | − | − | − |
| `roles.create_custom` | ✓ | ✓ | − | − | − | − |
| `roles.edit` | ✓ | ✓ | − | − | − | − |
| `roles.delete_custom` | ✓ | ✓ | − | − | − | − |
| `audit_log.view` | ✓ | ✓ | − | − | − | − |

## Notes on specific choices

- **`banking.view` is OFF for `admin` and `dispatcher` and `safety` and `driver`.** Only Owner and Accounting see bank-account info. This is a defense against social engineering — your dispatch manager doesn't need to see the company bank routing number.
- **`banking.edit` is Owner-only.** Not even Accounting edits the bank; they create invoices and submit to factoring, but the actual ACH / wire setup is Owner-only.
- **`workspace.billing.view` is ON for `admin` and `accounting`.** They need to know what plan we're on. Edit (changing plan, payment method) is Owner-only.
- **`rates.view_margin` is ON for `admin` and `accounting`, OFF for `dispatcher`.** Dispatchers negotiate rates but don't see the company's internal margin; that's an owner/admin/accounting concern.
- **`customers.view_credit` is ON for `admin` and `accounting`, OFF for `dispatcher`.** Dispatchers need to know the broker contact to coordinate pickup; they don't need to know the broker's credit limit.
- **`drivers.edit_sensitive` is ON for `admin` and `safety`, OFF for `dispatcher`.** Pay rates and SSNs are sensitive. Safety can edit them because they update the DQ file as part of regulatory compliance.
- **`documents.upload_bol` / `upload_pod` / `upload_lumper` are ON for `driver`.** This is the core of the driver mobile app — upload your paperwork from the cab.
- **`hos.view_own` is ON for `driver`.** Drivers need to know their own hours; they don't see other drivers' HOS.
- **`customers.view_name` is OFF for `driver`.** Per your earlier message: "not to whom the load is going." The driver sees the facility address, the dock contact, and the commodity, but not the customer/broker's name.
- **`workspace.edit_legal` triggers a confirmation modal in the UI** (not a server block) — this is documented in the workspace settings work we already shipped.

## How Admin can change any of these

The `/settings/roles` page shows this matrix as a grid of toggles,
grouped by module. When Admin toggles `drivers.view_pay_rate` OFF on
the Dispatcher role, the system:

1. Updates the `organization_role` row for `(workspace_id, "dispatcher")`
   by setting `permission.drivers = [...]` to remove `"view_pay_rate"`.
2. The next request from any dispatcher in that workspace checks
   `drivers.view_pay_rate` and gets `false`. The driver-pay column
   is hidden from the dispatcher UI, and the server API strips it
   from the response.

No code change, no deploy. Admin toggles in the UI flow straight to
DB and the next API call respects it.
