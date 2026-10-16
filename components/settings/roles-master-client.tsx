"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { usePermissions } from "@/lib/permissions-context"
import { PRESET_LIST } from "@/lib/role-presets"
import { ALL_PERMISSION_KEYS } from "@/lib/permissions-catalog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SettingsPageHeader } from "@/components/settings/settings-page-header"
import {
  KeyRound,
  Plus,
  ChevronRight,
  ShieldCheck,
} from "lucide-react"

type CustomRole = {
  id: string
  role: string
  label: string
  description: string
  clonedFrom: string | null
  onCount: number
  memberCount: number
}

type RolesResponse = {
  starter: { role: string; label: string; description: string; onCount: number; memberCount: number }[]
  custom: CustomRole[]
}

export function RolesMasterClient() {
  const router = useRouter()
  const perms = usePermissions()
  const canManage = perms.has("users.roles.manage")

  const { data, isLoading } = useQuery<RolesResponse>({
    queryKey: ["roles-list"],
    queryFn: async () => {
      const r = await fetch("/api/settings/roles-summary")
      if (!r.ok) throw new Error("Failed to load")
      return r.json()
    },
  })

  return (
    <div>
      <SettingsPageHeader
        kicker="Team"
        title="Roles & permissions"
        description="Six starter roles, custom roles you build, and the 130 permission keys that decide what each role can see and do."
        icon={KeyRound}
      >
        {canManage && (
          <Button
            onClick={() => router.push("/settings/roles/new")}
            className="h-10 gap-1.5 rounded-full bg-brand-ink px-5 text-[13px] font-medium text-brand-cream hover:bg-brand-ink-soft"
          >
            <Plus className="h-4 w-4" />
            Create custom role
          </Button>
        )}
      </SettingsPageHeader>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat
          label="Starter roles"
          value={String(data?.starter.length ?? "—")}
          isLoading={isLoading}
        />
        <Stat
          label="Custom roles"
          value={String(data?.custom.length ?? "—")}
          isLoading={isLoading}
        />
        <Stat
          label="Permission keys"
          value={String(ALL_PERMISSION_KEYS.length)}
          isLoading={false}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
          ))}
        </div>
      ) : data ? (
        <div className="space-y-6">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.06em] text-brand-muted-soft mb-2 px-1">
              Starter roles
            </p>
            <ul className="rounded-xl border border-brand-rule bg-brand-card overflow-hidden divide-y divide-brand-rule">
              {data.starter.map((r) => (
                <RoleRow
                  key={r.role}
                  role={r.role}
                  label={r.label}
                  description={r.description}
                  onCount={r.onCount}
                  memberCount={r.memberCount}
                  href={`/settings/roles/${r.role}`}
                />
              ))}
            </ul>
          </div>

          {data.custom.length > 0 && (
            <div>
              <p className="text-[11px] font-mono uppercase tracking-[0.06em] text-brand-muted-soft mb-2 px-1">
                Custom roles
              </p>
              <ul className="rounded-xl border border-brand-rule bg-brand-card overflow-hidden divide-y divide-brand-rule">
                {data.custom.map((r) => (
                  <RoleRow
                    key={r.role}
                    role={r.role}
                    label={r.label}
                    description={r.description}
                    onCount={r.onCount}
                    memberCount={r.memberCount}
                    href={`/settings/roles/${r.role}`}
                    isCustom
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}

      {data && (
        <p className="mt-6 text-[12px] text-brand-muted-soft">
          All role changes are recorded in the audit log.
        </p>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  isLoading,
}: {
  label: string
  value: string
  isLoading: boolean
}) {
  return (
    <div className="rounded-xl border border-brand-rule bg-brand-card p-4">
      <p className="text-[11px] font-mono uppercase tracking-[0.06em] text-brand-muted-soft">
        {label}
      </p>
      <p className="mt-1 font-serif text-2xl text-brand-ink">
        {isLoading ? "—" : value}
      </p>
    </div>
  )
}

function RoleRow({
  role,
  label,
  description,
  onCount,
  memberCount,
  href,
  isCustom = false,
}: {
  role: string
  label: string
  description: string
  onCount: number
  memberCount: number
  href: string
  isCustom?: boolean
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-4 px-5 py-4 hover:bg-brand-cream/50 transition-colors"
      >
        <div
          className={`flex size-10 items-center justify-center rounded-lg shrink-0 ${
            isCustom
              ? "bg-blue-100 text-blue-700"
              : "bg-brand-accent-tint text-brand-accent"
          }`}
        >
          {isCustom ? <KeyRound className="size-4" /> : <ShieldCheck className="size-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-brand-ink flex items-center gap-2">
            {label}
            {isCustom && (
              <span className="text-[10px] font-mono uppercase tracking-wide text-blue-700">
                custom
              </span>
            )}
          </p>
          <p className="text-[12px] text-brand-muted-soft mt-0.5 truncate">
            {description}
          </p>
          <p className="text-[11px] text-brand-muted-soft mt-1 flex items-center gap-2">
            <span>
              {memberCount} member{memberCount === 1 ? "" : "s"}
            </span>
            <span>·</span>
            <span>
              {onCount}/{ALL_PERMISSION_KEYS.length} ON
            </span>
          </p>
        </div>
        <ChevronRight className="size-4 text-brand-muted-soft shrink-0" />
      </Link>
    </li>
  )
}
