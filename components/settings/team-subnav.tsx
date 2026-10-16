"use client"

import * as React from "react"
import Link from "next/link"
import { Users, UserPlus, KeyRound } from "lucide-react"
import { cn } from "@/lib/utils"

export type TeamSubNavTab = "team" | "invitations" | "roles"

interface TeamSubNavProps {
  activeTab: TeamSubNavTab
  memberCount?: number
  invitationCount?: number
  roleCount?: number
  className?: string
}

export function TeamSubNav({
  activeTab,
  memberCount,
  invitationCount,
  roleCount,
  className,
}: TeamSubNavProps) {
  const tabs = [
    {
      id: "team" as const,
      label: "Team Roster",
      href: "/settings/team",
      icon: Users,
      count: memberCount,
      description: "Manage members, assign roles, & customize overrides",
    },
    {
      id: "invitations" as const,
      label: "Invitations",
      href: "/settings/team/invitations",
      icon: UserPlus,
      count: invitationCount,
      description: "Pending & past workspace invite requests",
    },
    {
      id: "roles" as const,
      label: "Role Presets & Matrix",
      href: "/settings/roles",
      icon: KeyRound,
      count: roleCount ?? 6,
      description: "Operational baseline templates & 130-key comparison",
    },
  ]

  return (
    <nav
      aria-label="Team and Access Management"
      className={cn("flex items-center gap-1.5 p-1 bg-brand-cream/60 rounded-xl border border-brand-rule max-w-fit mb-6", className)}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        const Icon = tab.icon
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all",
              isActive
                ? "bg-brand-card text-brand-ink shadow-sm border border-brand-rule font-semibold"
                : "text-brand-muted-soft hover:text-brand-ink hover:bg-brand-cream/80"
            )}
          >
            <Icon className={cn("size-3.5", isActive ? "text-brand-accent" : "text-brand-muted-soft")} />
            <span>{tab.label}</span>
            {typeof tab.count === "number" && (
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none",
                  isActive
                    ? "bg-brand-accent-tint text-brand-accent font-semibold"
                    : "bg-brand-rule-soft text-brand-muted-soft"
                )}
              >
                {tab.count}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
