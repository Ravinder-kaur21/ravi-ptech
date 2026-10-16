"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { usePermissions } from "@/lib/permissions-context"
import { PRESETS, presetKeys } from "@/lib/role-presets"
import { ALL_PERMISSION_KEYS, MODULE_GROUPS, type PermissionEntry } from "@/lib/permissions-catalog"
import { type RoleId } from "@/lib/auth-roles"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { TeamSubNav } from "@/components/settings/team-subnav"
import { CreateRoleDialog } from "@/components/settings/create-role-dialog"
import {
  KeyRound,
  Plus,
  ChevronRight,
  ShieldCheck,
  Search,
  Check,
  Minus,
  Sparkles,
  Info,
  SlidersHorizontal,
  Table as TableIcon,
  LayoutGrid,
  Users,
  Shield,
  Truck,
  FileText,
  BadgeDollarSign,
} from "lucide-react"
import { cn } from "@/lib/utils"

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

const COMPARISON_ROLES: { id: RoleId; label: string; short: string; color: string }[] = [
  { id: "dispatcher", label: "Dispatcher", short: "Disp", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { id: "safety", label: "Safety Officer", short: "Safety", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { id: "accounting", label: "Accounting", short: "Acct", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { id: "driver", label: "Driver", short: "Driver", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { id: "admin", label: "Administrator", short: "Admin", color: "bg-slate-100 text-slate-800 border-slate-200" },
  { id: "owner", label: "Owner", short: "Owner", color: "bg-brand-accent-tint text-brand-accent border-brand-accent/20" },
]

export function RolesMasterClient() {
  const router = useRouter()
  const perms = usePermissions()
  const canManage = perms.has("users.roles.manage")

  const [activeView, setActiveView] = React.useState<"cards" | "matrix">("cards")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedModule, setSelectedModule] = React.useState<string>("all")

  const { data, isLoading } = useQuery<RolesResponse>({
    queryKey: ["roles-list"],
    queryFn: async () => {
      const r = await fetch("/api/settings/roles-summary")
      if (!r.ok) throw new Error("Failed to load")
      return r.json()
    },
  })

  // Pre-calculate preset sets for each comparison role
  const rolePresetSets = React.useMemo(() => {
    const map = new Map<RoleId, Set<string>>()
    for (const r of COMPARISON_ROLES) {
      map.set(r.id, presetKeys(r.id, ALL_PERMISSION_KEYS))
    }
    return map
  }, [])

  // Filter modules and keys for matrix view
  const filteredModules = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return MODULE_GROUPS.map((group) => {
      if (selectedModule !== "all" && group.module !== selectedModule) {
        return null
      }
      const matchedKeys = group.keys.filter((k) => {
        if (!q) return true
        return (
          k.key.toLowerCase().includes(q) ||
          k.label.toLowerCase().includes(q) ||
          k.description.toLowerCase().includes(q)
        )
      })
      if (matchedKeys.length === 0) return null
      return {
        ...group,
        keys: matchedKeys,
      }
    }).filter(Boolean) as (typeof MODULE_GROUPS[number])[]
  }, [searchQuery, selectedModule])

  const totalMatchingKeys = React.useMemo(() => {
    return filteredModules.reduce((acc, m) => acc + m.keys.length, 0)
  }, [filteredModules])

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Sub-navigation bridging Team, Invites, and Roles */}
      <TeamSubNav activeTab="roles" />

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
              <KeyRound className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
              Role Presets <span className="italic text-brand-accent">& Permissions Matrix</span>
            </h1>
          </div>
          <p className="text-sm text-brand-ink/80 max-w-2xl">
            Role presets set baseline access. Customise per teammate in{" "}
            <Link href="/settings/team" className="text-brand-accent underline font-medium">Team Roster</Link>.
          </p>
        </div>

        {canManage && (
          <CreateRoleDialog
            trigger={
              <Button className="h-10 gap-1.5 rounded-full bg-brand-ink px-5 text-sm font-medium text-brand-cream hover:bg-brand-ink-soft shrink-0 self-start sm:self-auto">
                <Plus className="h-4 w-4" />
                Create custom role
              </Button>
            }
          />
        )}
      </div>

      {/* Insight Explainer Card: Clarifying the distinction between Roles and Member Overrides */}
      <div className="rounded-xl border border-brand-rule bg-gradient-to-r from-brand-card via-brand-card to-brand-cream/30 p-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent mt-0.5">
            <Info className="size-4" />
          </div>
          <div className="space-y-1 text-xs text-brand-ink/80 flex-1">
            <p className="font-semibold text-brand-ink text-sm">
              How Access Works
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-2.5 rounded-lg bg-brand-cream/50 border border-brand-rule">
                <p className="font-medium text-brand-ink flex items-center gap-1.5">
                  <span className="flex size-4 items-center justify-center rounded-full bg-brand-accent text-brand-cream text-[10px] font-bold">1</span>
                  Blueprints
                </p>
                <p className="text-[11px] text-brand-muted-soft mt-0.5">
                  Presets for dispatch, safety, drivers, and billing.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-brand-cream/50 border border-brand-rule">
                <p className="font-medium text-brand-ink flex items-center gap-1.5">
                  <span className="flex size-4 items-center justify-center rounded-full bg-brand-accent text-brand-cream text-[10px] font-bold">2</span>
                  Overrides
                </p>
                <p className="text-[11px] text-brand-muted-soft mt-0.5">
                  Grant or block actions per member.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-brand-cream/50 border border-brand-rule">
                <p className="font-medium text-brand-ink flex items-center gap-1.5">
                  <span className="flex size-4 items-center justify-center rounded-full bg-brand-accent text-brand-cream text-[10px] font-bold">3</span>
                  Custom
                </p>
                <p className="text-[11px] text-brand-muted-soft mt-0.5">
                  Save templates for unique roles.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Starter Roles"
          value={String(data?.starter.length ?? 6)}
          sub="Pre-tuned TMS personas"
          isLoading={isLoading}
        />
        <StatCard
          label="Custom Roles"
          value={String(data?.custom.length ?? 0)}
          sub="Workspace defined"
          isLoading={isLoading}
        />
        <StatCard
          label="Operational Modules"
          value={String(MODULE_GROUPS.length)}
          sub="Loads, Fleet, Billing, etc."
          isLoading={false}
        />
        <StatCard
          label="Catalog Action Gates"
          value={String(ALL_PERMISSION_KEYS.length)}
          sub="Granular security keys"
          isLoading={false}
        />
      </div>

      {/* View Mode Toggle: Cards vs Matrix */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-brand-rule pb-3">
        <div className="flex items-center gap-2">
          <Button
            variant={activeView === "cards" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveView("cards")}
            className={cn(
              "h-8 gap-1.5 text-xs font-medium rounded-lg",
              activeView === "cards"
                ? "bg-brand-ink text-brand-cream"
                : "border-brand-rule text-brand-ink hover:bg-brand-cream/50"
            )}
          >
            <LayoutGrid className="size-3.5" />
            Role Profiles & Blueprints
          </Button>

          <Button
            variant={activeView === "matrix" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveView("matrix")}
            className={cn(
              "h-8 gap-1.5 text-xs font-medium rounded-lg",
              activeView === "matrix"
                ? "bg-brand-ink text-brand-cream"
                : "border-brand-rule text-brand-ink hover:bg-brand-cream/50"
            )}
          >
            <TableIcon className="size-3.5" />
            130-Key Comparison Matrix
          </Button>
        </div>

        {activeView === "matrix" && (
          <div className="flex items-center gap-2 text-xs text-brand-muted-soft">
            <span className="flex items-center gap-1 font-mono">
              <span className="size-2 rounded-full bg-emerald-500 inline-block" /> Included in Preset
            </span>
            <span>·</span>
            <span className="flex items-center gap-1 font-mono">
              <span className="size-2 rounded-full bg-slate-300 inline-block" /> Disabled
            </span>
          </div>
        )}
      </div>

      {/* VIEW 1: Role Profiles & Cards */}
      {activeView === "cards" && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-44 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(data?.starter ?? []).map((r) => {
                const preset = PRESETS[r.role as RoleId]
                const icon = getRoleIcon(r.role)
                return (
                  <div
                    key={r.role}
                    className="flex flex-col justify-between rounded-xl border border-brand-rule bg-brand-card p-5 hover:border-brand-ink/30 transition-all shadow-xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent shrink-0">
                            {icon}
                          </div>
                          <div>
                            <h2 className="font-semibold text-brand-ink text-sm">
                              {r.label}
                            </h2>
                            <p className="text-[11px] font-mono uppercase tracking-wider text-brand-muted-soft">
                              {r.role}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className="font-mono text-[11px] px-2 py-0.5 bg-brand-cream/80 text-brand-ink"
                        >
                          {r.onCount} / {ALL_PERMISSION_KEYS.length} ON
                        </Badge>
                      </div>

                      <p className="text-xs text-brand-ink/80 mt-2.5 line-clamp-2 leading-relaxed">
                        {r.description || preset?.description}
                      </p>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-brand-rule flex items-center justify-between">
                      <Link
                        href={`/settings/team`}
                        className="text-[11px] text-brand-muted-soft hover:text-brand-ink flex items-center gap-1.5 transition-colors"
                      >
                        <Users className="size-3" />
                        <span>{r.memberCount} active member{r.memberCount === 1 ? "" : "s"}</span>
                      </Link>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/settings/roles/${r.role}`)}
                        className="h-7 px-2 text-xs font-medium text-brand-accent hover:bg-brand-accent-tint hover:text-brand-accent gap-1"
                      >
                        Inspect Template
                        <ChevronRight className="size-3" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Custom Roles Section if any */}
          {data?.custom && data.custom.length > 0 && (
            <div className="space-y-3 pt-4">
              <h2 className="text-xs font-mono uppercase tracking-wider text-brand-muted-soft">
                Custom Workspace Roles ({data.custom.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.custom.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col justify-between rounded-xl border border-blue-200 bg-blue-50/20 p-5 hover:border-blue-300 transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                            <KeyRound className="size-4" />
                          </div>
                          <div>
                            <h2 className="font-semibold text-brand-ink text-sm flex items-center gap-1.5">
                              {r.label}
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 font-mono">
                                custom
                              </span>
                            </h2>
                            <p className="text-[11px] font-mono text-brand-muted-soft">
                              {r.role}
                            </p>
                          </div>
                        </div>
                        <Badge className="font-mono text-[11px] bg-blue-100 text-blue-800">
                          {r.onCount} ON
                        </Badge>
                      </div>
                      <p className="text-xs text-brand-ink/80 mt-2 line-clamp-2">
                        {r.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-blue-100 flex items-center justify-between">
                      <span className="text-[11px] text-brand-muted-soft">
                        {r.memberCount} member{r.memberCount === 1 ? "" : "s"}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/settings/roles/${r.role}`)}
                        className="h-7 px-2 text-xs font-medium text-blue-700 hover:bg-blue-100"
                      >
                        Edit Role
                        <ChevronRight className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Interactive 130-Key Comparison Matrix */}
      {activeView === "matrix" && (
        <div className="space-y-4">
          {/* Toolbar: Search and Module Pills */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl border border-brand-rule bg-brand-card">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-muted-soft" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across all 130 keys (e.g. rate_con, dispatch)..."
                className="h-9 pl-9 text-xs bg-brand-cream/40 border-brand-rule focus:bg-brand-card"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-brand-muted-soft hover:text-brand-ink"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Module selection pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs">
              <button
                onClick={() => setSelectedModule("all")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors",
                  selectedModule === "all"
                    ? "bg-brand-ink text-brand-cream font-semibold"
                    : "text-brand-muted-soft hover:bg-brand-cream/80 hover:text-brand-ink"
                )}
              >
                All Modules ({totalMatchingKeys})
              </button>
              {MODULE_GROUPS.map((g) => (
                <button
                  key={g.module}
                  onClick={() => setSelectedModule(g.module)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors",
                    selectedModule === g.module
                      ? "bg-brand-ink text-brand-cream font-semibold"
                      : "text-brand-muted-soft hover:bg-brand-cream/80 hover:text-brand-ink"
                  )}
                >
                  {g.label.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Matrix Table */}
          <div className="rounded-xl border border-brand-rule bg-brand-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-brand-rule bg-brand-cream/50">
                    <th className="py-3 px-4 font-semibold text-brand-ink min-w-[320px]">
                      Operational Permission Key ({totalMatchingKeys})
                    </th>
                    {COMPARISON_ROLES.map((r) => (
                      <th
                        key={r.id}
                        className="py-3 px-3 text-center font-medium min-w-[90px] border-l border-brand-rule/60"
                      >
                        <span className={cn("inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold border", r.color)}>
                          {r.short}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-rule">
                  {filteredModules.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-brand-muted-soft">
                        No permissions match &quot;{searchQuery}&quot;. Try a different keyword or reset filters.
                      </td>
                    </tr>
                  ) : (
                    filteredModules.map((group) => (
                      <React.Fragment key={group.module}>
                        {/* Group Category Header */}
                        <tr className="bg-brand-cream/30 border-y border-brand-rule">
                          <td
                            colSpan={7}
                            className="py-2 px-4 font-semibold text-brand-ink text-[11px] font-mono uppercase tracking-wider flex items-center justify-between"
                          >
                            <span>{group.label}</span>
                            <span className="text-brand-muted-soft normal-case text-[10px]">
                              {group.keys.length} actions
                            </span>
                          </td>
                        </tr>

                        {/* Individual Keys */}
                        {group.keys.map((k) => {
                          const dimLabel =
                            k.dimension === "a"
                              ? "Module"
                              : k.dimension === "b"
                              ? "Visibility"
                              : k.dimension === "c"
                              ? "Field"
                              : "Action"

                          return (
                            <tr
                              key={k.key}
                              className="hover:bg-brand-cream/20 transition-colors"
                            >
                              <td className="py-2.5 px-4">
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className="font-medium text-brand-ink">
                                    {k.label}
                                  </span>
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-cream-soft border border-brand-rule text-brand-muted-soft shrink-0">
                                    {dimLabel}
                                  </span>
                                </div>
                                <p className="text-[11px] text-brand-muted-soft font-mono mt-0.5 truncate">
                                  {k.key}
                                </p>
                              </td>

                              {/* Role checkmarks */}
                              {COMPARISON_ROLES.map((r) => {
                                const isEnabled = rolePresetSets.get(r.id)?.has(k.key) ?? false
                                return (
                                  <td
                                    key={r.id}
                                    className="py-2.5 px-3 text-center border-l border-brand-rule/60"
                                  >
                                    {isEnabled ? (
                                      <span
                                        className="inline-flex size-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
                                        title={`${r.label}: Allowed`}
                                      >
                                        <Check className="size-3 stroke-[2.5]" />
                                      </span>
                                    ) : (
                                      <span
                                        className="inline-flex size-5 items-center justify-center text-brand-muted-soft/40"
                                        title={`${r.label}: Blocked`}
                                      >
                                        <Minus className="size-3" />
                                      </span>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs text-brand-muted-soft pt-2">
        <p>All permission checks are enforced strictly server-side and recorded in the audit trail.</p>
        <Link href="/settings/audit" className="hover:text-brand-ink underline transition-colors">
          View Security Audit Log
        </Link>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  isLoading,
}: {
  label: string
  value: string
  sub: string
  isLoading: boolean
}) {
  return (
    <div className="rounded-xl border border-brand-rule bg-brand-card p-4 shadow-xs">
      <p className="text-[11px] font-mono uppercase tracking-[0.06em] text-brand-muted-soft">
        {label}
      </p>
      <p className="mt-1 font-serif text-2xl text-brand-ink">
        {isLoading ? "—" : value}
      </p>
      <p className="text-[10px] text-brand-muted-soft mt-0.5">{sub}</p>
    </div>
  )
}

function getRoleIcon(role: string) {
  switch (role) {
    case "dispatcher":
      return <Truck className="size-4" />
    case "safety":
      return <Shield className="size-4" />
    case "accounting":
    case "billing":
      return <BadgeDollarSign className="size-4" />
    case "driver":
      return <Truck className="size-4" />
    case "admin":
      return <ShieldCheck className="size-4" />
    default:
      return <KeyRound className="size-4" />
  }
}
