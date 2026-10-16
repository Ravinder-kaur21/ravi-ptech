import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, Settings, Users, Building2, CreditCard, Plug, ShieldCheck } from "lucide-react"
import { Card } from "@/components/ui/card"
import { getSession } from "@/lib/dal"
import { cn } from "@/lib/utils"

export default async function SettingsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  const groups = [
    {
      title: "Workspace",
      description: "Name, URL, regulatory IDs, address, and ops defaults.",
      href: "/settings/workspace",
      icon: Building2,
    },
    {
      title: "Team",
      description: "Invite dispatchers, drivers, and accountants.",
      href: "/settings/team",
      icon: Users,
    },
    {
      title: "Roles & permissions",
      description: "Predefined roles and the effective permission matrix.",
      href: "/settings/roles",
      icon: ShieldCheck,
    },
    {
      title: "Billing",
      description: "Subscription, invoices, and payment methods.",
      href: "/settings/billing",
      icon: CreditCard,
      comingSoon: true,
    },
    {
      title: "Integrations",
      description: "ELD, accounting, mapping, and rate providers.",
      href: "/settings/integrations",
      icon: Plug,
      comingSoon: true,
    },
  ]

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
            <Settings className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
            <span className="italic text-brand-accent">Settings</span>
          </h1>
        </div>
        <p className="text-sm text-brand-ink/80">
          Manage your workspace, team, billing, and integrations.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {groups.map((g) => {
          const Icon = g.icon
          const inner = (
            <Card className="group h-full border-brand-rule bg-brand-card p-5 transition-colors hover:bg-brand-cream">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
                  <Icon className="h-4 w-4" strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-brand-ink">{g.title}</p>
                    {g.comingSoon && (
                      <span className="rounded-full bg-brand-cream px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-muted-soft">
                        Soon
                      </span>
                    )}
                    <ArrowRight className="h-4 w-4 text-brand-muted-soft transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-1 text-xs text-brand-muted-soft">
                    {g.description}
                  </p>
                </div>
              </div>
            </Card>
          )
          return (
            <li key={g.href}>
              {g.comingSoon ? (
                <div className={cn("cursor-not-allowed opacity-60")}>{inner}</div>
              ) : (
                <Link href={g.href} className="block">
                  {inner}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export const instant = false
