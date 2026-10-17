import { redirect } from "next/navigation"
import Link from "next/link"
import {
  Users,
  Phone,
  Mail,
  Award,
  CheckCircle2,
  UserCheck,
  ShieldAlert,
  AlertTriangle,
  UserPlus,
  ArrowRight,
  Sparkles,
  Smartphone,
  FileCheck2,
} from "lucide-react"
import {
  getSession,
  getDriversWithDetailsForOrg,
  getWorkspaceMembersForDriverAssignment,
} from "@/lib/dal"
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
            Professional <span className="italic text-[#d9622b]">Drivers</span>
          </h1>
          <p className="mt-1 text-sm text-[#73757a]">
            Manage commercial driver rosters, CDL credentials, mobile app assignments, and payroll compensation.
          </p>
        </div>
        <AddDriverDialog workspaceMembers={members} />
      </div>

      {/* ─── KPI STATS HUD ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 p-4 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <p className="font-mono text-[10px] uppercase font-semibold tracking-wider text-[#8a8b8f]">
              Total Fleet Roster
            </p>
            <Users className="size-4 text-[#d9622b]" />
          </div>
          <p className="mt-2 font-serif text-2xl font-bold text-[#16181d] dark:text-zinc-100">
            {drivers.length}
          </p>
          <p className="text-[11px] text-[#73757a] mt-0.5">Commercial drivers on roster</p>
        </Card>

        <Card className="border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 p-4 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <p className="font-mono text-[10px] uppercase font-semibold tracking-wider text-[#8a8b8f]">
              Active for Dispatch
            </p>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-serif text-2xl font-bold text-emerald-600">
            {activeDrivers.length}
          </p>
          <p className="text-[11px] text-[#73757a] mt-0.5">Ready for trip assignment</p>
        </Card>

        <Card className="border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 p-4 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <p className="font-mono text-[10px] uppercase font-semibold tracking-wider text-[#8a8b8f]">
              Mobile App Logins
            </p>
            <Smartphone className="size-4 text-blue-600" />
          </div>
          <p className="mt-2 font-serif text-2xl font-bold text-blue-600">
            {linkedAppUsers}
          </p>
          <p className="text-[11px] text-[#73757a] mt-0.5">Active mobile app logins</p>
        </Card>

        <Card className="border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 p-4 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <p className="font-mono text-[10px] uppercase font-semibold tracking-wider text-[#8a8b8f]">
              CDL Compliant
            </p>
            <Award className="size-4 text-[#d9622b]" />
          </div>
          <p className="mt-2 font-serif text-2xl font-bold text-[#16181d] dark:text-zinc-100">
            {drivers.filter((d) => d.cdlNumber).length}
          </p>
          <p className="text-[11px] text-[#73757a] mt-0.5">Verified licenses on file</p>
        </Card>
      </div>

      {/* ─── ROSTER TABLE OR TWO-PATH ONBOARDING GUIDE ─── */}
      {drivers.length === 0 ? (
        <Card className="border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 p-8 sm:p-12 shadow-sm">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <div className="size-14 rounded-full bg-[#fff0e6] dark:bg-orange-950/40 text-[#d9622b] flex items-center justify-center mx-auto shadow-xs">
              <Users className="size-7" />
            </div>

            <div>
              <h2 className="font-serif text-2xl font-normal text-[#16181d] dark:text-zinc-100">
                Commercial Driver <span className="italic text-[#d9622b]">Roster</span>
              </h2>
              <p className="mt-1 text-sm text-[#73757a]">
                In Muvx TMS, drivers can be added in two industry-standard ways depending on your fleet setup:
              </p>
            </div>

            {/* Two-Path Comparison Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-2">
              {/* Path 1: Quick Fleet Record */}
              <div className="p-4 rounded-2xl border border-[#d1ccc5] dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="size-6 rounded-full bg-[#eee9df] dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-[#16181d] dark:text-zinc-200">
                      1
                    </span>
                    <span className="font-semibold text-sm text-[#16181d] dark:text-zinc-100">
                      Quick Fleet Record
                    </span>
                  </div>
                  <p className="text-xs text-[#73757a]">
                    Register company or 1099 drivers with CDL, phone, and pay rate. Immediately assign them to dispatches and payroll without requiring mobile app login.
                  </p>
                </div>
                <div className="pt-2">
                  <AddDriverDialog workspaceMembers={members} />
                </div>
              </div>

              {/* Path 2: Invite App User */}
              <div className="p-4 rounded-2xl border border-[#d1ccc5] dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="size-6 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center text-xs font-bold">
                      2
                    </span>
                    <span className="font-semibold text-sm text-[#16181d] dark:text-zinc-100">
                      Invite to Mobile App
                    </span>
                  </div>
                  <p className="text-xs text-[#73757a]">
                    Invite drivers by email to your workspace team. They can sign in to the mobile driver web app, view dispatches, and upload delivery PODs.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/settings/team"
                    className="inline-flex items-center gap-1.5 h-9 rounded-full border border-[#d1ccc5] dark:border-zinc-700 bg-[#f7f3ec] dark:bg-zinc-800 px-4 text-xs font-medium text-[#16181d] dark:text-zinc-200 hover:border-[#d9622b] transition-colors"
                  >
                    <UserPlus className="size-3.5" />
                    <span>Invite Team Member</span>
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 overflow-hidden shadow-xs rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e4ddd3] dark:border-zinc-800 bg-[#f7f3ec]/80 dark:bg-zinc-900/60">
                  <th className="text-left font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                    Driver Identity
                  </th>
                  <th className="text-left font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                    App Access
                  </th>
                  <th className="text-left font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                    CDL License & Expiration
                  </th>
                  <th className="text-left font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                    Contact & Phone
                  </th>
                  <th className="text-left font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                    Settlement Rate
                  </th>
                  <th className="text-right font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4ddd3] dark:divide-zinc-800/80">
                {drivers.map((d) => {
                  const isExpiringSoon =
                    d.cdlExpiration &&
                    new Date(d.cdlExpiration) < new Date(Date.now() + 30 * 86400000)

                  return (
                    <tr
                      key={d.id}
                      className="hover:bg-[#f7f3ec]/50 dark:hover:bg-zinc-900/40 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-full bg-[#eee9df] dark:bg-zinc-800 text-[#16181d] dark:text-zinc-200 flex items-center justify-center font-bold text-xs shrink-0">
                            {d.firstName?.[0] || "D"}
                            {d.lastName?.[0] || ""}
                          </div>
                          <div>
                            <span className="font-semibold text-xs text-[#16181d] dark:text-zinc-100">
                              {d.firstName} {d.lastName}
                            </span>
                            {d.emergencyContact && (
                              <div className="text-[11px] text-[#8a8b8f] mt-0.5 font-mono">
                                ICE: {d.emergencyContact} {d.emergencyPhone ? `(${d.emergencyPhone})` : ""}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-xs">
                        {d.userId ? (
                          <Badge
                            variant="outline"
                            className="gap-1 border-blue-500 text-blue-600 dark:text-blue-400 text-[10px] font-mono"
                          >
                            <Smartphone className="size-3" />
                            App Account
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-[#8a8b8f] text-[10px] font-mono"
                          >
                            Fleet Record Only
                          </Badge>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-xs font-mono">
                        {d.cdlNumber ? (
                          <div>
                            <span className="font-semibold text-[#16181d] dark:text-zinc-100">
                              {d.cdlNumber} {d.cdlState ? `(${d.cdlState})` : ""}
                            </span>
                            {d.cdlExpiration && (
                              <div className="flex items-center gap-1 text-[11px] text-[#8a8b8f] mt-0.5">
                                {isExpiringSoon && (
                                  <AlertTriangle className="size-3 text-amber-500" />
                                )}
                                <span>Exp: {new Date(d.cdlExpiration).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#8a8b8f]">—</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-xs">
                        <div className="space-y-0.5">
                          {d.phone && (
                            <a
                              href={`tel:${d.phone}`}
                              className="flex items-center gap-1 text-[#16181d] dark:text-zinc-200 hover:text-[#d9622b] font-mono text-[11px]"
                            >
                              <Phone className="size-3 text-[#8a8b8f] shrink-0" />
                              <span>{d.phone}</span>
                            </a>
                          )}
                          {d.email && (
                            <a
                              href={`mailto:${d.email}`}
                              className="flex items-center gap-1 text-[#8a8b8f] hover:text-[#16181d] text-[11px]"
                            >
                              <Mail className="size-3 text-[#8a8b8f] shrink-0" />
                              <span>{d.email}</span>
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-xs">
                        <div className="font-medium text-[#16181d] dark:text-zinc-100">
                          {d.payType || "Per Mile"}
                        </div>
                        {d.payRate && (
                          <div className="text-[11px] text-[#8a8b8f] font-mono">
                            {d.payType === "Percentage" ? `${d.payRate}%` : `$${d.payRate} / rate`}
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
