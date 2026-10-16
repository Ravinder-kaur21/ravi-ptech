"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  ArrowLeft,
  Search,
  RotateCcw,
  Check,
  X,
  Circle,
  CircleCheck,
  Mail,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  Sparkles,
  History,
} from "lucide-react"
import { usePermissions } from "@/lib/permissions-context"
import { PRESET_LIST } from "@/lib/role-presets"
import {
  MODULE_GROUPS,
  ALL_PERMISSION_KEYS,
  type ModuleGroup,
} from "@/lib/permissions-catalog"
import { buildSummary } from "@/lib/permission-summary"

type MemberPermResponse = {
  userId: string
  email: string
  name: string | null
  role: string
  presetLabel: string
  presetOneLiner: string
  presetKeys: string[]
  effectiveKeys: string[]
  overrides: string[]
  modules: ModuleGroup[]
}

export function MemberDetailClient({ userId }: { userId: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const perms = usePermissions()
  const canManage = perms.has("users.change_role")
  const [grantOpen, setGrantOpen] = React.useState(false)

  const { data, isLoading } = useQuery<MemberPermResponse>({
    queryKey: ["member-permissions", userId],
    queryFn: async () => {
      const r = await fetch(
        `/api/settings/member-permissions?userId=${encodeURIComponent(userId)}`
      )
      if (!r.ok) throw new Error("Failed to load")
      return r.json()
    },
  })

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    )
  }

  const initials = (data.name || data.email || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const effectiveSet = new Set(data.effectiveKeys)
  const presetSet = new Set(data.presetKeys)
  const overrideSet = new Set(data.overrides)
  const summary = buildSummary(effectiveSet)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/settings/team"
        className="inline-flex items-center gap-1.5 text-[13px] text-brand-muted-soft hover:text-brand-ink"
      >
        <ArrowLeft className="size-3.5" />
        Team / Members
      </Link>

      {/* Header card */}
      <div className="rounded-xl border border-brand-rule bg-brand-card p-5">
        <div className="flex items-start gap-4">
          <Avatar className="size-14 shrink-0">
            {data.name && (
              <AvatarImage src="" alt={data.name} />
            )}
            <AvatarFallback className="bg-brand-accent-tint text-brand-accent text-[18px] font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-serif text-[24px] tracking-tight text-brand-ink">
                  {data.name || data.email}
                </h1>
                <p className="text-[13px] text-brand-muted-soft mt-0.5 flex items-center gap-2">
                  <Mail className="size-3.5" />
                  {data.email}
                </p>
              </div>
              <Badge className="bg-brand-accent-tint text-brand-accent text-[12px] font-medium px-2.5 py-0.5">
                {data.presetLabel}
              </Badge>
            </div>
            <p className="mt-3 text-[13px] text-brand-ink/80">
              {data.presetOneLiner}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="permissions">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6 space-y-4">
          <div className="rounded-lg border border-brand-rule bg-brand-card p-5">
            <p className="text-[11px] font-mono uppercase tracking-[0.06em] text-brand-muted-soft">
              Profile
            </p>
            <p className="mt-1 text-[13px] text-brand-ink/80">
              Detailed profile fields live in the next phase. For now, the
              member&apos;s role and effective permissions are managed on the
              <strong> Permissions </strong>
              tab.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="mt-6 space-y-6">
          {/* Role + summary */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-brand-rule bg-brand-card p-5 space-y-3">
              <p className="text-[11px] font-mono uppercase tracking-[0.06em] text-brand-muted-soft">
                Role
              </p>
              <div className="flex items-center gap-2">
                <Select
                  value={data.role}
                  onValueChange={async (v) => {
                    if (!canManage) return
                    const r = await fetch("/api/settings/member-permissions", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        userId: data.userId,
                        action: "setRole",
                        role: v,
                      }),
                    })
                    if (!r.ok) {
                      const j = await r.json().catch(() => ({}))
                      toast.error(j.error || "Failed to change role")
                      return
                    }
                    toast.success(`Role changed to ${v}`)
                    queryClient.invalidateQueries({ queryKey: ["member-permissions", userId] })
                    queryClient.invalidateQueries({ queryKey: ["members-list-v2"] })
                    router.refresh()
                  }}
                  disabled={!canManage}
                >
                  <SelectTrigger className="h-9 bg-brand-card border-brand-rule">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_LIST.map((p) => (
                      <SelectItem key={p.role} value={p.role}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[12px] text-brand-muted-soft">
                {data.effectiveKeys.length} of {ALL_PERMISSION_KEYS.length} permissions ON
              </p>
              <div className="rounded-md border border-brand-rule bg-brand-cream/50 p-3 text-[12px] text-brand-ink/90">
                <p>
                  Using the <strong>{data.presetLabel}</strong> preset as the
                  starting point. Any extra grants below are layered on top.
                </p>
                {data.overrides.length > 0 && (
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (
                          !confirm(
                            "Reset this member's permissions to the preset? All extra grants will be removed."
                          )
                        )
                          return
                        const r = await fetch(
                          "/api/settings/member-permissions",
                          {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              userId: data.userId,
                              action: "reset",
                            }),
                          }
                        )
                        if (!r.ok) {
                          toast.error("Failed to reset")
                          return
                        }
                        toast.success("Reset to preset")
                        queryClient.invalidateQueries({
                          queryKey: ["member-permissions", userId],
                        })
                        router.refresh()
                      }}
                      disabled={!canManage}
                      className="h-7 text-[12px] border-brand-rule"
                    >
                      <RotateCcw className="size-3" />
                      <span className="ml-1">Reset to preset</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick summary */}
            <div className="rounded-lg border border-brand-rule bg-brand-card p-5 space-y-2">
              <p className="text-[11px] font-mono uppercase tracking-[0.06em] text-brand-muted-soft">
                What this person can do
              </p>
              {summary.canView.length > 0 && (
                <p className="text-[13px] text-brand-ink leading-relaxed">
                  <Check className="inline size-3.5 text-emerald-700 mr-1.5" />
                  Can view {summary.canView.slice(0, 3).join(", ")}
                  {summary.canView.length > 3 && `, and ${summary.canView.length - 3} more`}.
                </p>
              )}
              {summary.canAct.length > 0 && (
                <p className="text-[13px] text-brand-ink leading-relaxed">
                  <Check className="inline size-3.5 text-emerald-700 mr-1.5" />
                  Can {summary.canAct.slice(0, 3).join(", ")}
                  {summary.canAct.length > 3 && `, and ${summary.canAct.length - 3} more`}.
                </p>
              )}
              {summary.cannotSee.length > 0 && (
                <p className="text-[13px] text-brand-ink/80 leading-relaxed">
                  <X className="inline size-3.5 text-brand-muted-soft mr-1.5" />
                  Cannot see {summary.cannotSee.slice(0, 2).join("; ")}.
                </p>
              )}
            </div>
          </div>

          {/* ─── Extra grants on top of role ─── */}
          <div className="rounded-lg border border-brand-rule bg-brand-card overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-brand-rule">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-brand-accent" />
                <p className="text-[14px] font-semibold text-brand-ink">
                  Extra grants on top of role
                </p>
                {data.overrides.length > 0 && (
                  <Badge
                    variant="outline"
                    className="border-brand-accent/30 text-brand-accent text-[10px] h-4 px-1.5"
                  >
                    {data.overrides.length}
                  </Badge>
                )}
                <span className="text-[11px] text-brand-muted-soft">
                  {canManage
                    ? "You can extend this member's access with one-off grants."
                    : "Owner only."}
                </span>
              </div>
              {canManage && (
                <Button
                  onClick={() => setGrantOpen(true)}
                  size="sm"
                  className="h-8 bg-brand-ink hover:bg-brand-ink-soft text-brand-cream"
                >
                  <Plus className="size-3.5 mr-1" />
                  Grant a key
                </Button>
              )}
            </div>

            {data.overrides.length === 0 ? (
              <div className="px-5 py-6 text-center">
                <p className="text-[13px] text-brand-muted-soft">
                  No extra grants yet. {canManage ? "Click “Grant a key” to extend this person's access." : ""}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-brand-rule">
                {data.overrides.map((key) => {
                  const entry = data.modules
                    .flatMap((m) => m.keys)
                    .find((k) => k.key === key)
                  return (
                    <li
                      key={key}
                      className="px-5 py-3 flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-brand-ink">
                          {entry?.label ?? key}
                        </p>
                        <p className="text-[11px] text-brand-muted-soft font-mono">
                          {key}
                        </p>
                      </div>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (
                              !confirm(
                                `Revoke ${key}? ${data.name || data.email} will lose this access.`
                              )
                            )
                              return
                            const r = await fetch(
                              "/api/settings/member-permissions",
                              {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  userId: data.userId,
                                  action: "revoke",
                                  key,
                                }),
                              }
                            )
                            if (!r.ok) {
                              const j = await r.json().catch(() => ({}))
                              toast.error(j.error || "Failed to revoke")
                              return
                            }
                            toast.success(`Revoked ${key}`)
                            queryClient.invalidateQueries({
                              queryKey: ["member-permissions", userId],
                            })
                            router.refresh()
                          }}
                          className="h-7 text-[12px] text-brand-muted-soft hover:text-red-600"
                        >
                          <Trash2 className="size-3 mr-1" />
                          Revoke
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Permission matrix */}
          <PermissionMatrix
            data={data}
            canManage={canManage}
            userId={userId}
            presetSet={presetSet}
            overrideSet={overrideSet}
            onChanged={() => {
              queryClient.invalidateQueries({
                queryKey: ["member-permissions", userId],
              })
              router.refresh()
            }}
          />
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <div className="rounded-lg border border-brand-rule bg-brand-card p-5 text-center">
            <History className="size-6 mx-auto text-brand-muted-soft" />
            <p className="mt-2 text-[13px] text-brand-muted-soft">
              Recent activity appears here in the next phase.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="mt-6">
          <div className="rounded-lg border border-brand-rule bg-brand-card p-5 text-center">
            <ShieldCheck className="size-6 mx-auto text-brand-muted-soft" />
            <p className="mt-2 text-[13px] text-brand-muted-soft">
              Active sessions appear here in the next phase.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <GrantDialog
        open={grantOpen}
        onOpenChange={setGrantOpen}
        data={data}
        userId={userId}
        onGranted={() => {
          queryClient.invalidateQueries({
            queryKey: ["member-permissions", userId],
          })
          router.refresh()
        }}
      />
    </div>
  )
}

/** "Grant a key" dialog — Owner only. Anti-escalation is enforced
 *  server-side: the actor must already have the key they are granting. */
function GrantDialog({
  open,
  onOpenChange,
  data,
  userId,
  onGranted,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  data: MemberPermResponse
  userId: string
  onGranted: () => void
}) {
  const [filter, setFilter] = React.useState("")
  const [picked, setPicked] = React.useState<string>("")
  const [reason, setReason] = React.useState("")

  // All keys across modules, with their human label, marked OFF if the
  // member already has them ON (so the default is to grant something new).
  const allKeys = React.useMemo(
    () =>
      data.modules
        .flatMap((m) => m.keys)
        .slice()
        .sort((a, b) => a.label.localeCompare(b.label)),
    [data.modules],
  )
  const currentSet = new Set(data.effectiveKeys)
  const candidates = allKeys.filter(
    (k) =>
      !currentSet.has(k.key) &&
      (!filter ||
        `${k.key} ${k.label} ${k.description}`
          .toLowerCase()
          .includes(filter.toLowerCase())),
  )

  const grant = useMutation({
    mutationFn: async (key: string) => {
      const r = await fetch("/api/settings/member-permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action: "grant",
          key,
        }),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error || "Failed to grant")
      }
    },
    onSuccess: (_d, key) => {
      toast.success(`Granted ${key}`)
      onGranted()
      onOpenChange(false)
      setPicked("")
      setFilter("")
      setReason("")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const pickedEntry = allKeys.find((k) => k.key === picked)

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setPicked("")
          setFilter("")
          setReason("")
        }
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Grant {data.name || data.email} a permission</DialogTitle>
          <DialogDescription>
            This adds a one-off grant on top of their {data.presetLabel}{" "}
            role. The action is recorded in the audit log.
          </DialogDescription>
        </DialogHeader>

        {!picked ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-muted-soft" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search 130 permission keys…"
                className="h-9 pl-9 text-[13px] bg-brand-card border-brand-rule"
                autoFocus
              />
            </div>
            <div className="max-h-72 overflow-y-auto rounded-md border border-brand-rule divide-y divide-brand-rule">
              {candidates.length === 0 ? (
                <p className="p-4 text-center text-[13px] text-brand-muted-soft">
                  No keys match — every matching permission is already ON.
                </p>
              ) : (
                candidates.slice(0, 60).map((k) => (
                  <button
                    key={k.key}
                    onClick={() => setPicked(k.key)}
                    className="w-full text-left px-3 py-2.5 hover:bg-brand-cream/50 transition-colors"
                  >
                    <p className="text-[13px] text-brand-ink">{k.label}</p>
                    <p className="text-[11px] text-brand-muted-soft font-mono">
                      {k.key}
                    </p>
                  </button>
                ))
              )}
            </div>
            <p className="text-[11px] text-brand-muted-soft">
              {candidates.length} key{candidates.length === 1 ? "" : "s"} can
              still be granted. Already-ON keys are hidden.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-brand-accent/30 bg-brand-accent-tint/40 p-3">
              <p className="text-[13px] text-brand-ink">
                {pickedEntry?.label}
              </p>
              <p className="text-[11px] text-brand-muted-soft font-mono mt-0.5">
                {picked}
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-[0.06em] text-brand-muted-soft">
                Reason (optional, recorded in audit log)
              </label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. covering Sara's leave"
                className="h-9 text-[13px] bg-brand-card border-brand-rule"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {picked ? (
            <>
              <Button
                variant="ghost"
                onClick={() => setPicked("")}
                disabled={grant.isPending}
              >
                Back
              </Button>
              <Button
                onClick={() => grant.mutate(picked)}
                disabled={grant.isPending}
                className="bg-brand-ink hover:bg-brand-ink-soft text-brand-cream"
              >
                {grant.isPending ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="size-4 mr-2" />
                )}
                Grant access
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PermissionMatrix({
  data,
  canManage,
  userId,
  presetSet,
  overrideSet,
  onChanged,
}: {
  data: MemberPermResponse
  canManage: boolean
  userId: string
  presetSet: Set<string>
  overrideSet: Set<string>
  onChanged?: () => void
}) {
  const [filter, setFilter] = React.useState("")
  const [openModules, setOpenModules] = React.useState<Record<string, boolean>>(
    () => Object.fromEntries(MODULE_GROUPS.map((m, i) => [m.module, i < 2]))
  )
  const [showFilter, setShowFilter] = React.useState<"all" | "on" | "off" | "overridden">(
    "all"
  )

  const toggle = useMutation({
    mutationFn: async (vars: { key: string; next: "grant" | "revoke" }) => {
      const r = await fetch("/api/settings/member-permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action: vars.next,
          key: vars.key,
        }),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error || "Failed")
      }
      return r.json()
    },
    onSuccess: (_d, vars) => {
      toast.success(
        vars.next === "grant"
          ? `Granted ${vars.key}`
          : `Revoked ${vars.key}`
      )
      onChanged?.()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const filteredModules = data.modules
    .map((m) => ({
      ...m,
      keys: m.keys.filter((k) => {
        if (filter && !`${k.key} ${k.label} ${k.description}`.toLowerCase().includes(filter.toLowerCase())) {
          return false
        }
        if (showFilter === "on" && !data.effectiveKeys.includes(k.key)) return false
        if (showFilter === "off" && data.effectiveKeys.includes(k.key)) return false
        if (showFilter === "overridden" && !overrideSet.has(k.key)) return false
        return true
      }),
    }))
    .filter((m) => m.keys.length > 0)

  return (
    <div className="rounded-lg border border-brand-rule bg-brand-card overflow-hidden">
      <div className="border-b border-brand-rule p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-[14px] font-semibold text-brand-ink">
            Edit permissions
          </p>
          <div className="flex items-center gap-2">
            <Select value={showFilter} onValueChange={(v) => setShowFilter(v as "all" | "on" | "off" | "overridden")}>
              <SelectTrigger className="h-8 text-[12px] w-[140px] bg-brand-card border-brand-rule">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Show all</SelectItem>
                <SelectItem value="on">Only ON</SelectItem>
                <SelectItem value="off">Only OFF</SelectItem>
                <SelectItem value="overridden">Only overrides</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
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
        {filteredModules.map((m) => {
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
                  {open ? <ChevronDown className="size-4 text-brand-muted-soft" /> : <ChevronRight className="size-4 text-brand-muted-soft" />}
                  <span className="text-[13px] font-semibold text-brand-ink">
                    {m.label}
                  </span>
                  <span className="text-[11px] text-brand-muted-soft">
                    ({m.keys.filter((k) => data.effectiveKeys.includes(k.key)).length}/{m.keys.length} ON)
                  </span>
                </div>
              </button>
              {open && (
                <ul className="px-4 pb-3 divide-y divide-brand-rule-soft">
                  {m.keys.map((k) => {
                    const isOn = data.effectiveKeys.includes(k.key)
                    const isOverride = overrideSet.has(k.key)
                    const isPreset = presetSet.has(k.key)
                    const dimLabel = ["Module", "View", "Field", "Action"][
                      ["a", "b", "c", "d"].indexOf(k.dimension)
                    ]
                    return (
                      <li
                        key={k.key}
                        className="py-2 flex items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-brand-ink flex items-center gap-1.5">
                            {isOn ? (
                              <CircleCheck className="size-3.5 text-emerald-700" />
                            ) : (
                              <Circle className="size-3.5 text-brand-muted-soft" />
                            )}
                            {k.label}
                            {isOverride && (
                              <span className="ml-1 text-[10px] font-mono uppercase tracking-wide text-brand-accent">
                                override
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-brand-muted-soft ml-5">
                            <span className="font-mono">{k.key}</span>
                            <span className="mx-1.5">·</span>
                            {dimLabel}
                            {!isPreset && !isOverride && (
                              <>
                                <span className="mx-1.5">·</span>
                                <span className="text-brand-muted-soft">OFF in preset</span>
                              </>
                            )}
                          </p>
                        </div>
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isOn}
                            disabled={!canManage || toggle.isPending}
                            onChange={async (e) => {
                              try {
                                await toggle.mutateAsync({
                                  key: k.key,
                                  next: e.target.checked ? "grant" : "revoke",
                                })
                              } catch {}
                            }}
                            className="sr-only peer"
                          />
                          <span className="w-9 h-5 bg-brand-rule rounded-full relative transition-colors peer-checked:bg-brand-accent peer-disabled:opacity-50 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:size-4 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-4" />
                        </label>
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
  )
}
