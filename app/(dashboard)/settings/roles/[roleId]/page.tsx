"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { usePermissions } from "@/lib/permissions-context"
import { PRESETS } from "@/lib/role-presets"
import {
  ALL_PERMISSION_KEYS,
  type ModuleGroup,
} from "@/lib/permissions-catalog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  ArrowLeft,
  Search,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleCheck,
} from "lucide-react"

type RolePermResponse = {
  role: string
  label: string
  oneLiner: string
  description: string
  effectiveKeys: string[]
  memberCount: number
  modules: ModuleGroup[]
}

export default function RoleDetailPage() {
  const params = useParams<{ roleId: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const perms = usePermissions()
  const canManage = perms.has("users.roles.manage")
  const roleId = decodeURIComponent(params.roleId)

  const preset = PRESETS[roleId as keyof typeof PRESETS]

  const { data, isLoading } = useQuery<RolePermResponse>({
    queryKey: ["role-permissions", roleId],
    queryFn: async () => {
      const r = await fetch(
        `/api/settings/role-permissions?roleId=${encodeURIComponent(roleId)}`
      )
      if (!r.ok) throw new Error("Failed to load")
      return r.json()
    },
  })

  const [filter, setFilter] = React.useState("")
  const [openModules, setOpenModules] = React.useState<Record<string, boolean>>(
    () => Object.fromEntries((data?.modules ?? []).map((m, i) => [m.module, i < 2]))
  )

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    )
  }

  const effectiveSet = new Set(data.effectiveKeys)

  return (
    <div className="space-y-6">
      <Link
        href="/settings/roles"
        className="inline-flex items-center gap-1.5 text-[13px] text-brand-muted-soft hover:text-brand-ink"
      >
        <ArrowLeft className="size-3.5" />
        Roles
      </Link>

      <div className="rounded-xl border border-brand-rule bg-brand-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent shrink-0">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <h1 className="font-serif text-[24px] tracking-tight text-brand-ink">
                {data.label}
              </h1>
              <p className="mt-1 text-[13px] text-brand-ink/80 max-w-prose">
                {data.description}
              </p>
            </div>
          </div>
          <Badge className="bg-brand-accent-tint text-brand-accent text-[12px] font-medium px-2.5 py-0.5 shrink-0">
            {data.effectiveKeys.length} of {ALL_PERMISSION_KEYS.length} ON
          </Badge>
        </div>
        <p className="mt-4 text-[12px] text-brand-muted-soft">
          Used by {data.memberCount} workspace member{data.memberCount === 1 ? "" : "s"}.
        </p>
      </div>

      {preset && (
        <div className="rounded-lg border border-brand-rule bg-brand-card p-4 text-[13px] text-brand-ink/80">
          <p>
            This is a <strong>starter role</strong>. To customize it, create a
            custom role and clone it from this preset.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-brand-rule bg-brand-card overflow-hidden">
        <div className="border-b border-brand-rule p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-muted-soft" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter permissions…"
              className="h-9 pl-9 text-[13px] bg-brand-card border-brand-rule"
            />
          </div>
        </div>

        <ul className="divide-y divide-brand-rule">
          {data.modules
            .map((m) => ({
              ...m,
              keys: m.keys.filter((k) =>
                !filter ||
                `${k.key} ${k.label} ${k.description}`
                  .toLowerCase()
                  .includes(filter.toLowerCase())
              ),
            }))
            .filter((m) => m.keys.length > 0)
            .map((m) => {
              const open = openModules[m.module] ?? false
              return (
                <li key={m.module}>
                  <button
                    onClick={() =>
                      setOpenModules((s) => ({ ...s, [m.module]: !s[m.module] }))
                    }
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-brand-cream/40 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      {open ? (
                        <ChevronDown className="size-4 text-brand-muted-soft" />
                      ) : (
                        <ChevronRight className="size-4 text-brand-muted-soft" />
                      )}
                      <span className="text-[13px] font-semibold text-brand-ink">
                        {m.label}
                      </span>
                      <span className="text-[11px] text-brand-muted-soft">
                        (
                        {m.keys.filter((k) => data.effectiveKeys.includes(k.key)).length}/
                        {m.keys.length} ON)
                      </span>
                    </div>
                  </button>
                  {open && (
                    <ul className="px-4 pb-3 divide-y divide-brand-rule-soft">
                      {m.keys.map((k) => {
                        const isOn = data.effectiveKeys.includes(k.key)
                        const dimLabel = ["Module", "View", "Field", "Action"][
                          ["a", "b", "c", "d"].indexOf(k.dimension)
                        ]
                        return (
                          <li
                            key={k.key}
                            className="py-2 flex items-center gap-3"
                          >
                            {isOn ? (
                              <CircleCheck className="size-3.5 text-emerald-700 shrink-0" />
                            ) : (
                              <Circle className="size-3.5 text-brand-muted-soft shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] text-brand-ink">
                                {k.label}
                              </p>
                              <p className="text-[11px] text-brand-muted-soft">
                                <span className="font-mono">{k.key}</span>
                                <span className="mx-1.5">·</span>
                                {dimLabel}
                              </p>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
        </ul>
      </div>

      <p className="text-[12px] text-brand-muted-soft">
        All role changes are recorded in the audit log.
      </p>
    </div>
  )
}
