"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { usePermissions } from "@/lib/permissions-context"
import { PRESETS } from "@/lib/role-presets"
import { ALL_PERMISSION_KEYS, type ModuleGroup } from "@/lib/permissions-catalog"
import { CreateRoleDialog } from "@/components/settings/create-role-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import {
  ArrowLeft,
  Search,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleCheck,
  Copy,
  Trash2,
  Users,
  KeyRound,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

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

  const isStarter = roleId in PRESETS
  const preset = PRESETS[roleId as keyof typeof PRESETS]

  const { data, isLoading, isError, error, refetch } = useQuery<RolePermResponse>({
    queryKey: ["role-permissions", roleId],
    queryFn: async () => {
      const r = await fetch(
        `/api/settings/role-permissions?roleId=${encodeURIComponent(roleId)}`
      )
      if (!r.ok) {
        const errJson = await r.json().catch(() => ({}))
        throw new Error(errJson.error || "Failed to load role permissions")
      }
      return r.json()
    },
  })

  const [filter, setFilter] = React.useState("")
  const [openModules, setOpenModules] = React.useState<Record<string, boolean>>({})

  // Initialize first 3 modules open once data loads
  React.useEffect(() => {
    if (data?.modules && Object.keys(openModules).length === 0) {
      setOpenModules(Object.fromEntries(data.modules.map((m, i) => [m.module, i < 3])))
    }
  }, [data?.modules, openModules])

  // Custom role toggle mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ key, enable }: { key: string; enable: boolean }) => {
      const res = await fetch("/api/settings/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: roleId,
          action: "toggle",
          key,
          enable,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? "Failed to update role permission")
      }
      return res.json()
    },
    onMutate: async ({ key, enable }) => {
      await queryClient.cancelQueries({ queryKey: ["role-permissions", roleId] })
      const prev = queryClient.getQueryData<RolePermResponse>(["role-permissions", roleId])
      if (prev) {
        const nextKeys = enable
          ? Array.from(new Set([...prev.effectiveKeys, key]))
          : prev.effectiveKeys.filter((k) => k !== key)
        queryClient.setQueryData<RolePermResponse>(["role-permissions", roleId], {
          ...prev,
          effectiveKeys: nextKeys,
        })
      }
      return { prev }
    },
    onError: (err: Error, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["role-permissions", roleId], context.prev)
      }
      toast.error(err.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles-list"] })
    },
  })

  // Batch module toggle mutation
  const batchMutation = useMutation({
    mutationFn: async ({ keys, enable }: { keys: string[]; enable: boolean }) => {
      const res = await fetch("/api/settings/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: roleId,
          action: "batch",
          keys,
          enable,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? "Failed to update permissions")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions", roleId] })
      queryClient.invalidateQueries({ queryKey: ["roles-list"] })
      toast.success("Module permissions updated")
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  // Delete role mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/settings/roles?role=${encodeURIComponent(roleId)}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? "Failed to delete role")
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(`Role "${data?.label ?? roleId}" deleted`)
      queryClient.invalidateQueries({ queryKey: ["roles-list"] })
      router.push("/settings/roles")
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  if (isError && !data) {
    return (
      <div className="p-4 lg:p-8 space-y-6 max-w-4xl mx-auto">
        <Link
          href="/settings/roles"
          className="inline-flex items-center gap-1.5 text-xs text-brand-muted-soft hover:text-brand-ink transition-colors font-medium"
        >
          <ArrowLeft className="size-3.5" />
          Back to Roles & Permissions
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-8 text-center space-y-3">
          <p className="font-semibold text-red-900 text-sm">Failed to load role permissions</p>
          <p className="text-xs text-red-700 max-w-md mx-auto">{error?.message || "An unexpected error occurred while loading permissions."}</p>
          <div className="pt-2">
            <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs">
              Try again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="p-4 lg:p-8 space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-5 w-36 rounded-md" />
        <div className="rounded-xl border border-brand-rule bg-brand-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-60" />
            </div>
          </div>
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const effectiveSet = new Set(data.effectiveKeys)

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          href="/settings/roles"
          className="inline-flex items-center gap-1.5 text-xs text-brand-muted-soft hover:text-brand-ink transition-colors font-medium"
        >
          <ArrowLeft className="size-3.5" />
          Back to Roles & Permissions
        </Link>
      </div>

      {/* Hero card */}
      <div className="rounded-xl border border-brand-rule bg-brand-card p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                "flex size-11 items-center justify-center rounded-xl shrink-0 mt-0.5",
                isStarter
                  ? "bg-brand-accent-tint text-brand-accent"
                  : "bg-blue-100 text-blue-700"
              )}
            >
              {isStarter ? <ShieldCheck className="size-5" /> : <KeyRound className="size-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-serif text-2xl tracking-tight text-brand-ink">
                  {data.label}
                </h1>
                <Badge
                  variant={isStarter ? "secondary" : "default"}
                  className={cn(
                    "text-[10px] font-mono uppercase tracking-wider px-2 py-0.5",
                    isStarter
                      ? "bg-brand-cream/80 text-brand-muted-soft border-brand-rule"
                      : "bg-blue-100 text-blue-800 border-blue-200"
                  )}
                >
                  {isStarter ? "Starter Preset (Immutable)" : "Custom Workspace Role"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-brand-ink/80 max-w-xl leading-relaxed">
                {data.description || preset?.description}
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-brand-rule">
            <Badge className="bg-brand-accent-tint text-brand-accent text-xs font-mono px-2.5 py-0.5">
              {data.effectiveKeys.length} of {ALL_PERMISSION_KEYS.length} ON
            </Badge>
            <span className="text-xs text-brand-muted-soft">
              {data.memberCount} active member{data.memberCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Action toolbar for this role */}
        <div className="mt-6 pt-4 border-t border-brand-rule flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/settings/team")}
              className="h-8 gap-1.5 text-xs border-brand-rule text-brand-ink hover:bg-brand-cream/50"
            >
              <Users className="size-3.5 text-brand-muted-soft" />
              View Assigned Members ({data.memberCount})
            </Button>

            {canManage && (
              <CreateRoleDialog
                defaultCloneFrom={roleId}
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs border-brand-rule text-brand-ink hover:bg-brand-cream/50"
                  >
                    <Copy className="size-3.5 text-brand-muted-soft" />
                    Clone into New Role
                  </Button>
                }
              />
            )}
          </div>

          {!isStarter && canManage && (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs border-rose-200 text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="size-3.5" />
                    Delete Role
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete custom role &quot;{data.label}&quot;?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {data.memberCount > 0 ? (
                      <span className="text-rose-600 font-medium">
                        This role is currently assigned to {data.memberCount} member(s). You must
                        reassign them in Team Roster before this role can be deleted.
                      </span>
                    ) : (
                      "This will permanently delete this role template from your workspace. This action cannot be undone."
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate()}
                    disabled={data.memberCount > 0 || deleteMutation.isPending}
                    className="h-8 text-xs bg-rose-600 text-white hover:bg-rose-700"
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Starter Role Notice */}
      {isStarter && (
        <div className="rounded-xl border border-brand-rule bg-brand-cream/40 p-4 text-xs text-brand-ink/80 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-brand-ink">Starter presets are immutable</p>
            <p className="text-[11px] text-brand-muted-soft mt-0.5">
              To customize permissions for a specific teammate, open their profile in{" "}
              <Link href="/settings/team" className="text-brand-accent underline font-medium">Team Roster</Link>.
              Or clone this preset into a new custom role.
            </p>
          </div>
          <CreateRoleDialog
            defaultCloneFrom={roleId}
            trigger={
              <Button size="sm" className="h-8 text-xs bg-brand-ink text-brand-cream shrink-0">
                Clone Preset
              </Button>
            }
          />
        </div>
      )}

      {/* Permissions Editor / Browser */}
      <div className="rounded-xl border border-brand-rule bg-brand-card overflow-hidden shadow-xs">
        <div className="border-b border-brand-rule p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-muted-soft" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search permissions in this role..."
              className="h-9 pl-9 text-xs bg-brand-cream/30 border-brand-rule"
            />
          </div>
          <div className="text-xs text-brand-muted-soft font-mono">
            {!isStarter ? "Toggle switches to update permissions" : "Read-only preset inspection"}
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
              const activeCount = m.keys.filter((k) => effectiveSet.has(k.key)).length
              return (
                <li key={m.module} className="transition-colors">
                  <div className="w-full px-4 py-3 flex items-center justify-between hover:bg-brand-cream/30 transition-colors">
                    <button
                      onClick={() =>
                        setOpenModules((s) => ({ ...s, [m.module]: !s[m.module] }))
                      }
                      className="flex items-center gap-2.5 text-left flex-1"
                    >
                      {open ? (
                        <ChevronDown className="size-4 text-brand-muted-soft" />
                      ) : (
                        <ChevronRight className="size-4 text-brand-muted-soft" />
                      )}
                      <span className="text-xs font-semibold text-brand-ink">
                        {m.label}
                      </span>
                      <span className="text-[11px] font-mono text-brand-muted-soft">
                        ({activeCount}/{m.keys.length} ON)
                      </span>
                    </button>

                    {/* Batch actions for custom role */}
                    {!isStarter && canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="size-3.5 text-brand-muted-soft" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="text-xs">
                          <DropdownMenuItem
                            onClick={() =>
                              batchMutation.mutate({
                                keys: m.keys.map((k) => k.key),
                                enable: true,
                              })
                            }
                            className="gap-2 cursor-pointer"
                          >
                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                            Enable all in module
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              batchMutation.mutate({
                                keys: m.keys.map((k) => k.key),
                                enable: false,
                              })
                            }
                            className="gap-2 cursor-pointer"
                          >
                            <XCircle className="size-3.5 text-rose-600" />
                            Disable all in module
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {open && (
                    <ul className="px-4 pb-3 divide-y divide-brand-rule-soft bg-brand-cream/10">
                      {m.keys.map((k) => {
                        const isOn = effectiveSet.has(k.key)
                        const dimLabel =
                          k.dimension === "a"
                            ? "Module"
                            : k.dimension === "b"
                            ? "Visibility"
                            : k.dimension === "c"
                            ? "Field"
                            : "Action"

                        return (
                          <li
                            key={k.key}
                            className="py-2.5 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              {isStarter ? (
                                isOn ? (
                                  <CircleCheck className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                                ) : (
                                  <Circle className="size-4 text-brand-muted-soft/40 shrink-0 mt-0.5" />
                                )
                              ) : null}

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-medium text-brand-ink">
                                    {k.label}
                                  </p>
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-brand-cream-soft border border-brand-rule text-brand-muted-soft">
                                    {dimLabel}
                                  </span>
                                </div>
                                <p className="text-[11px] text-brand-muted-soft font-mono mt-0.5 truncate">
                                  {k.key}
                                </p>
                              </div>
                            </div>

                            {/* Switch for custom roles */}
                            {!isStarter && canManage && (
                              <Switch
                                checked={isOn}
                                onCheckedChange={(val) =>
                                  toggleMutation.mutate({ key: k.key, enable: val })
                                }
                                disabled={toggleMutation.isPending}
                              />
                            )}
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
    </div>
  )
}
