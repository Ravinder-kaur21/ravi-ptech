import { redirect } from "next/navigation"
import {
  Banknote,
  DollarSign,
  Users,
  Clock,
  CheckCircle2,
  Calendar,
} from "lucide-react"
import {
  getSession,
  getPayStubsWithDetailsForOrg,
  getDriversForOrg,
  getWorkspaceProfile,
} from "@/lib/dal"
import { getEffectivePermissions } from "@/lib/can"
import { Card } from "@/components/ui/card"
import { GeneratePayStubDialog } from "@/components/tms/generate-pay-stub-dialog"
import { PayrollTableView } from "@/components/tms/payroll-table-view"

export const instant = false

export default async function PayrollPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  const perms = await getEffectivePermissions(session.user.id, tenantId)
  if (
    !perms.has("settlements.module") &&
    !perms.has("settlements.view_all") &&
    !perms.has("accounting.module")
  ) {
    redirect("/")
  }

  const [payStubs, drivers, profile] = await Promise.all([
    getPayStubsWithDetailsForOrg(tenantId),
    getDriversForOrg(tenantId),
    getWorkspaceProfile(tenantId),
  ])

  // Financial calculations
  let pendingSum = 0
  let pendingCount = 0
  let disbursedSum = 0
  let disbursedCount = 0

  for (const p of payStubs) {
    const net = parseFloat(p.netPay || "0")
    if (p.status === "pending") {
      pendingSum += net
      pendingCount++
    } else if (p.status === "paid") {
      disbursedSum += net
      disbursedCount++
    }
  }

  const canCreate = perms.has("settlements.create")

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
            Driver <span className="italic text-[#d9622b]">Settlements</span>
          </h1>
          <p className="mt-1 text-sm text-[#73757a]">
            Weekly settlement statements, mileage pay, AP reimbursements, and net disbursement.
          </p>
        </div>

        {canCreate && drivers.length > 0 && (
          <GeneratePayStubDialog drivers={drivers} />
        )}
      </div>

      {/* ─── KPI CARDS (Dashboard Design Language) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
              <Clock className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-accent">
            ${pendingSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Pending Disbursal</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">
            {pendingCount} driver {pendingCount === 1 ? "statement" : "statements"} awaiting payment
          </p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-emerald-700">
            ${disbursedSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Disbursed / Paid MTD</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">
            {disbursedCount} settled settlements
          </p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-700">
              <Banknote className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">
            {payStubs.length}
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Total Statements</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">Generated payroll vouchers</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-700">
              <Users className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">
            {drivers.length}
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Fleet Drivers</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">
            Company & owner-operator roster
          </p>
        </Card>
      </div>

      {/* ─── LIVE SETTLEMENTS TABLE ─── */}
      <PayrollTableView payStubs={payStubs} timeZone={profile?.timeZone} />
    </div>
  )
}
