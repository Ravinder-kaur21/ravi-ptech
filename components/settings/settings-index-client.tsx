"use client"

import * as React from "react"
import Link from "next/link"
import {
  Building2,
  Users,
  KeyRound,
  CreditCard,
  Plug,
  ShieldCheck,
  History,
  UserCog,
  Paintbrush,
  ArrowUpRight,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react"
import { usePermissions } from "@/lib/permissions-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"

type SettingsCard = {
  id: string
  title: string
  description: string
  href: string
  icon: LucideIcon
  requiresKey: string
  /** Optional pre-fetched count shown in the corner of the card. */
  countKey?: "members" | "roles" | "pendingInvitations"
  /** Optional kicker label above the title. */
  kicker?: string
}

const CARDS: SettingsCard[] = [
  {
    id: "workspace",
    title: "Workspace",
    description: "Name, regulatory IDs, address, currency, and timezone.",
    href: "/settings/workspace",
    icon: Building2,
    requiresKey: "workspace.module",
  },
  {
    id: "branding",
    title: "Branding",
    description: "Logo, brand colors, and how Muvx looks to your team.",
    href: "/settings/workspace/branding",
    icon: Paintbrush,
    requiresKey: "workspace.profile.edit",
  },
  {
    id: "members",
    title: "Team members",
    description: "Invite dispatchers, drivers, and accountants.",
    href: "/settings/team",
    icon: Users,
    requiresKey: "users.module",
    countKey: "members",
  },
  {
    id: "roles",
    title: "Roles & permissions",
    description: "Starter roles, custom roles, and the permission matrix.",
    href: "/settings/roles",
    icon: KeyRound,
    requiresKey: "users.roles.manage",
    countKey: "roles",
  },
  {
    id: "invitations",
    title: "Invitations",
    description: "Pending and recent invitations to this workspace.",
    href: "/settings/team/invitations",
    icon: UserCog,
    requiresKey: "users.invite",
    countKey: "pendingInvitations",
  },
  {
    id: "integrations",
    title: "Integrations",
    description: "ELD, accounting, mapping, and rate providers.",
    href: "/settings/integrations",
    icon: Plug,
    requiresKey: "workspace.profile.view",
  },
  {
    id: "billing",
    title: "Billing",
    description: "Plan, payment methods, and invoices.",
    href: "/settings/billing",
    icon: CreditCard,
    requiresKey: "workspace.profile.view",
  },
  {
    id: "sessions",
    title: "Sessions",
    description: "Active logins and devices. Sign out everywhere.",
    href: "/settings/sessions",
    icon: ShieldCheck,
    requiresKey: "workspace.profile.view",
  },
  {
    id: "audit",
    title: "Audit log",
    description: "Every change, every login, every destructive action.",
    href: "/settings/audit",
    icon: History,
    requiresKey: "workspace.audit_log.view",
  },
]

type Counts = {
  members?: number
  roles?: number
  pendingInvitations?: number
}

export function SettingsIndexClient({
  workspaceName,
  workspaceSlug,
}: {
  workspaceName: string
  workspaceSlug: string
}) {
  const perms = usePermissions()

  // Lightweight counts (best-effort; we don't fail the page if this 403s)
  const { data: counts } = useQuery<Counts>({
    queryKey: ["settings-counts"],
    queryFn: async () => {
      const r = await fetch("/api/settings/workspace-members?status=all")
      if (!r.ok) return {}
      const j = await r.json()
      const members = (j.members ?? []).filter(
        (m: any) => !m.invitationPending
      ).length
      const pendingInvitations = (j.members ?? []).filter(
        (m: any) => m.invitationPending
      ).length
      return { members, pendingInvitations }
    },
    enabled: perms.has("users.module"),
  })

  const visibleCards = CARDS.filter((c) => perms.has(c.requiresKey))

  // Group the cards so the most-actionable ones are at the top.
  const priority = ["members", "roles", "invitations", "workspace", "branding"]
  const sorted = [...visibleCards].sort((a, b) => {
    const ai = priority.indexOf(a.id)
    const bi = priority.indexOf(b.id)
    if (ai === -1 && bi === -1) return 0
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  const firstName = workspaceName.split(/[ -]/)[0] || workspaceName
  const isOwner = perms.has("workspace.transfer_ownership")
  const greetingLine = isOwner
    ? "Everything that makes this workspace yours."
    : "The parts of this workspace you can manage."

  return (
    <div className="px-4 lg:px-10 py-8 max-w-6xl mx-auto">
      {/* Hero header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[12px] text-brand-muted-soft hover:text-brand-ink"
        >
          <ArrowLeft className="size-3.5" />
          Back to Muvx
        </Link>
        <div className="mt-4 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-brand-muted-soft">
              Settings
            </p>
            <h1 className="mt-1 font-serif text-[40px] leading-[1.05] tracking-tight text-brand-ink">
              <span className="text-brand-accent italic">{firstName}</span>{" "}
              settings.
            </h1>
            <p className="mt-2 text-[15px] text-brand-ink/80 max-w-xl">
              {greetingLine} Workspace slug:{" "}
              <span className="font-mono text-brand-ink">/{workspaceSlug}</span>
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[12px] text-brand-muted-soft">
            <div className="size-2 rounded-full bg-emerald-500" />
            All changes are recorded in the audit log.
          </div>
        </div>
      </div>

      {/* Cards grid */}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((card) => {
          const count =
            card.countKey === "members"
              ? counts?.members
              : card.countKey === "pendingInvitations"
                ? counts?.pendingInvitations
                : card.countKey === "roles"
                  ? 6 + (counts?.pendingInvitations ?? 0) > 0 ? 6 : 6
                  : undefined
          return (
            <li key={card.id} className="group">
              <Link
                href={card.href}
                className="relative flex h-full flex-col rounded-xl border border-brand-rule bg-brand-card p-5 transition-all duration-200 hover:border-brand-accent/40 hover:shadow-[0_1px_0_0_var(--brand-accent),0_8px_24px_-12px_rgba(31,25,22,0.12)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg shrink-0",
                      "bg-brand-accent-tint text-brand-accent"
                    )}
                  >
                    <card.icon className="size-5" strokeWidth={1.6} />
                  </div>
                  {typeof count === "number" && count > 0 && (
                    <span className="rounded-full bg-brand-cream px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide text-brand-ink/80 border border-brand-rule">
                      {count}
                    </span>
                  )}
                </div>
                <h2 className="mt-4 font-serif text-[20px] tracking-tight text-brand-ink">
                  {card.title}
                </h2>
                <p className="mt-1 text-[13px] text-brand-muted-soft leading-relaxed flex-1">
                  {card.description}
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-brand-accent opacity-70 group-hover:opacity-100 transition-opacity">
                  Open
                  <ArrowUpRight className="size-3.5" />
                </div>
              </Link>
            </li>
          )
        })}
      </ul>

      {/* Footer note */}
      <p className="mt-10 text-[12px] text-brand-muted-soft">
        You're seeing {visibleCards.length} of {CARDS.length} sections. Some
        sections are restricted to owners and admins.
      </p>
    </div>
  )
}