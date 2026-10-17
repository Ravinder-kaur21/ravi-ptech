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

      {/* ─── KPI CARDS ─── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f]">
              Pending Disbursal
            </span>
            <Clock className="size-4 text-[#d9622b]" />
          </div>
          <p className="mt-2 text-2xl font-serif font-bold text-[#16181d] dark:text-zinc-100">
            ${pendingSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-[#73757a]">
            {pendingCount} driver {pendingCount === 1 ? "statement" : "statements"} awaiting payment
          </p>
        </Card>

        <Card className="border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f]">
              Disbursed / Paid MTD
            </span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-serif font-bold text-emerald-600">
            ${disbursedSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-[#73757a]">
            {disbursedCount} settled settlements
          </p>
        </Card>

        <Card className="border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 p-4 sm:col-span-2 lg:col-span-1 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f]">
              Fleet Drivers on Roster
            </span>
            <Users className="size-4 text-[#8a8b8f]" />
          </div>
          <p className="mt-2 text-2xl font-serif font-bold text-[#16181d] dark:text-zinc-100">
            {drivers.length}
          </p>
          <p className="mt-1 text-xs text-[#73757a]">
            Company & owner-operator roster
          </p>
        </Card>
      </div>

      {/* ─── LIVE SETTLEMENTS TABLE ─── */}
      <PayrollTableView payStubs={payStubs} timeZone={profile?.timeZone} />
    </div>
  )
}
