import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, DollarSign, FileText, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getInvoicesForOrg, getSession } from "@/lib/dal"

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
    case "overdue":
      return "bg-destructive/10 text-destructive border-destructive/20"
    case "partially_paid":
      return "bg-brand-accent/10 text-brand-accent border-brand-accent/20"
    default:
      return "bg-brand-ink/5 text-brand-ink border-brand-rule"
  }
}

function getStatusLabel(status: string) {
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

export default async function InvoicesPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  const invoices = await getInvoicesForOrg(tenantId)

  const totalRevenue = invoices.reduce((sum, row) => sum + safeNumber(row.amount), 0)
  const outstanding = invoices
    .filter((row) => String(row.status || "").toLowerCase() !== "paid")
    .reduce((sum, row) => sum + safeNumber(row.amount), 0)
  const paid = invoices
    .filter((row) => String(row.status || "").toLowerCase() === "paid")
    .reduce((sum, row) => sum + safeNumber(row.amount), 0)

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
              <FileText className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
              <span className="italic text-brand-accent">Invoices</span>
            </h1>
          </div>
          <p className="text-sm text-brand-ink/80">
            Monitor billings, due dates, and collections across the operating month.
          </p>
        </div>

        <Button
          className="h-9 rounded-full bg-brand-ink text-brand-cream hover:bg-brand-ink-soft"
          render={<Link href="/invoices/new" />}
        >
          Create invoice
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
              <DollarSign className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">{currency.format(totalRevenue)}</p>
          <p className="mt-1 text-xs text-brand-muted-soft">Billed</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-ink/5 text-brand-ink">
              <TrendingUp className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">{currency.format(outstanding)}</p>
          <p className="mt-1 text-xs text-brand-muted-soft">Outstanding</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-success/10 text-brand-success">
              <TrendingUp className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">{currency.format(paid)}</p>
          <p className="mt-1 text-xs text-brand-muted-soft">Paid</p>
        </Card>
      </div>

      <Card className="border-brand-rule bg-brand-card p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-brand-rule p-5">
          <div>
            <h2 className="font-serif text-xl text-brand-ink">Invoice ledger</h2>
            <p className="text-xs text-brand-muted-soft">{invoices.length} invoices in this workspace</p>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="p-6 text-sm text-brand-muted-soft">No invoices have been created yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoiceRow) => (
                <TableRow key={invoiceRow.id}>
                  <TableCell className="font-mono text-[12px] text-brand-ink">{invoiceRow.invoiceNumber || "—"}</TableCell>
                  <TableCell>{invoiceRow.customerName || "Unknown customer"}</TableCell>
                  <TableCell>{invoiceRow.dueDate ? new Date(invoiceRow.dueDate).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusClasses(String(invoiceRow.status || "pending").toLowerCase())}>
                      {getStatusLabel(String(invoiceRow.status || "pending").toLowerCase())}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-brand-ink">{currency.format(safeNumber(invoiceRow.amount))}</TableCell>
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
