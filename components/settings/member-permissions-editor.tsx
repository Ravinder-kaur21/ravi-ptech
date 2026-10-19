"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "cn"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Search,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  ShieldOff,
  MoreHorizontal,
  Check,
  X,
  Filter,
  CheckCheck,
  Ban,
  Layers,
  ArrowUpRight,
} from "lucide-react"
import { toast } from "sonner"
import type { ModuleGroup, PermissionEntry } from "@/lib/permissions-catalog"

export interface MemberPermissionsEditorProps {
  data: {
    userId: string
    email: string
    name: string | null
    role: string
    presetLabel: string
    presetOneLiner: string
    presetKeys: string[]
    effectiveKeys: string[]
    grants?: string[]
    revokes?: string[]
    overrides?: string[]
    modules: ModuleGroup[]
  }
  canManage: boolean
  onChanged?: () => void
}

type FilterState = "all" | "overridden" | "enabled" | "disabled"

export function MemberPermissionsEditor({
  data,
  canManage,
  onChanged,
}: MemberPermissionsEditorProps) {
  const queryClient = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [selectedModule, setSelectedModule] = React.useState<string>("all")
  const [filterState, setFilterState] = React.useState<FilterState>("all")
  const [resetAllOpen, setResetAllOpen] = React.useState(false)

  const presetSet = React.useMemo(
    () => new Set(data.presetKeys),
    [data.presetKeys]
  )
  const effectiveSet = React.useMemo(
    () => new Set(data.effectiveKeys),
    [data.effectiveKeys]
  )

  // Explicit grants and revokes
  const grantsSet = React.useMemo(() => {
    if (data.grants) return new Set(data.grants)
    const set = new Set<string>()
    for (const k of data.effectiveKeys) {
      if (!presetSet.has(k)) set.add(k)
    }
    return set
  }, [data.grants, data.effectiveKeys, presetSet])

  const revokesSet = React.useMemo(() => {
    if (data.revokes) return new Set(data.revokes)
    const set = new Set<string>()
    for (const k of data.presetKeys) {
      if (!effectiveSet.has(k)) set.add(k)
    }
    return set
  }, [data.revokes, data.presetKeys, effectiveSet])

  const totalOverrides = grantsSet.size + revokesSet.size

  // Single key toggle / reset mutation
  const toggleMutation = useMutation({
    mutationFn: async ({
      key,
      action,
    }: {
      key: string
      action: "grant" | "revoke" | "default"
    }) => {
      const res = await fetch("/api/settings/member-permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: data.userId,
          action,
          key,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Failed to update permission ${key}`)
      }
      return res.json()
    },
    onMutate: async ({ key, action }) => {
      // Optimistic query update
      await queryClient.cancelQueries({
        queryKey: ["member-permissions", data.userId],
      })
      const previousData = queryClient.getQueryData<any>([
        "member-permissions",
        data.userId,
      ])

      if (previousData) {
        const nextEffective = new Set(previousData.effectiveKeys)
        const nextGrants = new Set(previousData.grants ?? [])
        const nextRevokes = new Set(previousData.revokes ?? [])
        const inPreset = presetSet.has(key)

        if (action === "default") {
          nextGrants.delete(key)
          nextRevokes.delete(key)
          if (inPreset) nextEffective.add(key)
          else nextEffective.delete(key)
        } else if (action === "grant") {
          nextGrants.add(key)
          nextRevokes.delete(key)
          nextEffective.add(key)
        } else if (action === "revoke") {
          nextRevokes.add(key)
          nextGrants.delete(key)
          nextEffective.delete(key)
        }

        queryClient.setQueryData(
          ["member-permissions", data.userId],
          (old: any) => ({
            ...old,
            effectiveKeys: Array.from(nextEffective),
            grants: Array.from(nextGrants),
            revokes: Array.from(nextRevokes),
            overrides: Array.from(nextGrants),
          })
        )
      }

      return { previousData }
    },
    onError: (err: Error, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ["member-permissions", data.userId],
          context.previousData
        )
      }
      toast.error(err.message)
    },
    onSuccess: (_res, { key, action }) => {
      if (action === "default") {
        toast.success(`Reset ${key} to ${data.presetLabel} preset`)
      } else if (action === "grant") {
        toast.success(`Granted ${key}`)
      } else {
        toast.success(`Blocked ${key}`)
      }
      onChanged?.()
    },
  })

  // Batch mutation for module-wide actions
  const batchMutation = useMutation({
    mutationFn: async (
      updates: { key: string; action: "grant" | "revoke" | "default" }[]
    ) => {
      const res = await fetch("/api/settings/member-permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: data.userId,
          action: "batch",
          updates,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || "Batch update failed")
      }
      return res.json()
    },
    onSuccess: (_res, updates) => {
      toast.success(`Updated ${updates.length} permissions`)
      queryClient.invalidateQueries({
        queryKey: ["member-permissions", data.userId],
      })
      onChanged?.()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // Reset ALL overrides
  const resetAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/settings/member-permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: data.userId,
          action: "reset",
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || "Failed to reset permissions")
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(`Reset all overrides to ${data.presetLabel} defaults`)
      setResetAllOpen(false)
      queryClient.invalidateQueries({
        queryKey: ["member-permissions", data.userId],
      })
      onChanged?.()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // Handlers for single toggle
  const handleToggle = (key: string) => {
    if (!canManage || toggleMutation.isPending) return
    const isCurrentlyOn = effectiveSet.has(key)
    const inPreset = presetSet.has(key)
    const willBeOn = !isCurrentlyOn

    // If new state matches role preset, simply clear the override back to default!
    if (willBeOn === inPreset) {
      toggleMutation.mutate({ key, action: "default" })
    } else if (willBeOn) {
      toggleMutation.mutate({ key, action: "grant" })
    } else {
      toggleMutation.mutate({ key, action: "revoke" })
    }
  }

  const handleResetKey = (key: string) => {
    if (!canManage || toggleMutation.isPending) return
    toggleMutation.mutate({ key, action: "default" })
  }

  // Module batch handlers
  const handleModuleAction = (
    module: ModuleGroup,
    action: "enable_all" | "disable_all" | "reset_defaults"
  ) => {
    if (!canManage || batchMutation.isPending) return
    const updates: { key: string; action: "grant" | "revoke" | "default" }[] =
      []

    for (const item of module.keys) {
      const inPreset = presetSet.has(item.key)
      if (action === "reset_defaults") {
        if (grantsSet.has(item.key) || revokesSet.has(item.key)) {
          updates.push({ key: item.key, action: "default" })
        }
      } else if (action === "enable_all") {
        if (!effectiveSet.has(item.key)) {
          if (inPreset) {
            updates.push({ key: item.key, action: "default" })
          } else {
            updates.push({ key: item.key, action: "grant" })
          }
        }
      } else if (action === "disable_all") {
        if (effectiveSet.has(item.key)) {
          if (inPreset) {
            updates.push({ key: item.key, action: "revoke" })
          } else {
            updates.push({ key: item.key, action: "default" })
          }
        }
      }
    }

    if (updates.length === 0) {
      toast.info("All permissions in this module are already in that state.")
      return
    }

    batchMutation.mutate(updates)
  }

  // Filter modules and keys
  const filteredModules = React.useMemo(() => {
    const s = search.trim().toLowerCase()

    return data.modules
      .filter((m) => selectedModule === "all" || m.module === selectedModule)
      .map((m) => {
        const filteredKeys = m.keys.filter((k) => {
          // Search query
          if (s) {
            const matches =
              k.key.toLowerCase().includes(s) ||
              k.label.toLowerCase().includes(s) ||
              k.description.toLowerCase().includes(s)
            if (!matches) return false
          }

          // State filter
          const isEffective = effectiveSet.has(k.key)
          const isOverridden = grantsSet.has(k.key) || revokesSet.has(k.key)

          if (filterState === "overridden" && !isOverridden) return false
          if (filterState === "enabled" && !isEffective) return false
          if (filterState === "disabled" && isEffective) return false

          return true
        })

        return {
          ...m,
          keys: filteredKeys,
          totalInModule: m.keys.length,
          activeInModule: m.keys.filter((k) => effectiveSet.has(k.key)).length,
        }
      })
      .filter((m) => m.keys.length > 0)
  }, [
    data.modules,
    selectedModule,
    search,
    filterState,
    effectiveSet,
    grantsSet,
    revokesSet,
  ])

  return (
    <div className="space-y-6">
      {/* ── Top Bar: Search, Module Tabs, State Filter & Reset All ── */}
      <div className="rounded-xl border border-brand-rule bg-brand-card p-4 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-muted-soft" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search 130 permissions by key, name, or action..."
              className="h-9 pl-9 pr-8 text-[13px] bg-brand-card border-brand-rule focus-visible:ring-brand-accent/20"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-muted-soft hover:text-brand-ink"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter pills */}
            <div className="inline-flex rounded-lg border border-brand-rule bg-brand-cream/30 p-0.5">
              <button
                onClick={() => setFilterState("all")}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                  filterState === "all"
                    ? "bg-brand-card text-brand-ink shadow-xs"
                    : "text-brand-muted-soft hover:text-brand-ink"
                )}
              >
                All
              </button>
              <button
                onClick={() => setFilterState("overridden")}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1",
                  filterState === "overridden"
                    ? "bg-brand-card text-brand-ink shadow-xs"
                    : "text-brand-muted-soft hover:text-brand-ink"
                )}
              >
                <Sparkles className="size-3 text-amber-500" />
                Overrides
                {totalOverrides > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-brand-accent/10 text-brand-accent font-mono">
                    {totalOverrides}
                  </span>
                )}
              </button>
              <button
                onClick={() => setFilterState("enabled")}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                  filterState === "enabled"
                    ? "bg-brand-card text-brand-ink shadow-xs"
                    : "text-brand-muted-soft hover:text-brand-ink"
                )}
              >
                Active
              </button>
              <button
                onClick={() => setFilterState("disabled")}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                  filterState === "disabled"
                    ? "bg-brand-card text-brand-ink shadow-xs"
                    : "text-brand-muted-soft hover:text-brand-ink"
                )}
              >
                Disabled
              </button>
            </div>

            {/* Reset All Overrides Button */}
            {canManage && totalOverrides > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResetAllOpen(true)}
                className="h-8 text-xs border-amber-300 bg-amber-50/60 text-amber-900 hover:bg-amber-100/70"
              >
                <RotateCcw className="mr-1.5 size-3" />
                Reset all {totalOverrides} overrides
              </Button>
            )}
          </div>
        </div>

        {/* ── Module Category Tabs ── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar border-t border-brand-rule/60">
          <button
            onClick={() => setSelectedModule("all")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-full shrink-0 transition-colors",
              selectedModule === "all"
                ? "bg-brand-ink text-brand-cream"
                : "bg-brand-cream/40 text-brand-muted-soft hover:text-brand-ink hover:bg-brand-cream/80"
            )}
          >
            All Modules
            <span className="ml-1.5 opacity-70">
              ({data.effectiveKeys.length})
            </span>
          </button>
          {data.modules.map((m) => {
            const onCount = m.keys.filter((k) => effectiveSet.has(k.key)).length
            const isSelected = selectedModule === m.module
            return (
              <button
                key={m.module}
                onClick={() => setSelectedModule(m.module)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-full shrink-0 transition-colors flex items-center gap-1.5",
                  isSelected
                    ? "bg-brand-ink text-brand-cream"
                    : "bg-brand-cream/40 text-brand-muted-soft hover:text-brand-ink hover:bg-brand-cream/80"
                )}
              >
                {m.label}
                <span
                  className={cn(
                    "text-[10px] font-mono px-1.5 py-0.2 rounded-full",
                    isSelected
                      ? "bg-brand-cream/20 text-brand-cream"
                      : "bg-brand-rule text-brand-muted-soft"
                  )}
                >
                  {onCount}/{m.keys.length}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Modules List ── */}
      {filteredModules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-brand-rule bg-brand-card p-12 text-center">
          <Filter className="mx-auto size-8 text-brand-muted-soft mb-3" />
          <p className="text-sm font-medium text-brand-ink">
            No permissions match your filter
          </p>
          <p className="text-xs text-brand-muted-soft mt-1">
            Try adjusting your search query or reset filter pills.
          </p>
          {(search || filterState !== "all" || selectedModule !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("")
                setFilterState("all")
                setSelectedModule("all")
              }}
              className="mt-4 text-xs"
            >
              Clear all filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredModules.map((m) => {
            const pct = Math.round((m.activeInModule / m.totalInModule) * 100)
            return (
              <div
                key={m.module}
                className="rounded-xl border border-brand-rule bg-brand-card overflow-hidden shadow-xs"
              >
                {/* Module Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-rule bg-brand-cream/20 px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent font-semibold text-xs uppercase">
                      {m.module.slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-brand-ink">
                          {m.label}
                        </h3>
                        <Badge
                          variant="secondary"
                          className="h-5 px-1.5 text-[10px] font-mono"
                        >
                          {m.activeInModule}/{m.totalInModule} Active · {pct}%
                        </Badge>
                      </div>
                      <p className="text-[11px] text-brand-muted-soft">
                        Operational controls for {m.label.toLowerCase()}
                      </p>
                    </div>
                  </div>

                  {/* Batch Actions for this module */}
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs border-brand-rule"
                              disabled={batchMutation.isPending}
                            >
                              <MoreHorizontal className="mr-1.5 size-3.5" />
                              Module Actions
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() =>
                              handleModuleAction(m as any, "enable_all")
                            }
                            className="text-xs"
                          >
                            <CheckCheck className="mr-2 size-3.5 text-emerald-600" />
                            Enable all ({m.totalInModule})
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleModuleAction(m as any, "disable_all")
                            }
                            className="text-xs"
                          >
                            <Ban className="mr-2 size-3.5 text-rose-600" />
                            Disable all ({m.totalInModule})
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              handleModuleAction(m as any, "reset_defaults")
                            }
                            className="text-xs text-amber-700"
                          >
                            <RotateCcw className="mr-2 size-3.5" />
                            Reset module to role preset
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>

                {/* Permissions Rows */}
                <div className="divide-y divide-brand-rule-soft">
                  {m.keys.map((k) => {
                    const isEffective = effectiveSet.has(k.key)
                    const inPreset = presetSet.has(k.key)
                    const isGrant = grantsSet.has(k.key)
                    const isRevoke = revokesSet.has(k.key)
                    const isOverridden = isGrant || isRevoke

                    const dimensionLabel =
                      k.dimension === "a"
                        ? "Module"
                        : k.dimension === "b"
                          ? "View"
                          : k.dimension === "c"
                            ? "Field"
                            : "Action"

                    return (
                      <div
                        key={k.key}
                        className={cn(
                          "px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-brand-cream/15",
                          isGrant && "bg-emerald-50/20",
                          isRevoke && "bg-rose-50/20"
                        )}
                      >
                        {/* Left: Permission Info */}
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-medium text-brand-ink">
                              {k.label}
                            </span>
                            <span className="text-[10px] font-mono text-brand-muted-soft bg-brand-cream/50 px-1.5 py-0.5 rounded border border-brand-rule/60">
                              {k.key}
                            </span>
                            <span className="text-[10px] font-mono uppercase text-brand-muted-soft">
                              {dimensionLabel}
                            </span>
                          </div>
                          <p className="text-[12px] text-brand-muted-soft mt-0.5">
                            {k.description}
                          </p>
                        </div>

                        {/* Right: State Badges, Reset Button & Switch */}
                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                          {/* Origin / Override Badge */}
                          {isGrant ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-medium gap-1 py-0.5">
                              <Sparkles className="size-2.5 text-emerald-600" />
                              Custom Grant
                            </Badge>
                          ) : isRevoke ? (
                            <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-medium gap-1 py-0.5">
                              <ShieldOff className="size-2.5 text-rose-600" />
                              Custom Blocked
                            </Badge>
                          ) : inPreset ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-normal text-brand-muted-soft border-brand-rule bg-brand-card"
                            >
                              Preset: On
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-normal text-brand-muted-soft/60 border-brand-rule/50 bg-brand-card/50"
                            >
                              Preset: Off
                            </Badge>
                          )}

                          {/* Quick Reset Override Action */}
                          {canManage && isOverridden && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResetKey(k.key)}
                              disabled={toggleMutation.isPending}
                              className="h-7 px-2 text-[11px] text-brand-muted-soft hover:text-brand-ink hover:bg-brand-cream/50"
                              title="Reset this key back to role default"
                            >
                              <RotateCcw className="size-3 mr-1" />
                              Reset
                            </Button>
                          )}

                          {/* Accessible Toggle Switch */}
                          <Switch
                            checked={isEffective}
                            disabled={!canManage || toggleMutation.isPending}
                            onCheckedChange={() => handleToggle(k.key)}
                            aria-label={`Toggle permission ${k.label}`}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Reset All Confirmation Dialog ── */}
      <AlertDialog open={resetAllOpen} onOpenChange={setResetAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all custom overrides?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all {totalOverrides} custom grants and revocations
              for{" "}
              <strong>{data.name || data.email || "this member"}</strong>. Their
              permissions will revert exactly to the baseline{" "}
              <strong>{data.presetLabel}</strong> role preset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetAllMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetAllMutation.mutate()}
              disabled={resetAllMutation.isPending}
              className="bg-brand-ink text-brand-cream hover:bg-brand-ink-soft"
            >
              {resetAllMutation.isPending ? "Resetting..." : "Yes, reset all"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
