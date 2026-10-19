import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, DollarSign, Receipt } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getApExpensesForOrg, getSession } from "@/lib/dal"

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
})

const safeNumber = (value: unknown) => {
  const parsed = Number.parseFloat(String(value ?? "0").replace(/[$,]/g, ""))
  return Number.isFinite(parsed) ? parsed : 0
}

function getStatusClasses(status: string) {
  switch (status) {
    case "paid":
      return "bg-brand-success/10 text-brand-success border-brand-success/20"
    case "pending":
      return "bg-brand-accent/10 text-brand-accent border-brand-accent/20"
    default:
      return "bg-brand-ink/5 text-brand-ink border-brand-rule"
  }
}

export default async function AccountsPayablePage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  const expenses = await getApExpensesForOrg(tenantId)
  const totalOpen = expenses
    .filter((row) => String(row.status || "").toLowerCase() !== "paid")
    .reduce((sum, row) => sum + safeNumber(row.amount), 0)

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
              <Receipt className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
              <span className="italic text-brand-accent">Accounts payable</span>
            </h1>
          </div>
          <p className="text-sm text-brand-ink/80">
            Manage vendor bills, trip expenses, and the payment queue for this workspace.
          </p>
        </div>

        <Button
          className="h-9 rounded-full bg-brand-ink text-brand-cream hover:bg-brand-ink-soft"
          render={<Link href="/accounts-payable/new" />}
        >
          Add expense
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
              <DollarSign className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">{currency.format(totalOpen)}</p>
          <p className="mt-1 text-xs text-brand-muted-soft">Open AP</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-ink/5 text-brand-ink">
              <Receipt className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">{String(expenses.length)}</p>
          <p className="mt-1 text-xs text-brand-muted-soft">Expense entries</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-success/10 text-brand-success">
              <DollarSign className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">{currency.format(expenses.reduce((sum, row) => sum + safeNumber(row.amount), 0))}</p>
          <p className="mt-1 text-xs text-brand-muted-soft">Total booked</p>
        </Card>
      </div>

      <Card className="border-brand-rule bg-brand-card p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-brand-rule p-5">
          <div>
            <h2 className="font-serif text-xl text-brand-ink">Expense queue</h2>
            <p className="text-xs text-brand-muted-soft">Vendor bills and trip-related payable items</p>
          </div>
        </div>

        {expenses.length === 0 ? (
          <div className="p-6 text-sm text-brand-muted-soft">No AP expenses have been recorded yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{expense.vendor || "Unassigned vendor"}</TableCell>
                  <TableCell>{expense.type || "General"}</TableCell>
                  <TableCell>{expense.date ? new Date(expense.date).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusClasses(String(expense.status || "pending").toLowerCase())}>
                      {String(expense.status || "pending").replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-brand-ink">{currency.format(safeNumber(expense.amount))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}

export const instant = false
