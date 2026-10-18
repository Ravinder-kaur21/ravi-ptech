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
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full min-w-0">
      {/* ─── HEADER & ACTIONS ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
            Accounts <span className="italic text-brand-accent">Payable</span>
          </h1>
          <p className="mt-1 text-sm text-brand-muted-soft">
            Review and approve driver trip expenses, fuel purchases, tolls, and maintenance bills.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <RecordExpenseDialog trips={tripsList} drivers={driversList} />
        </div>
      </div>

      {/* ─── KPI CARDS (Dashboard Design Language) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
              <AlertCircle className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-accent">
            ${pendingTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Pending Review</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">
            {pendingCount} {pendingCount === 1 ? "expense" : "expenses"} awaiting approval
          </p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-700">
              <Clock className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">
            ${approvedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Approved (Unsettled)</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">
            {approvedCount} ready for driver reimbursement
          </p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-emerald-700">
            ${reimbursedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Reimbursed / Settled</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">
            Total historical payroll settlements
          </p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-700">
              <Fuel className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">
            ${fuelTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Fuel & DEF Receipts</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">
            Direct highway fuel expenditure
          </p>
        </Card>
      </div>

      {/* ─── LIVE EXPENSES TABLE ─── */}
      <AccountsPayableTableView expenses={expenses} timeZone={profile?.timeZone} />
    </div>
  )
}
