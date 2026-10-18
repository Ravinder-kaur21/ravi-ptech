import { redirect } from "next/navigation"
import Link from "next/link"
import {
  FileText,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowUpRight,
  Truck,
  Plus,
} from "lucide-react"
import {
  getSession,
  getInvoicesWithDetailsForOrg,
  getDeliveredLoadsForBilling,
  getWorkspaceProfile,
} from "@/lib/dal"
import { getEffectivePermissions } from "@/lib/can"
import { formatWorkspaceDate } from "@/lib/timezone"
import { Card } from "@/components/ui/card"
import { StatusBadge } from "@/components/status-badge"
import { GenerateInvoiceDialog } from "@/components/tms/generate-invoice-dialog"
import { InvoicesTableView } from "@/components/tms/invoices-table-view"

export const instant = false

export default async function InvoicesPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  const perms = await getEffectivePermissions(session.user.id, tenantId)
  if (!perms.has("accounting.module") && !perms.has("accounting.invoices.view_all")) {
    redirect("/")
  }

  const [invoices, deliveredLoads, profile] = await Promise.all([
    getInvoicesWithDetailsForOrg(tenantId),
    getDeliveredLoadsForBilling(tenantId),
    getWorkspaceProfile(tenantId),
  ])

  // KPI Calculations
  const pendingInvoices = invoices.filter((i) => i.status === "pending")
  const paidInvoices = invoices.filter((i) => i.status === "paid")

  const totalOutstandingAr = pendingInvoices.reduce(
    (acc, curr) => acc + (parseFloat(curr.amount) || 0),
    0
  )
  const totalPaidRevenue = paidInvoices.reduce(
    (acc, curr) => acc + (parseFloat(curr.amount) || 0),
    0
  )

  const canCreate = perms.has("accounting.invoices.create")
  const canApplyPayment = perms.has("accounting.invoices.apply_payment")

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
            Customer <span className="italic text-brand-accent">Invoices</span>
          </h1>
          <p className="mt-1 text-sm text-brand-ink/80">
            {invoices.length} invoices total · ${totalOutstandingAr.toLocaleString(undefined, { minimumFractionDigits: 2 })} outstanding in Accounts Receivable
          </p>
        </div>
        {canCreate && (
          <GenerateInvoiceDialog deliveredLoads={deliveredLoads} />
        )}
      </div>

      {/* KPI Cards matching Dashboard Design Language */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
              <Clock className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-accent">
            ${totalOutstandingAr.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Outstanding AR</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">Awaiting customer collection</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-emerald-700">
            ${totalPaidRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Paid & Collected</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">Settled freight revenue</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
              <FileText className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">{pendingInvoices.length}</p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Pending Invoices</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">Unpaid or open billing</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-700">
              <Truck className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">{deliveredLoads.length}</p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Ready to Bill (Delivered)</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">Delivered loads with POD pending</p>
        </Card>
      </div>

      {/* Actionable Unbilled Banner */}
      {deliveredLoads.length > 0 && canCreate && (
        <div className="flex items-center justify-between rounded-xl border border-brand-accent/20 bg-brand-accent-tint/40 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent text-white">
              <Truck className="size-5" />
            </div>
            <div>
              <p className="font-medium text-xs text-brand-ink">
                {deliveredLoads.length} Delivered {deliveredLoads.length === 1 ? "load" : "loads"} ready for billing
              </p>
              <p className="text-[11px] text-brand-muted-soft">
                POD delivery completed. Generate customer invoices to start collection.
              </p>
            </div>
          </div>
          <GenerateInvoiceDialog
            deliveredLoads={deliveredLoads}
            preselectedLoadId={deliveredLoads[0]?.id}
          />
        </div>
      )}

      {/* Invoices Table */}
      {invoices.length === 0 ? (
        <Card className="border-brand-rule bg-brand-card p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-brand-accent-tint flex items-center justify-center mb-4">
            <FileText className="h-5 w-5 text-brand-accent" />
          </div>
          <p className="font-medium text-brand-ink">No customer invoices yet</p>
          <p className="mt-1 text-sm text-brand-muted-soft">
            Invoices can be generated from delivered loads or created as standalone freight billing statements.
          </p>
          {canCreate && (
            <div className="mt-4 inline-block">
              <GenerateInvoiceDialog deliveredLoads={deliveredLoads} />
            </div>
          )}
        </Card>
      ) : (
        <InvoicesTableView
          invoices={invoices}
          canApplyPayment={canApplyPayment}
          timeZone={profile?.timeZone}
        />
      )}
    </div>
  )
}
