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
import { ExpenseStatusActions } from "@/components/tms/expense-status-actions"

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
      <Card className="border-brand-rule bg-brand-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-brand-rule bg-brand-cream/30 dark:bg-zinc-900/50 text-[10px] font-mono uppercase tracking-wider text-brand-muted-soft">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Vendor / Merchant</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Trip & Load</th>
                <th className="py-3 px-4">Driver / Payee</th>
                <th className="py-3 px-4">Receipt Ref</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-rule font-sans">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-brand-muted-soft">
                    <Receipt className="size-8 mx-auto text-brand-muted-soft/40 mb-2" />
                    <p className="font-medium text-sm text-brand-ink">No expenses logged yet</p>
                    <p className="text-xs text-brand-muted-soft mt-0.5">
                      Record fuel, tolls, scales, lumper fees, or maintenance to track trip margins.
                    </p>
                  </td>
                </tr>
              ) : (
                expenses.map((e) => {
                  const amt = parseFloat(e.amount || "0")
                  return (
                    <tr key={e.id} className="hover:bg-brand-cream/10 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-brand-muted-soft whitespace-nowrap">
                        {formatWorkspaceDate(e.date, profile?.timeZone, undefined, { mode: "date" })}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <CategoryBadge type={e.type} />
                      </td>
                      <td className="py-3 px-4 font-medium text-brand-ink">
                        {e.vendor || "—"}
                        {e.notes && (
                          <p className="text-[11px] font-normal text-brand-muted-soft line-clamp-1">
                            {e.notes}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-sm text-brand-ink whitespace-nowrap">
                        ${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {e.tripNumber ? (
                          <Link
                            href="/trips"
                            className="inline-flex items-center gap-1 font-mono text-brand-accent hover:underline"
                          >
                            <Truck className="size-3" />
                            {e.tripNumber}
                            {e.loadNumber && (
                              <span className="text-brand-muted-soft font-normal">
                                ({e.loadNumber})
                              </span>
                            )}
                          </Link>
                        ) : (
                          <span className="text-brand-muted-soft">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {e.driverFirstName ? (
                          <span className="text-brand-ink">
                            {e.driverFirstName} {e.driverLastName}
                          </span>
                        ) : (
                          <span className="text-brand-muted-soft">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap">
                        {e.receipt ? (
                          <span className="inline-flex items-center gap-1 text-brand-ink">
                            <FileText className="size-3 text-brand-muted-soft" />
                            {e.receipt}
                          </span>
                        ) : (
                          <span className="text-brand-muted-soft">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <ExpenseStatusBadge status={e.status} />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <ExpenseStatusActions
                          expenseId={e.id}
                          currentStatus={e.status}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function CategoryBadge({ type }: { type: string }) {
  const lower = type.toLowerCase()
  if (lower.includes("fuel")) {
    return (
      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 text-[10px]">
        {type}
      </Badge>
    )
  }
  if (lower.includes("toll")) {
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 text-[10px]">
        {type}
      </Badge>
    )
  }
  if (lower.includes("scale") || lower.includes("cat")) {
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 text-[10px]">
        {type}
      </Badge>
    )
  }
  if (lower.includes("lumper")) {
    return (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px]">
        {type}
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-[10px]">
      {type}
    </Badge>
  )
}

function ExpenseStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 text-[10px]"
        >
          Approved
        </Badge>
      )
    case "reimbursed":
      return (
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px]"
        >
          Reimbursed
        </Badge>
      )
    case "rejected":
      return (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 text-[10px]"
        >
          Rejected
        </Badge>
      )
    case "pending":
    default:
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 text-[10px]"
        >
          Pending Review
        </Badge>
      )
  }
}
