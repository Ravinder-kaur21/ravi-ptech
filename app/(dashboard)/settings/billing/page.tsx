import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ArrowRight,
  Banknote,
  CreditCard,
  Download,
  DollarSign,
  FileText,
  ReceiptText,
  TrendingUp,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getApExpensesForOrg, getCarrierPaymentsForOrg, getInvoicesForOrg, getSession } from "@/lib/dal"

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
})

const safeNumber = (value: unknown) => {
  const parsed = Number.parseFloat(String(value ?? "0").replace(/[$,]/g, ""))
  return Number.isFinite(parsed) ? parsed : 0
}

const money = (value: number) => currency.format(value)

function getInvoiceStatusClasses(status: string) {
  switch (status) {
    case "paid":
      return "bg-brand-success/10 text-brand-success border-brand-success/20"
    case "overdue":
      return "bg-destructive/10 text-destructive border-destructive/20"
    case "partially_paid":
      return "bg-brand-accent/10 text-brand-accent border-brand-accent/20"
    default:
      return "bg-brand-ink/5 text-brand-ink border-brand-rule"
  }
}

function getInvoiceLabel(status: string) {
  switch (status) {
    case "paid":
      return "Paid"
    case "overdue":
      return "Overdue"
    case "partially_paid":
      return "Partial"
    case "pending":
      return "Pending"
    case "sent":
      return "Sent"
    case "draft":
      return "Draft"
    default:
      return status
  }
}

function toMonthKey(dateValue: Date | string | null | undefined) {
  if (!dateValue) return null
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export default async function BillingDashboardPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  const [invoices, apExpenses, carrierPayments] = await Promise.all([
    getInvoicesForOrg(tenantId),
    getApExpensesForOrg(tenantId),
    getCarrierPaymentsForOrg(tenantId),
  ])

  const totalBilled = invoices.reduce((sum, invoiceRow) => sum + safeNumber(invoiceRow.amount), 0)
  const outstanding = invoices
    .filter((invoiceRow) => !["paid"].includes(String(invoiceRow.status || "").toLowerCase()))
    .reduce((sum, invoiceRow) => sum + safeNumber(invoiceRow.amount), 0)
  const apDue = apExpenses
    .filter((expense) => !["paid"].includes(String(expense.status || "").toLowerCase()))
    .reduce((sum, expense) => sum + safeNumber(expense.amount), 0)
  const carrierDue = carrierPayments
    .filter((payment) => !["paid"].includes(String(payment.status || "").toLowerCase()))
    .reduce((sum, payment) => sum + safeNumber(payment.amount), 0)

  const monthKeys = Array.from({ length: 6 }, (_, index) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - index))
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  })

  const chartData = monthKeys.map((monthKey) => {
    const invoiceTotal = invoices.reduce((sum, invoiceRow) => {
      const rowKey = toMonthKey(invoiceRow.createdAt)
      return rowKey === monthKey ? sum + safeNumber(invoiceRow.amount) : sum
    }, 0)
    const apTotal = apExpenses.reduce((sum, expense) => {
      const rowKey = toMonthKey(expense.date ?? expense.createdAt)
      return rowKey === monthKey ? sum + safeNumber(expense.amount) : sum
    }, 0)
    const carrierTotal = carrierPayments.reduce((sum, payment) => {
      const rowKey = toMonthKey(payment.paymentDate ?? payment.createdAt)
      return rowKey === monthKey ? sum + safeNumber(payment.amount) : sum
    }, 0)

    const dateLabel = new Date(`${monthKey}-01T00:00:00`)
    return {
      month: dateLabel.toLocaleDateString("en-US", { month: "short" }),
      invoices: invoiceTotal,
      ap: apTotal,
      carrier: carrierTotal,
    }
  })

  const recentInvoices = invoices.slice(0, 5)
  const recentExpenses = apExpenses.slice(0, 4)
  const recentCarrierPay = carrierPayments.slice(0, 4)

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
              <CreditCard className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
              <span className="italic text-brand-accent">Billing</span>
            </h1>
          </div>
          <p className="text-sm text-brand-ink/80">
            Revenue, AP obligations, and carrier settlements across your operation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-9 rounded-full border-brand-rule bg-brand-card text-brand-ink"
            render={<button type="button" />}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            className="h-9 rounded-full bg-brand-ink text-brand-cream hover:bg-brand-ink-soft"
            render={<Link href="/invoices" />}
          >
            View invoices
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Revenue booked" value={money(totalBilled)} icon={DollarSign} tone="default" />
        <KpiCard label="Outstanding" value={money(outstanding)} icon={FileText} tone="warning" />
        <KpiCard label="AP due" value={money(apDue)} icon={ReceiptText} tone="secondary" />
        <KpiCard label="Carrier pay" value={money(carrierDue)} icon={Banknote} tone="success" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="border-brand-rule bg-brand-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-brand-rule p-5">
            <div>
              <h2 className="font-serif text-xl text-brand-ink">Cash flow</h2>
              <p className="text-xs text-brand-muted-soft">Last 6 months</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-cream-soft px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.06em] text-brand-success">
              <TrendingUp className="h-3.5 w-3.5" />
              Live ledger
            </div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-3 gap-3 text-[10px] font-mono uppercase tracking-[0.05em] text-brand-muted-soft mb-3">
              <span>Invoices</span>
              <span>AP</span>
              <span>Carrier</span>
            </div>

            <div className="space-y-3">
              {chartData.map((point) => (
                <div key={point.month} className="grid grid-cols-[48px_1fr] items-center gap-3">
                  <span className="text-xs text-brand-muted-soft">{point.month}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-brand-cream-soft">
                      <div className="h-full rounded-full bg-brand-accent" style={{ width: `${Math.min(100, (point.invoices / Math.max(1, totalBilled || 1)) * 100)}%` }} />
                    </div>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-brand-cream-soft">
                      <div className="h-full rounded-full bg-brand-ink" style={{ width: `${Math.min(100, (point.ap / Math.max(1, apDue || 1)) * 100)}%` }} />
                    </div>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-brand-cream-soft">
                      <div className="h-full rounded-full bg-brand-success" style={{ width: `${Math.min(100, (point.carrier / Math.max(1, carrierDue || 1)) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <h2 className="font-serif text-xl text-brand-ink">Quick actions</h2>
          <div className="mt-4 space-y-3">
            <ActionLink href="/invoices" label="Review invoices" description="Track customer billings and due dates" />
            <ActionLink href="/accounts-payable" label="AP pipeline" description="Monitor billed expenses and vendor payments" />
            <ActionLink href="/carrier-pay" label="Carrier pay" description="Review settlement status and owner payouts" />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-brand-rule bg-brand-card p-0 overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between border-b border-brand-rule p-5">
            <div>
              <h2 className="font-serif text-xl text-brand-ink">Recent invoices</h2>
              <p className="text-xs text-brand-muted-soft">Updated from the finance ledger</p>
            </div>
            <Link href="/invoices" className="inline-flex items-center gap-1 text-sm text-brand-accent">
              Open all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {recentInvoices.length === 0 ? (
            <div className="p-6 text-sm text-brand-muted-soft">No invoices are in the workspace yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices.map((invoiceRow) => (
                  <TableRow key={invoiceRow.id}>
                    <TableCell className="font-mono text-[12px] text-brand-ink">{invoiceRow.invoiceNumber || "—"}</TableCell>
                    <TableCell>{invoiceRow.customerName || "Unknown customer"}</TableCell>
                    <TableCell>{invoiceRow.dueDate ? new Date(invoiceRow.dueDate).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getInvoiceStatusClasses(String(invoiceRow.status || "pending").toLowerCase())}>
                        {getInvoiceLabel(String(invoiceRow.status || "pending").toLowerCase())}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-brand-ink">{money(safeNumber(invoiceRow.amount))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="border-brand-rule bg-brand-card p-5">
            <h2 className="font-serif text-xl text-brand-ink">AP ledger</h2>
            <div className="mt-4 space-y-3">
              {recentExpenses.length === 0 ? (
                <p className="text-sm text-brand-muted-soft">No AP expenses recorded.</p>
              ) : (
                recentExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between gap-3 rounded-lg border border-brand-rule bg-brand-cream-soft/50 p-3">
                    <div>
                      <p className="text-sm font-medium text-brand-ink">{expense.vendor || expense.type || "Expense"}</p>
                      <p className="text-[11px] text-brand-muted-soft">{expense.type || "General expense"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm text-brand-ink">{money(safeNumber(expense.amount))}</p>
                      <p className="text-[11px] text-brand-muted-soft">{expense.status || "pending"}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="border-brand-rule bg-brand-card p-5">
            <h2 className="font-serif text-xl text-brand-ink">Carrier pay</h2>
            <div className="mt-4 space-y-3">
              {recentCarrierPay.length === 0 ? (
                <p className="text-sm text-brand-muted-soft">No carrier settlements recorded.</p>
              ) : (
                recentCarrierPay.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between gap-3 rounded-lg border border-brand-rule bg-brand-cream-soft/50 p-3">
                    <div>
                      <p className="text-sm font-medium text-brand-ink">{payment.paymentMethod || "Carrier settlement"}</p>
                      <p className="text-[11px] text-brand-muted-soft">{payment.status || "pending"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm text-brand-ink">{money(safeNumber(payment.amount))}</p>
                      <p className="text-[11px] text-brand-muted-soft">{payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : "—"}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  icon: typeof DollarSign
  tone: "default" | "warning" | "secondary" | "success"
}) {
  const toneClasses = {
    default: "bg-brand-accent-tint text-brand-accent",
    warning: "bg-destructive/10 text-destructive",
    secondary: "bg-brand-cream-soft text-brand-ink",
    success: "bg-brand-success/10 text-brand-success",
  }

  return (
    <Card className="border-brand-rule bg-brand-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className={`flex size-9 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
          <Icon className="h-4 w-4" strokeWidth={1.8} />
        </div>
      </div>
      <p className="font-serif text-3xl tracking-tight text-brand-ink">{value}</p>
      <p className="mt-1 text-xs text-brand-muted-soft">{label}</p>
    </Card>
  )
}

function ActionLink({
  href,
  label,
  description,
}: {
  href: string
  label: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-lg border border-brand-rule bg-brand-cream-soft/40 p-3 transition-colors hover:bg-brand-cream-soft"
    >
      <div>
        <p className="text-sm font-medium text-brand-ink">{label}</p>
        <p className="text-[11px] text-brand-muted-soft">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-brand-muted-soft" />
    </Link>
  )
}

export const instant = false
