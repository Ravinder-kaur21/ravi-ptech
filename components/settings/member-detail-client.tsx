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
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Kbd } from "@/components/ui/kbd"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { formatDistanceToNow } from "date-fns"
import {
  suspendMemberAction,
  transferOwnershipAction,
} from "@/app/actions/invitation"
import { removeMemberAction } from "@/app/actions/remove-member"
import {
  SuspendMemberDialog,
  TransferOwnershipDialog,
  type MemberTarget,
} from "@/components/settings/member-action-dialogs"
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
import { Field, FieldLabel } from "@/components/ui/field"
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
  ShieldAlert,
  ShieldOff,
  ArrowLeftRight,
  SlidersHorizontal,
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
  const [matrixOpen, setMatrixOpen] = React.useState(false)
  const [activityOpen, setActivityOpen] = React.useState(false)
  const [suspendOpen, setSuspendOpen] = React.useState(false)
  const [transferOpen, setTransferOpen] = React.useState(false)
  const [suspendTarget, setSuspendTarget] = React.useState<MemberTarget>(null)
  const [transferTarget, setTransferTarget] = React.useState<MemberTarget>(null)

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
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* ── Breadcrumb ──────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 text-xs text-brand-muted-soft">
        <Link
          href="/settings/team"
          className="hover:text-brand-ink transition-colors"
        >
          Team
        </Link>
        <ChevronRight className="size-3" />
        <span className="text-brand-ink">{data.name || data.email}</span>
      </div>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <Card className="border-brand-rule bg-brand-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <Avatar className="size-16 shrink-0">
            <AvatarFallback className="bg-brand-accent-tint text-brand-accent text-xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-[28px] tracking-tight text-brand-ink">
                {data.name || data.email}
              </h1>
              <Badge className="bg-brand-accent-tint text-brand-accent text-[11px] font-medium px-2.5 py-0.5">
                {data.presetLabel}
              </Badge>
              {overrideSet.size > 0 && (
                <Badge
                  variant="outline"
                  className="border-blue-300 bg-blue-50 text-blue-900 font-mono text-[10px] uppercase tracking-[0.04em]"
                >
                  <Sparkles className="mr-1 size-3" />
                  {overrideSet.size} custom grant
                  {overrideSet.size === 1 ? "" : "s"}
                </Badge>
              )}
            </div>
            <p className="mt-1 flex items-center gap-2 text-sm text-brand-muted-soft">
              <Mail className="size-3.5" />
              {data.email}
            </p>
            <p className="mt-3 max-w-prose text-sm text-brand-ink/80">
              {data.presetOneLiner}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:flex-col sm:items-end">
            <Button
              variant="outline"
              onClick={() => setMatrixOpen(true)}
              className="shrink-0"
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Edit all permissions
            </Button>
            <p className="text-[11px] text-brand-muted-soft sm:text-right">
              130 keys · {data.effectiveKeys.length} on
            </p>
          </div>
        </div>
      </Card>

      {/* ── KPI strip ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Keys on"
          value={`${data.effectiveKeys.length}`}
          sub={`of ${ALL_PERMISSION_KEYS.length} total`}
        />
        <Kpi
          label="Custom grants"
          value={`${overrideSet.size}`}
          sub={overrideSet.size > 0 ? "on top of role" : "none — role as-is"}
        />
        <Kpi
          label="Can see"
          value={`${summary.canView.length}`}
          sub="modules in their view"
        />
        <Kpi
          label="Can act"
          value={`${summary.canAct.length}`}
          sub="actions they can take"
        />
      </div>

      {/* ── Main grid ────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* LEFT (2/3) — role + effective access */}
        <div className="space-y-4 lg:col-span-2">
          {/* Role */}
          <Card className="border-brand-rule bg-brand-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  Role
                </p>
                <p className="mt-1 text-sm text-brand-ink">
                  {data.presetLabel} · {data.presetOneLiner}
                </p>
              </div>
              {canManage ? (
                <Select
                  value={data.role}
                  onValueChange={async (v) => {
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
                    queryClient.invalidateQueries({
                      queryKey: ["member-permissions", userId],
                    })
                    router.refresh()
                  }}
                >
                  <SelectTrigger className="h-9 w-[180px] border-brand-rule">
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
              ) : (
                <Badge variant="secondary" className="h-7 px-3 text-xs">
                  {data.presetLabel}
                </Badge>
              )}
            </div>
          </Card>

          {/* Extra grants */}
          <Card className="border-brand-rule bg-brand-card overflow-hidden">
            <div className="flex items-center justify-between gap-3 p-5 border-b border-brand-rule">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  Extra grants on top of role
                </p>
                <p className="mt-1 text-sm text-brand-muted-soft">
                  One-off permissions this person has that their role
                  doesn&apos;t grant.
                </p>
              </div>
              {canManage && (
                <Button
                  onClick={() => setGrantOpen(true)}
                  className="shrink-0 bg-brand-ink hover:bg-brand-ink-soft text-brand-cream"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Grant a key
                </Button>
              )}
            </div>
            {overrideSet.size === 0 ? (
              <p className="p-5 text-center text-sm text-brand-muted-soft">
                No extra grants. This person gets exactly what their{" "}
                {data.presetLabel} role grants.
              </p>
            ) : (
              <ul className="divide-y divide-brand-rule">
                {data.overrides.map((key) => {
                  const entry = data.modules
                    .flatMap((m) => m.keys)
                    .find((k) => k.key === key)
                  return (
                    <li key={key} className="flex items-center gap-3 px-5 py-3">
                      <CircleCheck className="size-4 shrink-0 text-emerald-700" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-brand-ink">
                          {entry?.label ?? key}
                        </p>
                        <p className="font-mono text-[11px] text-brand-muted-soft">
                          {key}
                        </p>
                      </div>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 shrink-0 text-[11px] text-brand-muted-soft hover:text-red-600"
                          onClick={async () => {
                            if (
                              !confirm(
                                `Revoke ${key}? ${data.name || data.email} will lose this access.`,
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
                              },
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
                        >
                          <Trash2 className="mr-1.5 h-3 w-3" />
                          Revoke
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          {/* Effective access */}
          <Card className="border-brand-rule bg-brand-card p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
              Effective access
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-brand-ink">
                  <Check className="size-3.5 text-emerald-700" />
                  Can view
                </p>
                {summary.canView.length > 0 ? (
                  <p className="mt-1.5 text-sm text-brand-muted-soft">
                    {summary.canView.slice(0, 5).join(", ")}
                    {summary.canView.length > 5 &&
                      ` +${summary.canView.length - 5} more`}
                  </p>
                ) : (
                  <p className="mt-1.5 text-sm text-brand-muted-soft">
                    Nothing.
                  </p>
                )}
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-brand-ink">
                  <Check className="size-3.5 text-emerald-700" />
                  Can do
                </p>
                {summary.canAct.length > 0 ? (
                  <p className="mt-1.5 text-sm text-brand-muted-soft">
                    {summary.canAct.slice(0, 5).join(", ")}
                    {summary.canAct.length > 5 &&
                      ` +${summary.canAct.length - 5} more`}
                  </p>
                ) : (
                  <p className="mt-1.5 text-sm text-brand-muted-soft">
                    Read-only access.
                  </p>
                )}
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-brand-ink">
                  <X className="size-3.5 text-brand-muted-soft" />
                  Cannot see
                </p>
                {summary.cannotSee.length > 0 ? (
                  <p className="mt-1.5 text-sm text-brand-muted-soft">
                    {summary.cannotSee.slice(0, 5).join(", ")}
                    {summary.cannotSee.length > 5 &&
                      ` +${summary.cannotSee.length - 5} more`}
                  </p>
                ) : (
                  <p className="mt-1.5 text-sm text-brand-muted-soft">
                    Nothing is hidden.
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT (1/3) — actions */}
        <div className="space-y-4">
          <Card className="border-brand-rule bg-brand-card p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
              Actions
            </p>
            <div className="mt-3 space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setMatrixOpen(true)}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Edit all permissions
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setActivityOpen(true)}
              >
                <History className="mr-2 h-4 w-4" />
                View audit trail
              </Button>
              <Separator className="bg-brand-rule" />
              {canManage && data.role !== "owner" && (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-amber-700 hover:text-amber-800"
                    onClick={() => {
                      setSuspendTarget({
                        id: data.userId,
                        name: data.name ?? "",
                        email: data.email,
                      })
                      setSuspendOpen(true)
                    }}
                  >
                    <ShieldOff className="mr-2 h-4 w-4" />
                    Suspend from workspace
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setTransferTarget({
                        id: data.userId,
                        name: data.name ?? "",
                        email: data.email,
                      })
                      setTransferOpen(true)
                    }}
                  >
                    <ArrowLeftRight className="mr-2 h-4 w-4" />
                    Transfer ownership
                  </Button>
                </>
              )}
            </div>
          </Card>

          <Card className="border-brand-rule bg-brand-card p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
              Details
            </p>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-brand-muted-soft">User ID</dt>
                <dd className="font-mono text-[11px] text-brand-ink truncate">
                  {data.userId.slice(0, 12)}…
                </dd>
              </div>
              <Separator className="bg-brand-rule" />
              <div className="flex justify-between gap-3">
                <dt className="text-brand-muted-soft">Role ID</dt>
                <dd className="font-mono text-[11px] text-brand-ink">
                  {data.role}
                </dd>
              </div>
              <Separator className="bg-brand-rule" />
              <div className="flex justify-between gap-3">
                <dt className="text-brand-muted-soft">Permission keys</dt>
                <dd className="font-mono text-[11px] text-brand-ink">
                  {data.effectiveKeys.length} / {ALL_PERMISSION_KEYS.length}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      {/* ── Danger zone ─────────────────────────────────────── */}
      {canManage && data.role !== "owner" && (
        <Card className="border-red-200 bg-red-50/40 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-red-100 text-red-900">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-red-900">
                Danger zone
              </p>
              <p className="mt-1 text-sm text-red-900/80">
                Removing {data.name || data.email} ends their access to this
                workspace immediately. Their driver records are detached, their
                sessions in this workspace are killed, and the membership row is
                deleted. The action is recorded in the audit log.
              </p>
            </div>
            <RemoveMemberAction
              memberId={data.userId}
              name={data.name ?? data.email}
              onDone={() => {
                router.push("/settings/team")
              }}
            />
          </div>
        </Card>
      )}

      {/* ── Footer ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-xs text-brand-muted-soft">
        <Link
          href="/settings/team"
          className="inline-flex items-center gap-1.5 transition-colors hover:text-brand-ink"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to members
        </Link>
        <Link
          href="/settings/team/invitations"
          className="inline-flex items-center gap-1.5 transition-colors hover:text-brand-ink"
        >
          Invitations
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* ── Dialogs & sheets ────────────────────────────────── */}
      <Sheet open={matrixOpen} onOpenChange={setMatrixOpen}>
        <SheetContent side="right" className="w-[560px] max-w-[90vw] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Permission matrix</SheetTitle>
            <SheetDescription>
              Every one of the {ALL_PERMISSION_KEYS.length} permission keys.
              {overrideSet.size > 0 &&
                ` ${overrideSet.size} custom grant${
                  overrideSet.size === 1 ? "" : "s"
                } will show as overrides.`}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
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
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit trail</DialogTitle>
            <DialogDescription>
              Every recorded change to this member&apos;s access.
            </DialogDescription>
          </DialogHeader>
          <ActivityList userId={userId} />
        </DialogContent>
      </Dialog>

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

      <SuspendMemberDialog
        target={suspendTarget}
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        onSubmit={async (memberId, reason, until) => {
          const r = await suspendMemberAction({ memberId, reason, until })
          if (r.ok) {
            toast.success("Member suspended")
            queryClient.invalidateQueries({
              queryKey: ["member-permissions", userId],
            })
            router.refresh()
          } else {
            toast.error("Failed to suspend")
          }
        }}
        pending={false}
      />

      <TransferOwnershipDialog
        target={transferTarget}
        open={transferOpen}
        onOpenChange={setTransferOpen}
        onConfirm={async (newOwnerMemberId) => {
          try {
            const r = await transferOwnershipAction({
              newOwnerMemberId,
            })
            if (!r.ok) throw new Error("Failed")
            toast.success("Ownership transferred", { duration: 5000 })
            router.push("/settings/team")
          } catch (e) {
            toast.error((e as Error).message)
          }
        }}
        pending={false}
      />
    </div>
  )
}

/** One KPI tile. */
function Kpi({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub: string
}) {
  return (
    <Card className="border-brand-rule bg-brand-card p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
        {label}
      </p>
      <p className="mt-1 font-serif text-3xl text-brand-ink">{value}</p>
      <p className="mt-1 text-[11px] text-brand-muted-soft">{sub}</p>
    </Card>
  )
}

/** Typed-confirmation remove, rendered as a button (danger zone pattern). */
function RemoveMemberAction({
  memberId,
  name,
  onDone,
}: {
  memberId: string
  name: string
  onDone: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const [typed, setTyped] = React.useState("")
  const mutation = useMutation({
    mutationFn: () => removeMemberAction({ memberId }),
    onSuccess: (r) => {
      toast.success(
        r.userDeleted
          ? "Member removed and their account was deleted (last workspace)."
          : "Member removed from this workspace.",
        { duration: 5000 },
      )
      setOpen(false)
      onDone()
    },
    onError: (e: Error) => toast.error(e.message),
  })
  return (
    <>
      <Button
        variant="destructive"
        className="shrink-0 gap-2"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
        Remove from workspace
      </Button>
      <Kbd>type REMOVE to confirm</Kbd>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) setTyped("")
          setOpen(o)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {name}?</DialogTitle>
            <DialogDescription>
              They lose access to this workspace immediately. Their account is
              kept so you can re-invite them later.
            </DialogDescription>
          </DialogHeader>
          <Field className="my-2">
            <FieldLabel>
              Type <span className="font-mono">REMOVE</span> to confirm
            </FieldLabel>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="REMOVE"
              className="font-mono"
            />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={typed !== "REMOVE" || mutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {mutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Audit events that reference this member. */
function ActivityList({ userId }: { userId: string }) {
  const q = useQuery({
    queryKey: ["member-audit", userId],
    queryFn: async () => {
      const r = await fetch("/api/settings/workspace-recent-events")
      if (!r.ok) throw new Error("Failed to load")
      const j = (await r.json()) as {
        events: Array<{
          id: string
          action: string
          actorEmail: string
          targetLabel: string | null
          createdAt: string
        }>
      }
      // Filter to events that name this member.
      return j.events.filter(
        (e) => e.targetLabel?.includes(userId) || e.targetLabel === userId,
      )
    },
  })
  if (q.isLoading) {
    return (
      <div className="flex justify-center py-8 text-brand-muted-soft">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }
  const events = q.data ?? []
  if (events.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-brand-muted-soft">
        No recorded access changes for this member yet.
      </p>
    )
  }
  return (
    <ul className="divide-y divide-brand-rule max-h-[50vh] overflow-y-auto">
      {events.map((e) => (
        <li key={e.id} className="py-3">
          <p className="text-sm text-brand-ink">
            {e.action.replace(/^user\./, "").replace(/-/g, " ")}
          </p>
          <p className="mt-0.5 text-[11px] text-brand-muted-soft">
            by {e.actorEmail} · {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}
          </p>
        </li>
      ))}
    </ul>
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
