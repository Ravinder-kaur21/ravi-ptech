import { redirect } from "next/navigation"
import { Users, Phone, Mail, Award, CheckCircle2 } from "lucide-react"
import { getSession, getDriversForOrg } from "@/lib/dal"
import { Card } from "@/components/ui/card"
import { StatusBadge } from "@/components/status-badge"
import { AddDriverDialog } from "@/components/tms/add-driver-dialog"

export const instant = false

export default async function DriversPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  const drivers = await getDriversForOrg(tenantId)
  const activeDrivers = drivers.filter((d) => d.status === "active")

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
            Professional <span className="italic text-brand-accent">Drivers</span>
          </h1>
          <p className="mt-1 text-sm text-brand-ink/80">
            {drivers.length} commercial drivers · {activeDrivers.length} active and ready for dispatch
          </p>
        </div>
        <AddDriverDialog />
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Card className="border-brand-rule bg-brand-card p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[12px] text-brand-muted-soft">Total Roster</p>
            <Users className="size-4 text-brand-accent" />
          </div>
          <p className="mt-2 font-serif text-2xl text-brand-ink">{drivers.length}</p>
        </Card>
        <Card className="border-brand-rule bg-brand-card p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[12px] text-brand-muted-soft">Active Drivers</p>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-serif text-2xl text-brand-ink">{activeDrivers.length}</p>
        </Card>
        <Card className="border-brand-rule bg-brand-card p-4 col-span-2 lg:col-span-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[12px] text-brand-muted-soft">CDL Verified</p>
            <Award className="size-4 text-brand-muted-soft" />
          </div>
          <p className="mt-2 font-serif text-2xl text-brand-ink">
            {drivers.filter((d) => d.cdlNumber).length}
          </p>
        </Card>
      </div>

      {/* Table */}
      {drivers.length === 0 ? (
        <Card className="border-brand-rule bg-brand-card p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-brand-accent-tint flex items-center justify-center mb-4">
            <Users className="h-5 w-5 text-brand-accent" />
          </div>
          <p className="font-medium text-brand-ink">No drivers registered yet</p>
          <p className="mt-1 text-sm text-brand-muted-soft">
            Add your drivers to assign them to loads, track HOS, and process settlements.
          </p>
          <div className="mt-4 inline-block">
            <AddDriverDialog />
          </div>
        </Card>
      ) : (
        <Card className="border-brand-rule bg-brand-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-rule bg-brand-cream-soft/50">
                  <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                    Driver
                  </th>
                  <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                    CDL License
                  </th>
                  <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                    Contact
                  </th>
                  <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                    Compensation
                  </th>
                  <th className="text-right font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-brand-rule last:border-0 hover:bg-brand-cream-soft/50 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-xs text-brand-ink">
                        {d.firstName} {d.lastName}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono">
                      {d.cdlNumber ? (
                        <span>
                          {d.cdlNumber} {d.cdlState ? `(${d.cdlState})` : ""}
                        </span>
                      ) : (
                        <span className="text-brand-muted-soft">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <div className="space-y-0.5">
                        {d.phone && (
                          <div className="flex items-center gap-1 text-brand-ink">
                            <Phone className="size-3 text-brand-muted-soft shrink-0" />
                            <span>{d.phone}</span>
                          </div>
                        )}
                        {d.email && (
                          <div className="flex items-center gap-1 text-brand-muted-soft text-[11px]">
                            <Mail className="size-3 text-brand-muted-soft shrink-0" />
                            <span>{d.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <div className="font-medium text-brand-ink">{d.payType || "Per Mile"}</div>
                      {d.payRate && (
                        <div className="text-[11px] text-brand-muted-soft font-mono">
                          ${d.payRate} / rate
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <StatusBadge status={d.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
