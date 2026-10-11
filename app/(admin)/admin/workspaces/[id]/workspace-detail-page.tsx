"use client"

/**
 * /admin/workspaces/[id] — comprehensive dedicated detail page for
 * one workspace. Replaces the tiny Sheet in the WorkspacesTable.
 *
 * Sections:
 *   1. Header (back link, name, plan/status badges)
 *   2. Overview + TMS stat grid (6 tiles)
 *   3. Members (paginated, with per-row actions)
 *   4. Activity (org-scoped audit events)
 *   5. Actions toolbar (Suspend/Unsuspend, View as workspace)
 *   6. Danger zone (typed-confirmation delete)
 */
import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import {
  ArrowLeft,
  Building2,
  TruckIcon,
  Users,
  ScrollText,
  Pause,
  PlayCircle,
  Trash2,
  Eye,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  DollarSign,
  Package,
  TrendingUp,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

// ─── Types ─────────────────────────────────────────────────────────────────

type EnrichedOrg = {
  id: string
  name: string
  slug: string
  logo: string | null
  createdAt: string
  metadata: string | null
  suspended: boolean
  suspendedAt: string | null
  suspendedReason: string | null
  suspendedBy: string | null
  memberCount: number
  ownerCount: number
}

type OrgStats = {
  loads: { active: number; total: number }
  drivers: { active: number; total: number }
  trucks: { active: number; total: number }
  invoices: { paid: number; outstanding: number }
  revenue: { last30d: number; allTime: number }
  lastActivityAt: string | null
}

type Member = {
  memberId: string
  userId: string
  email: string
  name: string
  image: string | null
  role: string
  platformRole: string | null
  banned: boolean | null
  suspended: boolean
  lastActiveAt: string | null
  joinedAt: string
}

type ActivityEvent = {
  id: string
  action: string
  actorEmail: string
  targetType: string
  targetId: string | null
  targetLabel: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

type Props = {
  org: EnrichedOrg
  initialStats: OrgStats
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: React.ReactNode
  hint?: string
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card className="border-brand-rule bg-brand-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft">
          {label}
        </div>
        {Icon && <Icon className="size-3.5 text-brand-muted-soft" />}
      </div>
      <div className="font-serif text-2xl leading-tight text-brand-ink">
        {value}
      </div>
      {hint && <div className="text-[11px] text-brand-muted-soft">{hint}</div>}
    </Card>
  )
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n)
}

// ─── Page ──────────────────────────────────────────────────────────────────

const WORKSPACE_ROLES = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "operations_manager", label: "Operations Manager" },
  { value: "dispatcher", label: "Dispatcher" },
  { value: "accounting", label: "Accounting" },
  { value: "driver", label: "Driver" },
  { value: "safety", label: "Safety" },
] as const

export function WorkspaceDetailPage({ org, initialStats }: Props) {
  console.log(`[WORKSPACE-DETAIL-PAGE] rendering org=${org.id} ${org.slug}`)
  const router = useRouter()
  const queryClient = useQueryClient()
  const [copied, setCopied] = React.useState(false)

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-orgs"] })
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] })
    queryClient.invalidateQueries({ queryKey: ["admin-workspace", org.id] })
    queryClient.invalidateQueries({ queryKey: ["admin-workspace-members", org.id] })
    queryClient.invalidateQueries({ queryKey: ["admin-workspace-activity", org.id] })
  }

  // ── Suspend / unsuspend ───────────────────────────────────────────
  const [suspendOpen, setSuspendOpen] = React.useState(false)
  const [suspendReason, setSususpendReason] = React.useState("")
  const suspendMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/admin/workspaces/${org.id}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspended: true, reason: suspendReason }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.error || "Suspend failed")
      }
    },
    onSuccess: () => {
      toast.success(`${org.name} suspended`)
      setSuspendOpen(false)
      setSususpendReason("")
      refreshAll()
      router.refresh()
    },
    onError: (e) => toast.error((e as Error).message),
  })

  const unsuspendMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/admin/workspaces/${org.id}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspended: false }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.error || "Unsuspend failed")
      }
    },
    onSuccess: () => {
      toast.success(`${org.name} unsuspended`)
      refreshAll()
      router.refresh()
    },
    onError: (e) => toast.error((e as Error).message),
  })

  // ── View as workspace ─────────────────────────────────────────────
  const viewAsMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/view-as-workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: org.id }),
      })
      if (!r.ok) throw new Error("View-as failed")
    },
    onSuccess: () => {
      toast.success(`Switched to ${org.name}`)
      router.push("/dashboard")
    },
    onError: (e) => toast.error((e as Error).message),
  })

  // ── Delete (DANGER ZONE) ──────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleteTyped, setDeleteTyped] = React.useState("")
  const [deleteAck, setDeleteAck] = React.useState(false)
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/admin/workspaces/${org.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: org.name }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.error || "Delete failed")
      }
    },
    onSuccess: () => {
      toast.success(`${org.name} permanently deleted`)
      setDeleteOpen(false)
      router.push("/admin/workspaces")
      router.refresh()
    },
    onError: (e) => toast.error((e as Error).message),
  })

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-4 lg:px-6">
        <Link
          href="/admin/workspaces"
          className="inline-flex items-center gap-1.5 text-xs text-brand-muted-soft hover:text-brand-ink transition-colors"
        >
          <ArrowLeft className="size-3" />
          Back to workspaces
        </Link>

        <div className="mt-3 flex items-start gap-4">
          <div className="flex size-14 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent shrink-0">
            {org.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={org.logo}
                alt={org.name}
                className="size-14 rounded-lg object-cover"
              />
            ) : (
              <Building2 className="size-6" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="size-1.5 shrink-0 rounded-full bg-brand-accent" />
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-ink">
                WORKSPACE
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "font-mono text-[10px] uppercase tracking-[0.04em]",
                  org.suspended
                    ? "border-amber-300 bg-amber-50 text-amber-900"
                    : "border-emerald-300 bg-emerald-50 text-emerald-900"
                )}
              >
                {org.suspended ? "Suspended" : "Active"}
              </Badge>
              <Badge
                variant="outline"
                className="font-mono text-[10px] uppercase tracking-[0.04em]"
              >
                /{org.slug}
              </Badge>
            </div>
            <h1 className="mt-2 font-serif text-[clamp(28px,3.5vw,40px)] leading-[1.05] tracking-tight text-brand-ink">
              {org.name}
            </h1>
            <div className="mt-1 flex items-center gap-3 text-[13px] text-brand-ink/70">
              <span>
                <Calendar className="inline size-3 -mt-0.5 mr-1 text-brand-muted-soft" />
                Created {new Date(org.createdAt).toLocaleDateString()}
              </span>
              <span>
                <Users className="inline size-3 -mt-0.5 mr-1 text-brand-muted-soft" />
                {org.memberCount} member{org.memberCount === 1 ? "" : "s"} ·{" "}
                {org.ownerCount} owner{org.ownerCount === 1 ? "" : "s"}
              </span>
              <HoverCard>
                <HoverCardTrigger
                  render={
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(org.id)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 1500)
                      }}
                      className="inline-flex items-center gap-1 rounded p-1 text-brand-muted-soft hover:text-brand-ink hover:bg-brand-cream-soft transition-colors"
                    />
                  }
                >
                  {copied ? (
                    <Check className="size-3" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                  <span className="font-mono text-[10px]">
                    {org.id.slice(0, 8)}…
                  </span>
                </HoverCardTrigger>
                <HoverCardContent>
                  <p className="text-xs">Click to copy full workspace id</p>
                </HoverCardContent>
              </HoverCard>
            </div>
          </div>
        </div>
      </div>

      {/* ── Suspended banner ────────────────────────────────────── */}
      {org.suspended && (
        <div className="px-4 lg:px-6">
          <Card className="border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <Pause className="size-4 text-amber-700 mt-0.5" />
              <div className="flex-1">
                <div className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-amber-900">
                  Workspace suspended
                </div>
                {org.suspendedReason && (
                  <p className="mt-1 text-sm text-amber-900">
                    {org.suspendedReason}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-amber-700">
                  {org.suspendedAt
                    ? `Suspended ${formatDistanceToNow(new Date(org.suspendedAt), { addSuffix: true })}`
                    : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => unsuspendMutation.mutate()}
                disabled={unsuspendMutation.isPending}
                className="gap-1.5"
              >
                {unsuspendMutation.isPending ? (
                  <Spinner className="size-3" />
                ) : (
                  <PlayCircle className="size-3" />
                )}
                Unsuspend
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── TMS stats grid ──────────────────────────────────────── */}
      <div className="px-4 lg:px-6">
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <StatTile
            label="Loads"
            value={`${initialStats.loads.active} / ${initialStats.loads.total}`}
            hint={`${initialStats.loads.total - initialStats.loads.active} closed`}
            icon={Package}
          />
          <StatTile
            label="Drivers"
            value={`${initialStats.drivers.active} / ${initialStats.drivers.total}`}
            hint={`${initialStats.drivers.total - initialStats.drivers.active} inactive`}
            icon={Users}
          />
          <StatTile
            label="Trucks"
            value={`${initialStats.trucks.active} / ${initialStats.trucks.total}`}
            hint={`${initialStats.trucks.total - initialStats.trucks.active} off-fleet`}
            icon={TruckIcon}
          />
          <StatTile
            label="Invoices"
            value={`${initialStats.invoices.paid} / ${initialStats.invoices.paid + initialStats.invoices.outstanding}`}
            hint={`${initialStats.invoices.outstanding} outstanding`}
            icon={ScrollText}
          />
          <StatTile
            label="Revenue (30d)"
            value={formatMoney(initialStats.revenue.last30d)}
            hint={`All-time ${formatMoney(initialStats.revenue.allTime)}`}
            icon={DollarSign}
          />
          <StatTile
            label="Last activity"
            value={
              initialStats.lastActivityAt
                ? formatDistanceToNow(new Date(initialStats.lastActivityAt), { addSuffix: false })
                : "—"
            }
            hint={initialStats.lastActivityAt ? "ago" : "no events yet"}
            icon={TrendingUp}
          />
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div className="px-4 lg:px-6">
        <Tabs defaultValue="members" className="space-y-4">
          <TabsList>
            <TabsTrigger value="members">Members ({org.memberCount})</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <MembersTab orgId={org.id} />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityTab orgId={org.id} />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab org={org} />
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Actions toolbar ─────────────────────────────────────── */}
      <div className="px-4 lg:px-6">
        <Card className="border-brand-rule bg-brand-card p-5 space-y-3">
          <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft">
            Workspace actions
          </h2>
          <div className="flex flex-wrap gap-2">
            {!org.suspended && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setSuspendOpen(true)}
              >
                <Pause className="size-4" />
                Suspend workspace
              </Button>
            )}
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => viewAsMutation.mutate()}
              disabled={viewAsMutation.isPending}
            >
              {viewAsMutation.isPending ? (
                <Spinner className="size-4" />
              ) : (
                <ExternalLink className="size-4" />
              )}
              View as this workspace
            </Button>
          </div>
        </Card>
      </div>

      {/* ── Danger zone ──────────────────────────────────────────── */}
      <div className="px-4 lg:px-6">
        <Card className="border-red-200 bg-red-50/40 p-5 space-y-3">
          <div>
            <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-red-900">
              Danger zone
            </h2>
            <p className="mt-1 text-sm text-red-900/80">
              Permanently delete <b>{org.name}</b> and every record that
              belongs to it: {initialStats.loads.total} loads,{" "}
              {initialStats.drivers.total} drivers, {initialStats.trucks.total}{" "}
              trucks, every trip, invoice, pay stub, and member row. This
              cannot be undone.
            </p>
          </div>
          <Button
            variant="destructive"
            className="gap-2"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete workspace permanently
          </Button>
        </Card>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────── */}
      <SuspendDialog
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        reason={suspendReason}
        setReason={setSususpendReason}
        name={org.name}
        pending={suspendMutation.isPending}
        onConfirm={() => suspendMutation.mutate()}
      />

      <DeleteWorkspaceDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        name={org.name}
        typed={deleteTyped}
        setTyped={setDeleteTyped}
        ack={deleteAck}
        setAck={setDeleteAck}
        pending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  )
}

// ─── Tabs ──────────────────────────────────────────────────────────────────

function MembersTab({ orgId }: { orgId: string }) {
  console.log(`[WORKSPACE-DETAIL-PAGE] MembersTab orgId=${orgId}`)
  const [search, setSearch] = React.useState("")
  const q = useQuery({
    queryKey: ["admin-workspace-members", orgId, search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "100", offset: "0" })
      if (search.trim()) params.set("search", search.trim())
      const r = await fetch(`/api/admin/workspaces/${orgId}/members?${params}`)
      if (!r.ok) throw new Error("Failed to load members")
      return r.json() as Promise<{ members: Member[]; total: number }>
    },
    staleTime: 15_000,
  })

  const queryClient = useQueryClient()
  const [changeRoleMember, setChangeRoleMember] = React.useState<Member | null>(null)
  const changeRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const r = await fetch(`/api/admin/users/${changeRoleMember?.userId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set-role",
          role: changeRoleMember?.platformRole === "admin" ? "admin" : "user",
          memberRole: { organizationId: orgId, role },
        }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.error || "Role change failed")
      }
    },
    onSuccess: () => {
      toast.success("Role updated")
      setChangeRoleMember(null)
      queryClient.invalidateQueries({ queryKey: ["admin-workspace-members", orgId] })
    },
    onError: (e) => toast.error((e as Error).message),
  })

  return (
    <Card className="border-brand-rule bg-brand-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-brand-rule p-4">
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 max-w-sm"
        />
        <div className="text-xs text-brand-muted-soft">
          {q.data?.total ?? 0} member{(q.data?.total ?? 0) === 1 ? "" : "s"}
        </div>
      </div>

      {q.isLoading ? (
        <div className="p-6 space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : q.isError ? (
        <div className="p-6 text-sm text-brand-accent">
          {(q.error as Error).message}
        </div>
      ) : (q.data?.members?.length ?? 0) === 0 ? (
        <Empty>
          <EmptyMedia>
            <Users className="size-5" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>No members</EmptyTitle>
            <EmptyDescription>
              {search
                ? "No members match your search."
                : "This workspace has no members yet."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-brand-cream-soft/50 hover:bg-brand-cream-soft/50">
              <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                User
              </TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                Role
              </TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                Last active
              </TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                Joined
              </TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.data!.members.map((m) => (
              <TableRow key={m.memberId}>
                <TableCell>
                  <Link
                    href={`/admin/users/${m.userId}`}
                    className="font-medium text-brand-ink hover:underline"
                  >
                    {m.name}
                  </Link>
                  <div className="text-[11px] text-brand-muted-soft">
                    {m.email}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] uppercase tracking-[0.04em] w-fit"
                    >
                      {m.role}
                    </Badge>
                    {m.platformRole === "admin" && (
                      <Badge
                        variant="outline"
                        className="font-mono text-[9px] uppercase tracking-[0.04em] w-fit border-violet-300 bg-violet-50 text-violet-900"
                      >
                        platform admin
                      </Badge>
                    )}
                    {m.banned && (
                      <Badge
                        variant="outline"
                        className="font-mono text-[9px] uppercase tracking-[0.04em] w-fit border-red-300 bg-red-50 text-red-900"
                      >
                        banned
                      </Badge>
                    )}
                    {m.suspended && !m.banned && (
                      <Badge
                        variant="outline"
                        className="font-mono text-[9px] uppercase tracking-[0.04em] w-fit border-amber-300 bg-amber-50 text-amber-900"
                      >
                        suspended
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-brand-muted-soft">
                  {m.lastActiveAt
                    ? formatDistanceToNow(new Date(m.lastActiveAt), { addSuffix: true })
                    : "never"}
                </TableCell>
                <TableCell className="text-xs text-brand-muted-soft">
                  {new Date(m.joinedAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setChangeRoleMember(m)}
                    className="text-xs"
                  >
                    Change role
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ChangeRoleDialog
        member={changeRoleMember}
        onOpenChange={(o) => !o && setChangeRoleMember(null)}
        onConfirm={(role) => {
          if (!changeRoleMember) return
          changeRoleMutation.mutate({ memberId: changeRoleMember.memberId, role })
        }}
        pending={changeRoleMutation.isPending}
      />
    </Card>
  )
}

function ActivityTab({ orgId }: { orgId: string }) {
  console.log(`[WORKSPACE-DETAIL-PAGE] ActivityTab orgId=${orgId}`)
  const q = useQuery({
    queryKey: ["admin-workspace-activity", orgId],
    queryFn: async () => {
      const r = await fetch(`/api/admin/workspaces/${orgId}/activity`)
      if (!r.ok) throw new Error("Failed to load activity")
      return r.json() as Promise<{ events: ActivityEvent[]; total: number }>
    },
    staleTime: 15_000,
  })

  if (q.isLoading)
    return (
      <Card className="border-brand-rule bg-brand-card p-6 space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </Card>
    )

  if (q.isError)
    return (
      <Card className="border-brand-rule bg-brand-card p-6 text-sm text-brand-accent">
        {(q.error as Error).message}
      </Card>
    )

  const events = q.data?.events ?? []

  return (
    <Card className="border-brand-rule bg-brand-card overflow-hidden">
      {events.length === 0 ? (
        <Empty>
          <EmptyMedia>
            <ScrollText className="size-5" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>No activity yet</EmptyTitle>
            <EmptyDescription>
              Audit events targeting this workspace will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ScrollArea className="max-h-[480px]">
          <ul className="divide-y divide-brand-rule">
            {events.map((e) => (
              <li key={e.id} className="flex items-start gap-3 p-4 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-medium text-brand-ink">
                      {e.action}
                    </span>
                    <span className="text-[11px] text-brand-muted-soft">
                      by {e.actorEmail}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-brand-muted-soft">
                    {new Date(e.createdAt).toLocaleString()} ·{" "}
                    {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}
                  </div>
                  {e.metadata && Object.keys(e.metadata).length > 0 && (
                    <HoverCard>
                      <HoverCardTrigger
                        render={
                          <button className="mt-1 font-mono text-[10px] text-brand-muted-soft hover:text-brand-ink transition-colors" />
                        }
                      >
                        view metadata →
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80 font-mono text-[11px]">
                        <pre className="whitespace-pre-wrap break-words">
                          {JSON.stringify(e.metadata, null, 2)}
                        </pre>
                      </HoverCardContent>
                    </HoverCard>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </Card>
  )
}

function SettingsTab({ org }: { org: EnrichedOrg }) {
  return (
    <Card className="border-brand-rule bg-brand-card p-5 space-y-4">
      <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft">
        Workspace settings
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
            Slug
          </div>
          <div className="mt-1 font-mono text-brand-ink">/{org.slug}</div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
            Created
          </div>
          <div className="mt-1 text-brand-ink">
            {new Date(org.createdAt).toLocaleString()}
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
            Logo
          </div>
          <div className="mt-1 text-brand-ink font-mono text-[11px]">
            {org.logo ?? "—"}
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
            Status
          </div>
          <div className="mt-1 text-brand-ink">
            {org.suspended ? "Suspended" : "Active"}
          </div>
        </div>
      </div>
      {org.metadata && (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
            Metadata
          </div>
          <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-brand-cream-soft p-3 font-mono text-[11px] text-brand-ink">
            {(() => {
              try {
                return JSON.stringify(JSON.parse(org.metadata), null, 2)
              } catch {
                return org.metadata
              }
            })()}
          </pre>
        </div>
      )}
    </Card>
  )
}

// ─── Dialogs ───────────────────────────────────────────────────────────────

function SuspendDialog({
  open,
  onOpenChange,
  reason,
  setReason,
  name,
  pending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  reason: string
  setReason: (s: string) => void
  name: string
  pending: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspend {name}?</DialogTitle>
          <DialogDescription>
            All members of this workspace will be blocked at sign-in with
            a "workspace suspended" message. Platform admins (your
            colleagues) can still access the admin console.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          <Label className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
            Reason
          </Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="resize-none"
            placeholder="e.g. Payment failed, customer requested pause, abuse investigation…"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={pending || !reason.trim()}
            className="bg-brand-ink text-brand-cream hover:bg-brand-ink-soft"
          >
            {pending ? <Spinner className="mr-2 size-4" /> : null}
            Suspend
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ChangeRoleDialog({
  member,
  onOpenChange,
  onConfirm,
  pending,
}: {
  member: Member | null
  onOpenChange: (o: boolean) => void
  onConfirm: (role: string) => void
  pending: boolean
}) {
  const [role, setRole] = React.useState("member")
  React.useEffect(() => {
    if (member) setRole(member.role)
  }, [member])
  return (
    <Dialog open={!!member} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change role for {member?.name}</DialogTitle>
          <DialogDescription>
            Updates this user's role inside this workspace only. Their
            platform role is unchanged.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          <Label className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
            Role
          </Label>
          <Select value={role} onValueChange={(v) => v && setRole(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WORKSPACE_ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(role)}
            disabled={pending}
          >
            {pending ? <Spinner className="mr-2 size-4" /> : null}
            Update role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteWorkspaceDialog({
  open,
  onOpenChange,
  name,
  typed,
  setTyped,
  ack,
  setAck,
  pending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  name: string
  typed: string
  setTyped: (s: string) => void
  ack: boolean
  setAck: (b: boolean) => void
  pending: boolean
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Permanently delete {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action is <b>not reversible</b>. Every load, driver,
            truck, trip, invoice, pay stub, and member of this workspace
            will be permanently deleted. Audit log references are
            preserved (anonymized where they pointed at this org).
            <br />
            <br />
            Type <code className="font-mono">{name}</code> to confirm,
            and check the box to acknowledge the impact.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={name}
          className="h-10 font-mono"
        />
        <label className="flex items-start gap-2 text-sm text-brand-ink/80 cursor-pointer">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
            className="mt-1 size-4 accent-brand-accent"
          />
          <span>
            I understand this permanently deletes all loads, drivers,
            trucks, trips, invoices, payroll, and member records for{" "}
            <b>{name}</b>.
          </span>
        </label>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={typed !== name || !ack || pending}
            className="bg-brand-accent text-white hover:bg-brand-accent/90"
          >
            {pending ? <Spinner className="mr-2 size-4" /> : <Trash2 className="mr-2 size-4" />}
            Delete forever
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
