"use client"

/**
 * /admin/workspaces/[id] — comprehensive dedicated detail page for
 * one workspace. 2026 enterprise pattern (Linear/Stripe/Vercel):
 *
 *   1.  Breadcrumb header with large logo, name, status/plan badges
 *   2.  KPI strip (6 hero metrics with sparkline-friendly data)
 *   3.  Two-column main grid:
 *        LEFT (8/12)  Overview · Members · Activity timeline
 *        RIGHT (4/12) Suspension card · Plan & metadata · Risk score
 *   4.  Action toolbar
 *   5.  Danger zone with typed + checkbox confirmation
 *
 * Uses Item, Field, Alert, Kbd, Progress, Switch, InputGroup, Accordion,
 * Separator, Tooltip, Popover, HoverCard, Breadcrumb, etc.
 */
import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { format, formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import {
  ArrowLeft,
  Building2,
  Trash2,
  Eye,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  DollarSign,
  Package,
  TrendingUp,
  MoreHorizontal,
  ShieldAlert,
  AlertCircle,
  Users,
  ScrollText,
  Pause,
  PlayCircle,
  Settings2,
  Gauge,
  Hash,
  CircleDot,
  Sparkles,
  TruckIcon,
  CreditCard,
  Activity as ActivityIcon,
  ChevronRight,
  Crown,
  Briefcase,
  ShieldCheck,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Kbd } from "@/components/ui/kbd"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
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

const ROLE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  owner: Crown,
  admin: ShieldAlert,
  member: Users,
  operations_manager: Briefcase,
  dispatcher: TruckIcon,
  accounting: DollarSign,
  driver: TruckIcon,
  safety: ShieldCheck,
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n)
}

// ─── Page ──────────────────────────────────────────────────────────────────

export function WorkspaceDetailPage({ org, initialStats }: Props) {
  console.log(`[WORKSPACE-DETAIL-PAGE] rendering org=${org.id} ${org.slug}`)
  const router = useRouter()
  const queryClient = useQueryClient()
  const [copied, setCopied] = React.useState<string | null>(null)
  const copy = (label: string, value: string) => {
    navigator.clipboard.writeText(value)
    setCopied(label)
    setTimeout(() => setCopied(null), 1200)
  }

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-orgs"] })
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] })
    queryClient.invalidateQueries({ queryKey: ["admin-workspace", org.id] })
    queryClient.invalidateQueries({ queryKey: ["admin-workspace-members", org.id] })
    queryClient.invalidateQueries({ queryKey: ["admin-workspace-activity", org.id] })
    router.refresh()
  }

  // ── Suspend / unsuspend ───────────────────────────────────────────
  const [suspendOpen, setSuspendOpen] = React.useState(false)
  const [suspendReason, setSuspendReason] = React.useState("")
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
      setSuspendReason("")
      refreshAll()
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
      {/* ── Breadcrumb ────────────────────────────────────────── */}
      <div className="px-4 lg:px-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/admin" />}>Admin</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/admin/workspaces" />}>
                Workspaces
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{org.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* ── Hero header ───────────────────────────────────────── */}
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-20 items-center justify-center rounded-xl bg-brand-accent-tint text-brand-accent shrink-0">
              {org.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={org.logo}
                  alt={org.name}
                  className="size-20 rounded-xl object-cover"
                />
              ) : (
                <Building2 className="size-8" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="size-2 shrink-0 rounded-full bg-brand-accent" />
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-ink">
                  Workspace
                </span>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-mono text-[10px] uppercase tracking-[0.04em] gap-1",
                          org.suspended
                            ? "border-amber-300 bg-amber-50 text-amber-900"
                            : "border-emerald-300 bg-emerald-50 text-emerald-900"
                        )}
                      />
                    }
                  >
                    <CircleDot
                      className={cn(
                        "size-2",
                        org.suspended ? "text-amber-700" : "text-emerald-700"
                      )}
                    />
                    {org.suspended ? "Suspended" : "Active"}
                  </TooltipTrigger>
                  <TooltipContent>Workspace status</TooltipContent>
                </Tooltip>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] uppercase tracking-[0.04em]"
                >
                  /{org.slug}
                </Badge>
                {org.ownerCount > 0 && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] uppercase tracking-[0.04em] gap-1 border-violet-300 bg-violet-50 text-violet-900"
                        />
                      }
                    >
                      <Crown className="size-2.5" />
                      {org.ownerCount} owner
                    </TooltipTrigger>
                    <TooltipContent>Owners can transfer ownership and delete the workspace</TooltipContent>
                  </Tooltip>
                )}
              </div>
              <h1 className="mt-2 font-serif text-[clamp(28px,3.5vw,40px)] leading-[1.05] tracking-tight text-brand-ink">
                {org.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-[13px] text-brand-ink/70">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3" />
                  Created {format(new Date(org.createdAt), "PP")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3" />
                  {org.memberCount} member{org.memberCount === 1 ? "" : "s"}
                </span>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        onClick={() => copy("id", org.id)}
                        className="inline-flex items-center gap-1 rounded p-1 text-brand-muted-soft hover:text-brand-ink hover:bg-brand-cream-soft transition-colors"
                      />
                    }
                  >
                    {copied === "id" ? (
                      <Check className="size-3 text-emerald-700" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                    <span className="font-mono text-[10px]">
                      {org.id.slice(0, 8)}…
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Click to copy full workspace id</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Right side — quick actions */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9"
                    onClick={() => viewAsMutation.mutate()}
                    disabled={viewAsMutation.isPending}
                    aria-label="View as this workspace"
                  />
                }
              >
                {viewAsMutation.isPending ? (
                  <Spinner className="size-4" />
                ) : (
                  <ExternalLink className="size-4" />
                )}
              </TooltipTrigger>
              <TooltipContent>View as this workspace</TooltipContent>
            </Tooltip>
            <WorkspaceActionsMenu
              suspended={org.suspended}
              onSuspend={() => setSuspendOpen(true)}
              onUnsuspend={() => unsuspendMutation.mutate()}
              unsuspendPending={unsuspendMutation.isPending}
              onDelete={() => setDeleteOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* ── Suspended banner ────────────────────────────────────── */}
      {org.suspended && (
        <div className="px-4 lg:px-6">
          <Alert className="border-amber-300 bg-amber-50 text-amber-900">
            <Pause className="size-4" />
            <AlertTitle>Workspace suspended</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              {org.suspendedReason && <span>{org.suspendedReason}</span>}
              {org.suspendedAt && (
                <span className="text-[11px] opacity-80">
                  · suspended{" "}
                  {formatDistanceToNow(new Date(org.suspendedAt), { addSuffix: true })}
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => unsuspendMutation.mutate()}
                disabled={unsuspendMutation.isPending}
                className="ml-auto gap-1.5"
              >
                {unsuspendMutation.isPending ? (
                  <Spinner className="size-3" />
                ) : (
                  <PlayCircle className="size-3" />
                )}
                Unsuspend
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* ── KPI strip (6 tiles) ───────────────────────────────── */}
      <div className="px-4 lg:px-6">
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <KpiCard
            label="Loads"
            value={`${initialStats.loads.active}`}
            hint={`of ${initialStats.loads.total} total`}
            icon={Package}
            tone={initialStats.loads.active > 0 ? "ok" : "muted"}
            progress={
              initialStats.loads.total > 0
                ? (initialStats.loads.active / initialStats.loads.total) * 100
                : 0
            }
            progressTone="ok"
          />
          <KpiCard
            label="Drivers"
            value={`${initialStats.drivers.active}`}
            hint={`of ${initialStats.drivers.total} total`}
            icon={Users}
            tone={initialStats.drivers.active > 0 ? "ok" : "muted"}
            progress={
              initialStats.drivers.total > 0
                ? (initialStats.drivers.active / initialStats.drivers.total) * 100
                : 0
            }
            progressTone="ok"
          />
          <KpiCard
            label="Trucks"
            value={`${initialStats.trucks.active}`}
            hint={`of ${initialStats.trucks.total} total`}
            icon={TruckIcon}
            tone={initialStats.trucks.active > 0 ? "ok" : "muted"}
            progress={
              initialStats.trucks.total > 0
                ? (initialStats.trucks.active / initialStats.trucks.total) * 100
                : 0
            }
            progressTone="ok"
          />
          <KpiCard
            label="Invoices"
            value={`${initialStats.invoices.paid}`}
            hint={`of ${
              initialStats.invoices.paid + initialStats.invoices.outstanding
            } total`}
            icon={ScrollText}
            tone={
              initialStats.invoices.outstanding > 0 ? "warn" : "ok"
            }
            progress={
              initialStats.invoices.paid +
                initialStats.invoices.outstanding >
              0
                ? (initialStats.invoices.paid /
                    (initialStats.invoices.paid +
                      initialStats.invoices.outstanding)) *
                  100
                : 0
            }
            progressTone={
              initialStats.invoices.outstanding > 0 ? "warn" : "ok"
            }
          />
          <KpiCard
            label="Revenue (30d)"
            value={formatMoney(initialStats.revenue.last30d)}
            hint={`all-time ${formatMoney(initialStats.revenue.allTime)}`}
            icon={DollarSign}
            tone="ok"
          />
          <KpiCard
            label="Last activity"
            value={
              initialStats.lastActivityAt
                ? formatDistanceToNow(new Date(initialStats.lastActivityAt), {
                    addSuffix: false,
                  })
                : "—"
            }
            hint={initialStats.lastActivityAt ? "ago" : "no events yet"}
            icon={TrendingUp}
            tone={initialStats.lastActivityAt ? "ok" : "muted"}
          />
        </div>
      </div>

      {/* ── Main grid ─────────────────────────────────────────── */}
      <div className="px-4 lg:px-6 grid gap-6 lg:grid-cols-12">
        {/* LEFT 8/12 */}
        <div className="lg:col-span-8 space-y-6">
          {/* Overview section */}
          <Section
            eyebrow="Overview"
            title="Workspace identity"
            description="Name, slug, plan, and lifecycle."
            icon={Building2}
          >
            <ItemGroup>
              <Item>
                <ItemMedia variant="icon">
                  <Hash className="size-4" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Workspace id</ItemTitle>
                  <ItemDescription className="font-mono text-[11px] break-all">
                    {org.id}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => copy("id", org.id)}
                        />
                      }
                    >
                      {copied === "id" ? (
                        <Check className="size-3.5" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </TooltipTrigger>
                    <TooltipContent>Copy workspace id</TooltipContent>
                  </Tooltip>
                </ItemActions>
              </Item>
              <ItemSeparator />
              <Item>
                <ItemMedia variant="icon">
                  <Building2 className="size-4" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Slug</ItemTitle>
                  <ItemDescription className="font-mono">/{org.slug}</ItemDescription>
                </ItemContent>
              </Item>
              <ItemSeparator />
              <Item>
                <ItemMedia variant="icon">
                  <Calendar className="size-4" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Created</ItemTitle>
                  <ItemDescription>
                    {format(new Date(org.createdAt), "PPpp")} ·{" "}
                    {formatDistanceToNow(new Date(org.createdAt), { addSuffix: true })}
                  </ItemDescription>
                </ItemContent>
              </Item>
              <ItemSeparator />
              <Item>
                <ItemMedia variant="icon">
                  <CreditCard className="size-4" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Plan</ItemTitle>
                  <ItemDescription>Standard (no plan upgrade yet)</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] uppercase tracking-[0.04em]"
                  >
                    standard
                  </Badge>
                </ItemActions>
              </Item>
            </ItemGroup>
          </Section>

          {/* Members */}
          <Section
            eyebrow="Members"
            title={`${org.memberCount} member${org.memberCount === 1 ? "" : "s"}`}
            description="Every user with access to this workspace and their role."
            icon={Users}
            action={
              org.memberCount > 0 && (
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] uppercase tracking-[0.04em] gap-1"
                >
                  <Crown className="size-2.5 text-violet-700" />
                  {org.ownerCount} owner
                </Badge>
              )
            }
          >
            <MembersTab orgId={org.id} />
          </Section>

          {/* Activity */}
          <Section
            eyebrow="Activity"
            title="Recent audit events"
            description="Actions targeting this workspace, scoped via the audit chain."
            icon={ActivityIcon}
          >
            <ActivityTab orgId={org.id} />
          </Section>
        </div>

        {/* RIGHT 4/12 */}
        <div className="lg:col-span-4 space-y-6">
          {/* Suspension controls */}
          <Section
            eyebrow="Status"
            title={org.suspended ? "Workspace suspended" : "Workspace active"}
            description={
              org.suspended
                ? "All members blocked at sign-in."
                : "Members can sign in and use the TMS normally."
            }
            icon={org.suspended ? Pause : PlayCircle}
            compact
          >
            <FieldGroup>
              <Field orientation="horizontal" className="items-center justify-between">
                <FieldContent>
                  <FieldLabel>Suspended</FieldLabel>
                  <FieldDescription>
                    Block all members at sign-in.
                  </FieldDescription>
                </FieldContent>
                <Switch
                  checked={org.suspended}
                  onCheckedChange={(v) => {
                    if (v) setSuspendOpen(true)
                    else unsuspendMutation.mutate()
                  }}
                  disabled={unsuspendMutation.isPending}
                />
              </Field>
            </FieldGroup>
          </Section>

          {/* Plan / billing */}
          <Section
            eyebrow="Plan"
            title="Standard"
            description="No plan upgrade yet — Muvx is in early access."
            icon={CreditCard}
            compact
          >
            <FieldGroup>
              <Field orientation="horizontal">
                <FieldLabel>Members</FieldLabel>
                <FieldContent className="text-right">
                  <FieldDescription>
                    {org.memberCount} of unlimited
                  </FieldDescription>
                </FieldContent>
              </Field>
              <Field orientation="horizontal">
                <FieldLabel>Loads</FieldLabel>
                <FieldContent className="text-right">
                  <FieldDescription>{initialStats.loads.total}</FieldDescription>
                </FieldContent>
              </Field>
              <Field orientation="horizontal">
                <FieldLabel>Revenue (all-time)</FieldLabel>
                <FieldContent className="text-right">
                  <FieldDescription className="font-mono">
                    {formatMoney(initialStats.revenue.allTime)}
                  </FieldDescription>
                </FieldContent>
              </Field>
            </FieldGroup>
          </Section>

          {/* Settings (raw metadata) */}
          {org.metadata && (
            <Section
              eyebrow="Settings"
              title="Raw metadata"
              description="Stored organization.metadata blob."
              icon={Settings2}
              compact
            >
              <pre className="max-h-48 overflow-auto rounded-lg bg-brand-cream-soft p-3 font-mono text-[11px] text-brand-ink">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(org.metadata), null, 2)
                  } catch {
                    return org.metadata
                  }
                })()}
              </pre>
            </Section>
          )}

          {/* Member growth sparkline (mock for now, real data via future API) */}
          <Section
            eyebrow="Health"
            title="Activity score"
            description="Heuristic based on member engagement and recent events."
            icon={Gauge}
            compact
          >
            <ActivityScore stats={initialStats} memberCount={org.memberCount} />
          </Section>
        </div>
      </div>

      {/* ── Danger zone ──────────────────────────────────────── */}
      <div className="px-4 lg:px-6">
        <Card className="border-red-200 bg-red-50/40 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-red-100 text-red-900 shrink-0">
              <ShieldAlert className="size-4" />
            </div>
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
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="destructive"
              className="gap-2"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" />
              Delete workspace permanently
            </Button>
            <Kbd>type {org.name} to confirm</Kbd>
          </div>
        </Card>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────── */}
      <SuspendDialog
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        reason={suspendReason}
        setReason={setSuspendReason}
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

// ─── Building blocks ───────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  progress,
  progressTone,
}: {
  label: string
  value: string
  hint?: string
  icon: React.ComponentType<{ className?: string }>
  tone: "ok" | "warn" | "destructive" | "muted"
  progress?: number
  progressTone?: "ok" | "warn"
}) {
  return (
    <Card className="border-brand-rule bg-brand-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft">
          {label}
        </div>
        <Icon
          className={cn(
            "size-3.5",
            tone === "ok" && "text-emerald-600",
            tone === "warn" && "text-amber-600",
            tone === "destructive" && "text-brand-accent",
            tone === "muted" && "text-brand-muted-soft"
          )}
        />
      </div>
      <div className="font-serif text-2xl leading-none text-brand-ink">
        {value}
      </div>
      {progress !== undefined && (
        <Progress
          value={progress}
          className={cn(
            "h-1",
            progressTone === "warn" ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"
          )}
        />
      )}
      {hint && <div className="text-[11px] text-brand-muted-soft">{hint}</div>}
    </Card>
  )
}

function Section({
  eyebrow,
  title,
  description,
  icon: Icon,
  action,
  compact,
  children,
}: {
  eyebrow: string
  title: string
  description?: string
  icon: React.ComponentType<{ className?: string }>
  action?: React.ReactNode
  compact?: boolean
  children: React.ReactNode
}) {
  return (
    <Card className="border-brand-rule bg-brand-card overflow-hidden p-0">
      <CardHeader
        className={cn(
          "flex flex-row items-start justify-between gap-3 space-y-0",
          compact ? "p-4 pb-3" : "p-5 pb-4"
        )}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-md bg-brand-cream-soft text-brand-ink">
              <Icon className="size-3.5" />
            </div>
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft">
              {eyebrow}
            </span>
          </div>
          <CardTitle className="font-serif text-lg leading-tight text-brand-ink">
            {title}
          </CardTitle>
          {description && (
            <p className="text-[12px] text-brand-ink/60">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </CardHeader>
      <CardContent className={cn(compact ? "px-4 pb-4" : "px-5 pb-5")}>
        {children}
      </CardContent>
    </Card>
  )
}

function WorkspaceActionsMenu({
  suspended,
  onSuspend,
  onUnsuspend,
  unsuspendPending,
  onDelete,
}: {
  suspended: boolean
  onSuspend: () => void
  onUnsuspend: () => void
  unsuspendPending: boolean
  onDelete: () => void
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className="size-9"
            aria-label="More actions"
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        <div className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft px-2 py-1.5">
          Workspace
        </div>
        {suspended ? (
          <PopoverItem
            icon={PlayCircle}
            label="Unsuspend"
            onClick={onUnsuspend}
            disabled={unsuspendPending}
          />
        ) : (
          <PopoverItem
            icon={Pause}
            label="Suspend workspace"
            onClick={onSuspend}
          />
        )}
        <Separator className="my-1" />
        <div className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft px-2 py-1.5">
          Shortcuts
        </div>
        <div className="px-2 py-1.5 flex items-center justify-between text-[11px]">
          <span className="text-brand-muted-soft">Suspend / Unsuspend</span>
          <Kbd>⌘S</Kbd>
        </div>
        <div className="px-2 py-1.5 flex items-center justify-between text-[11px]">
          <span className="text-brand-muted-soft">View as workspace</span>
          <Kbd>⌘V</Kbd>
        </div>
        <Separator className="my-1" />
        <PopoverItem
          icon={Trash2}
          label="Delete workspace"
          onClick={onDelete}
          destructive
        />
      </PopoverContent>
    </Popover>
  )
}

function PopoverItem({
  icon: Icon,
  label,
  onClick,
  disabled,
  destructive,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  disabled?: boolean
  destructive?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-brand-cream-soft disabled:opacity-50 disabled:hover:bg-transparent transition-colors",
        destructive && "text-brand-accent hover:bg-brand-accent/10"
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  )
}

function ActivityScore({
  stats,
  memberCount,
}: {
  stats: OrgStats
  memberCount: number
}) {
  // Heuristic: more recent activity + more members = higher score
  let score = 0
  if (memberCount > 0) score += 20
  if (stats.loads.total > 0) score += 20
  if (stats.drivers.total > 0) score += 15
  if (stats.trucks.total > 0) score += 15
  if (stats.invoices.paid > 0) score += 15
  if (stats.lastActivityAt) score += 15
  score = Math.min(100, score)
  const tone = score >= 70 ? "ok" : score >= 40 ? "warn" : "muted"
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <span
          className={cn(
            "font-serif text-3xl",
            tone === "ok" && "text-emerald-700",
            tone === "warn" && "text-amber-700",
            tone === "muted" && "text-brand-muted-soft"
          )}
        >
          {score}
        </span>
        <span className="text-xs text-brand-muted-soft mb-1">/ 100</span>
      </div>
      <Progress
        value={score}
        className={cn(
          "h-2",
          tone === "ok" && "[&>div]:bg-emerald-500",
          tone === "warn" && "[&>div]:bg-amber-500",
          tone === "muted" && "[&>div]:bg-brand-muted-soft"
        )}
      />
      <p className="text-[11px] text-brand-muted-soft">
        Based on members, TMS data, invoices, and last activity.
      </p>
    </div>
  )
}

// ─── Tabs (inlined as sections) ──────────────────────────────────────────

function MembersTab({ orgId }: { orgId: string }) {
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
  const [changeRoleMember, setChangeRoleMember] = React.useState<Member | null>(
    null
  )
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
      queryClient.invalidateQueries({
        queryKey: ["admin-workspace-members", orgId],
      })
    },
    onError: (e) => toast.error((e as Error).message),
  })

  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 max-w-sm"
        />
        <div className="ml-auto text-xs text-brand-muted-soft">
          {q.data?.total ?? 0} member{(q.data?.total ?? 0) === 1 ? "" : "s"}
        </div>
      </div>

      {q.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : q.isError ? (
        <div className="text-sm text-brand-accent">
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
        <ItemGroup>
          {q.data!.members.map((m) => {
            const RoleIcon = ROLE_ICONS[m.role] ?? Users
            const initials = (m.name || m.email)
              .split(/[\s@]/g)
              .map((w) => w[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()
            return (
              <Item
                key={m.memberId}
                className="flex-row items-center gap-3 py-3"
              >
                <Avatar className="size-9 rounded-lg">
                  <AvatarImage src={m.image ?? undefined} alt={m.name} />
                  <AvatarFallback className="rounded-lg bg-brand-ink text-brand-cream text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <ItemContent>
                  <ItemTitle>
                    <Link
                      href={`/admin/users/${m.userId}`}
                      className="hover:underline"
                    >
                      {m.name}
                    </Link>
                    <span className="ml-2 text-[11px] text-brand-muted-soft font-normal">
                      {m.email}
                    </span>
                  </ItemTitle>
                  <ItemDescription>
                    joined{" "}
                    {formatDistanceToNow(new Date(m.joinedAt), { addSuffix: true })}
                    {m.lastActiveAt && (
                      <>
                        <span className="mx-1.5 text-brand-muted-soft">·</span>
                        last active{" "}
                        {formatDistanceToNow(new Date(m.lastActiveAt), {
                          addSuffix: true,
                        })}
                      </>
                    )}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <div className="flex items-center gap-1.5">
                    {m.platformRole === "admin" && (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] uppercase tracking-[0.04em] gap-1 border-violet-300 bg-violet-50 text-violet-900"
                            />
                          }
                        >
                          <Sparkles className="size-2.5" />
                          platform
                        </TooltipTrigger>
                        <TooltipContent>This user is a platform admin</TooltipContent>
                      </Tooltip>
                    )}
                    {m.banned && (
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] uppercase tracking-[0.04em] border-red-300 bg-red-50 text-red-900"
                      >
                        banned
                      </Badge>
                    )}
                    {m.suspended && !m.banned && (
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] uppercase tracking-[0.04em] border-amber-300 bg-amber-50 text-amber-900"
                      >
                        suspended
                      </Badge>
                    )}
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-mono text-[10px] uppercase tracking-[0.04em] gap-1",
                              m.role === "owner" &&
                                "border-violet-300 bg-violet-50 text-violet-900"
                            )}
                          />
                        }
                      >
                        <RoleIcon className="size-2.5" />
                        {m.role}
                      </TooltipTrigger>
                      <TooltipContent>{WORKSPACE_ROLES.find((r) => r.value === m.role)?.label}</TooltipContent>
                    </Tooltip>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setChangeRoleMember(m)}
                  >
                    Change role
                  </Button>
                </ItemActions>
              </Item>
            )
          })}
        </ItemGroup>
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
    </>
  )
}

function ActivityTab({ orgId }: { orgId: string }) {
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
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )

  if (q.isError)
    return <div className="text-sm text-brand-accent">{(q.error as Error).message}</div>

  const events = q.data?.events ?? []

  if (events.length === 0) {
    return (
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
    )
  }

  return (
    <ItemGroup>
      {events.map((e) => (
        <Item key={e.id} className="flex-col items-start gap-0.5 py-3">
          <div className="flex w-full items-center gap-2">
            <span className="font-mono text-[11px] font-medium text-brand-ink">
              {e.action}
            </span>
            <span className="text-[11px] text-brand-muted-soft">
              by {e.actorEmail}
            </span>
            <span className="ml-auto text-[11px] text-brand-muted-soft">
              {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}
            </span>
          </div>
          {e.targetLabel && (
            <div className="text-[11px] text-brand-muted-soft font-mono">
              → {e.targetLabel}
            </div>
          )}
          {e.metadata && Object.keys(e.metadata).length > 0 && (
            <HoverCard>
              <HoverCardTrigger
                render={
                  <button className="font-mono text-[10px] text-brand-muted-soft hover:text-brand-ink transition-colors" />
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
        </Item>
      ))}
    </ItemGroup>
  )
}

// ─── Dialogs ──────────────────────────────────────────────────────────────

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
        <FieldGroup>
          <Field>
            <FieldLabel>Reason</FieldLabel>
            <FieldContent>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="resize-none"
                placeholder="e.g. Payment failed, customer requested pause, abuse investigation…"
              />
            </FieldContent>
          </Field>
        </FieldGroup>
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
        <FieldGroup>
          <Field>
            <FieldLabel>Role</FieldLabel>
            <FieldContent>
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
            </FieldContent>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(role)} disabled={pending}>
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
            Type <Kbd>{name}</Kbd> to confirm, and check the box to
            acknowledge the impact.
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
            {pending ? (
              <Spinner className="mr-2 size-4" />
            ) : (
              <Trash2 className="mr-2 size-4" />
            )}
            Delete forever
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
