"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "cn"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Kbd } from "@/components/ui/kbd"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Progress } from "@/components/ui/progress"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  Empty,
  EmptyDescription,
  EmptyTitle,
} from "@/components/ui/empty"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  AlertTriangle,
  Eye,
  MoreHorizontal,
} from "lucide-react"
import { usePermissions } from "@/lib/permissions-context"
import { PRESET_LIST } from "@/lib/role-presets"
import {
  MODULE_GROUPS,
  ALL_PERMISSION_KEYS,
  type ModuleGroup,
} from "@/lib/permissions-catalog"
import { buildSummary } from "@/lib/permission-summary"

import { MemberPermissionsEditor } from "@/components/settings/member-permissions-editor"

type MemberPermResponse = {
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
  overrides: string[]
  modules: ModuleGroup[]
}

// ─── Role → colour mapping (powers the accent bar, badges, avatar ring) ──
const ROLE_COLORS: Record<string, string> = {
  owner: "amber",
  admin: "blue",
  operations_manager: "teal",
  dispatcher: "green",
  accounting: "purple",
  safety: "rose",
  driver: "sky",
  member: "slate",
}

const roleColor = (role: string): string =>
  ROLE_COLORS[role] ?? ROLE_COLORS.member

const roleBadgeColor = (role: string): string => {
  const c = roleColor(role)
  const map: Record<string, string> = {
    amber: "bg-amber-100 text-amber-800 border-amber-300",
    blue: "bg-blue-100 text-blue-800 border-blue-300",
    teal: "bg-teal-100 text-teal-800 border-teal-300",
    green: "bg-emerald-100 text-emerald-800 border-emerald-300",
    purple: "bg-purple-100 text-purple-800 border-purple-300",
    rose: "bg-rose-100 text-rose-800 border-rose-300",
    sky: "bg-sky-100 text-sky-800 border-sky-300",
    slate: "bg-slate-100 text-slate-800 border-slate-300",
  }
  return map[c] ?? map.slate
}

/** Permission coverage percentage (effective / total). */
const coveragePct = (effective: number, total: number): number =>
  total > 0 ? Math.round((effective / total) * 100) : 0

/** Hex colours (for live style bindings — Tailwind can't do dynamic classes). */
const ROLE_HEX: Record<string, string> = {
  owner: "#F59E0B", // amber-500
  admin: "#3B82F6", // blue-500
  operations_manager: "#0D9488", // teal-500
  dispatcher: "#22C55E", // emerald-500
  accounting: "#A855F7", // purple-500
  safety: "#F43F5E", // rose-500
  driver: "#0EA5E9", // sky-500
  member: "#6B7280", // slate-500
}

function roleHex(role: string): string {
  return ROLE_HEX[role] ?? ROLE_HEX.member
}

/** Full-width shimmer skeleton that mirrors the real page layout. */
function MemberDetailSkeleton({ role }: { role?: string }) {
  const accent = roleHex(role ?? "")
  return (
    <div className="min-h-screen bg-brand-background">
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-6">
        <div className="flex items-center gap-1.5 text-xs text-brand-muted-soft">
          <Skeleton className="h-3 w-12" />
          <ChevronRight className="size-3" />
          <Skeleton className="h-3 w-20" />
          <ChevronRight className="size-3" />
          <Skeleton className="h-3 w-24" />
        </div>

        <Card className="border-brand-rule bg-brand-card">
          <div className="h-1.5 w-full" style={{ backgroundColor: accent }} />
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-5">
              <Skeleton className="size-20 rounded-full" />
              <div className="flex-1 min-w-0 space-y-2.5">
                <Skeleton className="h-7 w-56" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full max-w-xs" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-brand-rule bg-brand-card">
          <CardHeader>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48 mt-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-2 w-full rounded-full" />
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-brand-rule bg-brand-card">
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-12" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card className="border-brand-rule bg-brand-card">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
            </Card>
            <Card className="border-brand-rule bg-brand-card">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-4">
            <Card className="border-brand-rule bg-brand-card">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
            <Card className="border-brand-rule bg-brand-card">
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-4 w-32" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Centralised error state with retry — replaces the infinite-spinner bug. */
function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-background">
      <Card className="border-destructive/20 bg-brand-card max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-brand-ink">{title}</h3>
              <p className="mt-1 text-sm text-brand-muted-soft">{message}</p>
            </div>
            <Button onClick={onRetry} variant="outline" size="sm">
              Try again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function MemberDetailClient({ userId }: { userId: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const perms = usePermissions()
  const canManage = perms.has("users.change_role")
  const [activityOpen, setActivityOpen] = React.useState(false)
  const [suspendOpen, setSuspendOpen] = React.useState(false)
  const [transferOpen, setTransferOpen] = React.useState(false)
  const [suspendTarget, setSuspendTarget] = React.useState<MemberTarget>(null)
  const [transferTarget, setTransferTarget] = React.useState<MemberTarget>(null)

  const { data, isLoading, isError, error } = useQuery<MemberPermResponse>(
    {
      queryKey: ["member-permissions", userId],
      queryFn: async () => {
        const r = await fetch(
          `/api/settings/member-permissions?userId=${encodeURIComponent(userId)}`
        )
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          // Surface a meaningful message instead of a generic "Failed to load"
          throw new Error(j.error || `Request failed with status ${r.status}`)
        }
        return r.json() as Promise<MemberPermResponse>
      },
      staleTime: 30_000,
    }
  )

  // ── Loading state: shimmer skeleton that mirrors the real layout ──
  if (isLoading) {
    return <MemberDetailSkeleton />
  }

  // ── Error state: clear message + retry (fixes the infinite-spinner bug) ──
  if (isError) {
    return (
      <ErrorState
        title="Unable to load member details"
        message={
          (error as Error)?.message ||
          "Something went wrong while fetching this member's permissions."
        }
        onRetry={() =>
          queryClient.invalidateQueries({
            queryKey: ["member-permissions", userId],
          })
        }
      />
    )
  }

  if (!data) {
    return <MemberDetailSkeleton />
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
    <div className="min-h-screen bg-brand-background">
      {/* ── Breadcrumb ── */}
      <div className="border-b border-brand-rule">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/settings">Settings</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/settings/team">Team & members</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbPage>
                {data.name || data.email}
              </BreadcrumbPage>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* ── Hero ── */}
        <Card className="border-brand-rule bg-brand-card overflow-hidden">
          <div
            className="h-1.5 w-full"
            style={{ backgroundColor: roleHex(data.role) }}
          />
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-5">
              {/* Avatar with role-coloured ring */}
              <div className="relative shrink-0">
                <Avatar className="size-20">
                  <AvatarFallback
                    className="text-2xl font-semibold"
                    style={{
                      backgroundColor: `${roleHex(data.role)}20`,
                      color: roleHex(data.role),
                    }}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div
                  className="absolute -bottom-1 -right-1 rounded-full p-0.5"
                  style={{ backgroundColor: roleHex(data.role) }}
                >
                  <ShieldCheck className="size-3.5 text-white" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-serif text-2xl lg:text-3xl tracking-tight text-brand-ink">
                    {data.name || data.email}
                  </h1>
                  <Badge
                    className={cn(
                      "text-[11px] font-medium px-2.5 py-0.5",
                      roleBadgeColor(data.role),
                    )}
                  >
                    {data.presetLabel}
                  </Badge>
                  {data.role !== "owner" && overrideSet.size > 0 && (
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
                <p className="mt-2 max-w-2xl text-sm text-brand-ink/70">
                  {data.presetOneLiner}
                </p>
              </div>

              {/* Header Right Actions */}
              <div className="flex flex-col gap-2.5 sm:items-end shrink-0">
                {canManage && (
                  <div className="flex items-center gap-2">
                    <Select
                      value={data.role}
                      onValueChange={async (v) => {
                        const r = await fetch(
                          "/api/settings/member-permissions",
                          {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              userId: data.userId,
                              action: "setRole",
                              role: v,
                            }),
                          },
                        )
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
                      <SelectTrigger className="h-8.5 w-[160px] text-xs border-brand-rule bg-brand-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRESET_LIST.map((p) => (
                          <SelectItem key={p.role} value={p.role} className="text-xs">
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActivityOpen(true)}
                      className="h-8.5 text-xs border-brand-rule"
                    >
                      <History className="mr-1.5 size-3.5 text-brand-muted-soft" />
                      Audit Trail
                    </Button>

                    {data.role !== "owner" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8.5 border border-brand-rule"
                              aria-label="Member options"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem
                            onClick={() => {
                              setSuspendTarget({
                                id: data.userId,
                                name: data.name ?? "",
                                email: data.email,
                              })
                              setSuspendOpen(true)
                            }}
                            className="text-xs text-amber-800"
                          >
                            <ShieldOff className="mr-2 size-3.5 text-amber-600" />
                            Suspend from workspace
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setTransferTarget({
                                id: data.userId,
                                name: data.name ?? "",
                                email: data.email,
                              })
                              setTransferOpen(true)
                            }}
                            className="text-xs"
                          >
                            <ArrowLeftRight className="mr-2 size-3.5" />
                            Transfer ownership
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Permission Coverage ── */}
        <Card className="border-brand-rule bg-brand-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-mono uppercase tracking-[0.04em] text-brand-muted-soft">
                Permission coverage
              </CardTitle>
              <span className="text-sm font-medium text-brand-ink">
                {data.effectiveKeys.length} / {ALL_PERMISSION_KEYS.length}{" "}
                keys active ({coveragePct(data.effectiveKeys.length, ALL_PERMISSION_KEYS.length)}%)
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Progress
              value={coveragePct(
                data.effectiveKeys.length,
                ALL_PERMISSION_KEYS.length,
              )}
              className="h-2"
              style={
                {
                  "--progress-indicator-bg": roleHex(data.role),
                } as React.CSSProperties
              }
            />
            <div className="mt-3 flex items-center gap-6 text-[11px] text-brand-muted-soft">
              <span className="flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: roleHex(data.role) }}
                />
                Preset layer: {data.presetKeys.length} keys
              </span>
              {overrideSet.size > 0 && (
                <span className="flex items-center gap-1.5 text-brand-ink">
                  <Sparkles className="size-3 text-blue-500" />
                  {overrideSet.size} override
                  {overrideSet.size === 1 ? "" : "s"} on top
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── KPI strip ── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            icon={ShieldCheck}
            label="Effective Permissions"
            value={`${data.effectiveKeys.length}`}
            sub={`of ${ALL_PERMISSION_KEYS.length} total active`}
          />
          <Kpi
            icon={Sparkles}
            label="Custom Grants"
            value={`+${data.grants?.length ?? 0}`}
            sub="extra privileges added"
          />
          <Kpi
            icon={ShieldOff}
            label="Custom Blocked"
            value={`-${data.revokes?.length ?? 0}`}
            sub="role defaults revoked"
          />
          <Kpi
            icon={Eye}
            label="Base Preset"
            value={data.presetLabel}
            sub={`${data.presetKeys.length} default keys`}
          />
        </div>

        {/* ── Prominent Interactive Permission Matrix Control Center ── */}
        <MemberPermissionsEditor
          data={data}
          canManage={canManage}
          onChanged={() => {
            queryClient.invalidateQueries({
              queryKey: ["member-permissions", userId],
            })
            router.refresh()
          }}
        />

        {/* ── Danger zone ── */}
        {canManage && data.role !== "owner" && (
          <Alert variant="destructive" className="border-red-200 bg-red-50/40">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-red-900">
              Danger zone
            </AlertTitle>
            <AlertDescription className="mt-1 text-sm text-red-900/80">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex-1">
                  Removing {data.name || data.email} ends their access to this
                  workspace immediately. Their driver records are detached,
                  their sessions in this workspace are killed, and the membership
                  row is deleted. The action is recorded in the audit log.
                </div>
                <RemoveMemberAction
                  memberId={data.userId}
                  name={data.name ?? data.email}
                  onDone={() => {
                    router.push("/settings/team")
                  }}
                />
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* ── Footer ── */}
        <div className="flex items-center justify-between pt-2 text-xs text-brand-muted-soft">
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

        {/* ── Dialogs & sheets ── */}
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
    </div>
  )
}

/** One KPI tile — icon-led, with a subtle accent underline. */
function Kpi({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub: string
}) {
  return (
    <Card className="border-brand-rule bg-brand-card p-4">
      <div className="flex items-center gap-2">
        <div className="rounded-md bg-brand-accent-tint/50 p-1.5">
          <Icon className="h-4 w-4 text-brand-accent" />
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
          {label}
        </p>
      </div>
      <p className="mt-2 font-serif text-3xl text-brand-ink">{value}</p>
      <p className="mt-0.5 text-[11px] text-brand-muted-soft">{sub}</p>
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



