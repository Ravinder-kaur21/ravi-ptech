import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import {
  Receipt,
  DollarSign,
  Fuel,
  Clock,
  CheckCircle2,
  FileText,
  AlertCircle,
  Truck,
  ExternalLink,
} from "lucide-react"
import {
  getSession,
  getExpensesWithDetailsForOrg,
  getTripsForOrg,
  getDriversForOrg,
  getWorkspaceProfile,
} from "@/lib/dal"
import { formatWorkspaceDate } from "@/lib/timezone"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RecordExpenseDialog } from "@/components/tms/record-expense-dialog"
import { AccountsPayableTableView } from "@/components/tms/accounts-payable-table-view"

export const instant = false

export default async function AccountsPayablePage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  const [expenses, trips, drivers, profile] = await Promise.all([
    getExpensesWithDetailsForOrg(tenantId),
    getTripsForOrg(tenantId),
    getDriversForOrg(tenantId),
    getWorkspaceProfile(tenantId),
  ])

  // Compute Financial Summaries
  let pendingTotal = 0
  let pendingCount = 0
  let approvedTotal = 0
  let approvedCount = 0
  let reimbursedTotal = 0
  let fuelTotal = 0

  for (const e of expenses) {
    const amt = parseFloat(e.amount || "0")
    if (e.status === "pending") {
      pendingTotal += amt
      pendingCount++
    } else if (e.status === "approved") {
      approvedTotal += amt
      approvedCount++
    } else if (e.status === "reimbursed") {
      reimbursedTotal += amt
    }

    if (e.type.toLowerCase().includes("fuel") || e.type.toLowerCase().includes("def")) {
      fuelTotal += amt
    }
  }

  const tripsList = trips.map((t) => ({
    id: t.id,
    tripNumber: t.tripNumber,
    loadNumber: null,
  }))

  const driversList = drivers.map((d) => ({
    id: d.id,
    firstName: d.firstName,
    lastName: d.lastName,
  }))

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ─── HEADER & ACTIONS ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
            Accounts Payable
          </h1>
          <p className="mt-1 text-sm text-brand-muted-soft">
            Review and approve driver trip expenses, fuel purchases, tolls, and maintenance bills.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <RecordExpenseDialog trips={tripsList} drivers={driversList} />
        </div>
      </div>

      {/* ─── KPI CARDS ─── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-brand-rule bg-brand-card p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-brand-muted-soft">
              Pending Review
            </span>
            <AlertCircle className="size-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-serif text-brand-ink">
            ${pendingTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-brand-muted-soft">
            {pendingCount} expenses awaiting approval
          </p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-brand-muted-soft">
              Approved (Unsettled)
            </span>
            <Clock className="size-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-serif text-brand-ink">
            ${approvedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-brand-muted-soft">
            {approvedCount} approved for driver reimbursement
          </p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-brand-muted-soft">
              Reimbursed / Settled
            </span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-serif text-brand-ink">
            ${reimbursedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-brand-muted-soft">
            Total historical settlements
          </p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-brand-muted-soft">
              Fuel & DEF
            </span>
            <Fuel className="size-4 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-serif text-brand-ink">
            ${fuelTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-brand-muted-soft">
            Direct fuel expenditure
          </p>
        </Card>
      </div>

      {/* ─── LIVE EXPENSES TABLE ─── */}
      <AccountsPayableTableView expenses={expenses} timeZone={profile?.timeZone} />
    </div>
  )
}
