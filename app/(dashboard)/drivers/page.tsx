import { redirect } from "next/navigation"
import { Users, Phone, Mail, Award, CheckCircle2, UserCheck, ShieldAlert, AlertTriangle } from "lucide-react"
import { getSession, getDriversWithDetailsForOrg, getWorkspaceMembersForDriverAssignment } from "@/lib/dal"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/status-badge"
import { AddDriverDialog } from "@/components/tms/add-driver-dialog"

export const instant = false

export default async function DriversPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  const [drivers, members] = await Promise.all([
    getDriversWithDetailsForOrg(tenantId),
    getWorkspaceMembersForDriverAssignment(tenantId),
  ])

  const activeDrivers = drivers.filter((d) => d.status === "active")
  const linkedAppUsers = drivers.filter((d) => d.userId).length

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
            Professional <span className="italic text-brand-accent">Drivers</span>
          </h1>
          <p className="mt-1 text-sm text-brand-muted-soft">
            Manage commercial driver rosters, CDL compliance, mobile app access, and payroll rates.
          </p>
        </div>
        <AddDriverDialog workspaceMembers={members} />
      </div>

      {/* ─── KPI STATS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border-brand-rule bg-brand-card p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-brand-muted-soft">Total Roster</p>
            <Users className="size-4 text-brand-accent" />
          </div>
          <p className="mt-2 font-serif text-2xl text-brand-ink">{drivers.length}</p>
          <p className="text-[11px] text-brand-muted-soft mt-0.5">Commercial fleet drivers</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-brand-muted-soft">Active Drivers</p>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-serif text-2xl text-emerald-600">{activeDrivers.length}</p>
          <p className="text-[11px] text-brand-muted-soft mt-0.5">Available for dispatch</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-brand-muted-soft">App Accounts</p>
            <UserCheck className="size-4 text-blue-600" />
          </div>
          <p className="mt-2 font-serif text-2xl text-blue-600">{linkedAppUsers}</p>
          <p className="text-[11px] text-brand-muted-soft mt-0.5">Mobile app logins active</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-brand-muted-soft">CDL Verified</p>
            <Award className="size-4 text-brand-accent" />
          </div>
          <p className="mt-2 font-serif text-2xl text-brand-ink">
            {drivers.filter((d) => d.cdlNumber).length}
          </p>
          <p className="text-[11px] text-brand-muted-soft mt-0.5">Licenses on file</p>
        </Card>
      </div>

      {/* ─── ROSTER TABLE ─── */}
      {drivers.length === 0 ? (
        <Card className="border-brand-rule bg-brand-card p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-brand-accent-tint flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-brand-accent" />
          </div>
          <h2 className="font-serif text-xl font-medium text-brand-ink">No drivers registered yet</h2>
          <p className="mt-1 text-sm text-brand-muted-soft max-w-md mx-auto">
            Add your drivers to assign them to loads, track HOS compliance, and process weekly settlements.
          </p>
          <div className="mt-5 inline-block">
            <AddDriverDialog workspaceMembers={members} />
          </div>
        </Card>
      ) : (
        <Card className="border-brand-rule bg-brand-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-rule bg-muted/40">
                  <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                    Driver
                  </th>
                  <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                    Account Type
                  </th>
                  <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                    CDL License & Expiration
                  </th>
                  <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                    Contact
                  </th>
                  <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                    Compensation
                  </th>
                  <th className="text-right font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                    Dispatch Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-rule">
                {drivers.map((d) => {
                  const isExpiringSoon =
                    d.cdlExpiration &&
                    new Date(d.cdlExpiration) < new Date(Date.now() + 30 * 86400000)

                  return (
                    <tr
                      key={d.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-xs text-brand-ink">
                          {d.firstName} {d.lastName}
                        </div>
                        {d.emergencyContact && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            ICE: {d.emergencyContact} {d.emergencyPhone ? `(${d.emergencyPhone})` : ""}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-xs">
                        {d.userId ? (
                          <Badge variant="outline" className="gap-1 border-blue-500 text-blue-600 dark:text-blue-400 text-[11px]">
                            <UserCheck className="size-3" />
                            App Account
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-muted-foreground text-[11px]">
                            Fleet Record Only
                          </Badge>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-xs font-mono">
                        {d.cdlNumber ? (
                          <div>
                            <span className="font-medium text-foreground">
                              {d.cdlNumber} {d.cdlState ? `(${d.cdlState})` : ""}
                            </span>
                            {d.cdlExpiration && (
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                                {isExpiringSoon && <AlertTriangle className="size-3 text-amber-500" />}
                                <span>Exp: {new Date(d.cdlExpiration).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
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
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
