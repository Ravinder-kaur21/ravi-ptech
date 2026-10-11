import { requireAdmin, getAdminStats } from "@/lib/dal"
import { getSession } from "@/lib/dal"
import { SectionCards } from "@/components/admin/section-cards"
import { ChartAreaInteractive } from "@/components/admin/chart-area-interactive"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShieldCheck, ArrowUpRight, ScrollText, Users, Building2, type LucideIcon } from "lucide-react"
import Link from "next/link"

export const instant = false

export default async function AdminHomePage() {
  console.log("[ADMIN/HOME] rendering")
  const [admin, stats, session] = await Promise.all([
    requireAdmin(),
    getAdminStats(),
    getSession(),
  ])
  const impersonatedBy = (session?.session as any)?.impersonatedBy ?? null
  console.log("[ADMIN/HOME] stats:", stats)

  return (
    <>
      {/* ── Page title row (replaces the old bespoke header) ── */}
      <div className="px-4 lg:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="size-1.5 shrink-0 rounded-full bg-brand-accent" />
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-ink">
                SUPERADMIN CONSOLE
              </span>
              <span className="font-mono text-[10px] tracking-[0.04em] text-brand-muted-soft">
                · SYSTEM-WIDE OVERVIEW
              </span>
            </div>
            <h1 className="mt-2 font-serif text-[clamp(28px,3.5vw,40px)] leading-[1.05] tracking-tight text-brand-ink">
              Welcome back, <span className="italic text-brand-accent">{admin.userName.split(" ")[0]}</span>.
            </h1>
            <p className="mt-1.5 max-w-2xl text-[13px] text-brand-ink/70">
              Every user, every workspace, every audit event — in one place.
              Use with care. Every action is logged.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-brand-rule bg-brand-card font-mono text-[10px] uppercase tracking-[0.04em]">
              <ShieldCheck className="mr-1 size-3" />
              v1
            </Badge>
          </div>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <SectionCards stats={stats} impersonatedBy={impersonatedBy} />

      {/* ── Signups chart ── */}
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>

      {/* ── Quick actions + safety card (the "row 3" from the old design) ── */}
      <div className="grid gap-4 px-4 lg:px-6 @5xl/main:grid-cols-3">
        <Card className="border-brand-rule bg-brand-card @xl/main:col-span-2">
          <CardHeader>
            <CardTitle className="font-serif text-lg tracking-tight text-brand-ink">
              <span className="italic text-brand-accent">Quick actions</span>
            </CardTitle>
            <CardDescription className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
              The four actions you'll use most
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <QuickAction
              href="/admin/users"
              icon={Users}
              label="Manage users"
              hint="Search, ban, suspend, impersonate, set role, delete"
            />
            <QuickAction
              href="/admin/workspaces"
              icon={Building2}
              label="Manage workspaces"
              hint="View every organization across every tenant"
            />
            <QuickAction
              href="/admin/appeals"
              icon={ShieldCheck}
              label="Review appeals"
              hint={`${stats.openAppeals} open · ${stats.suspendedUsers} active suspensions`}
            />
            <QuickAction
              href="/admin/audit"
              icon={ScrollText}
              label="Audit log"
              hint="Trace every admin action across the platform"
            />
          </CardContent>
        </Card>

        <Card className="border-brand-rule bg-brand-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-lg tracking-tight text-brand-ink">
              <ShieldCheck className="size-4 text-brand-accent" />
              <span>
                <span className="italic text-brand-accent">Safety</span> reminders
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-[12.5px] text-brand-ink/80">
            <SafetyLine>
              <strong className="text-brand-ink">Impersonation</strong> lasts 30
              minutes. The amber banner at the top of every screen tells you
              when it's active.
            </SafetyLine>
            <SafetyLine>
              <strong className="text-brand-ink">Banning</strong> revokes all
              sessions immediately and offers no appeal screen — the user
              cannot get back in until you unban them.
            </SafetyLine>
            <SafetyLine>
              <strong className="text-brand-ink">Deleting a user</strong>{" "}
              cascades through sessions, accounts, memberships, and
              invitations. There is no undo.
            </SafetyLine>
            <SafetyLine>
              <strong className="text-brand-ink">Deleting a workspace</strong>{" "}
              removes the org and every tenant record (loads, drivers,
              invoices, …). There is no undo.
            </SafetyLine>
            <Button
              render={<Link href="/admin/audit" />}
              variant="outline"
              size="sm"
              className="mt-2 h-8 w-full border-brand-rule text-brand-ink hover:bg-brand-cream-soft"
            >
              Open the audit log
              <ArrowUpRight className="ml-1.5 size-3.5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function QuickAction({
  href,
  icon: Icon,
  label,
  hint,
}: {
  href: string
  icon: LucideIcon
  label: string
  hint: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg border border-brand-rule bg-brand-card p-3 transition-all hover:border-brand-ink/30 hover:shadow-sm"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-ink text-brand-cream">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-brand-ink">{label}</p>
        <p className="line-clamp-1 text-[11px] text-brand-muted-soft">{hint}</p>
      </div>
      <ArrowUpRight className="size-4 text-brand-muted-soft transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-ink" />
    </Link>
  )
}

function SafetyLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 border-l-2 border-brand-rule pl-3 leading-relaxed">
      <span className="block">{children}</span>
    </div>
  )
}
