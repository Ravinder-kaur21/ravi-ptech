"use client"

/**
 * /admin/users/[id] — comprehensive dedicated detail page for one user.
 *
 * Design follows the 2026 enterprise pattern (Linear/Stripe/Vercel):
 *
 *   1.  Breadcrumb header with large avatar, name, role/status badges
 *   2.  KPI strip (4 hero metrics with sparkline-friendly data)
 *   3.  Two-column main grid:
 *        LEFT (8/12)  Profile item-list · Activity timeline · Workspaces
 *        RIGHT (4/12) Security & access · Linked accounts · Risk · Actions
 *   4.  Tabbed deep-dive: Sessions · Sign-in history · Activity · Workspaces
 *   5.  Danger zone with typed-confirmation delete
 *
 * Components used (in addition to the earlier set):
 *   - Item, ItemGroup, ItemMedia, ItemContent, ItemTitle,
 *     ItemDescription, ItemActions, ItemSeparator, ItemHeader, ItemFooter
 *   - Field, FieldGroup, FieldSet, FieldLabel, FieldDescription
 *   - Alert, AlertTitle, AlertDescription, AlertAction
 *   - Kbd, KbdGroup
 *   - Progress
 *   - Switch
 *   - InputGroup, InputGroupInput
 *   - Accordion
 *   - Separator (extensively)
 *   - Tooltip (extensively)
 *   - Popover (for inline action menus)
 *   - HoverCard (for sign-in detail previews)
 */
import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { format, formatDistanceToNow } from "date-fns"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import {
  ArrowLeft,
  ShieldOff,
  ShieldCheck,
  Pause,
  PlayCircle,
  KeyRound,
  MailCheck,
  Trash2,
  Building2,
  ScrollText,
  Eye,
  Copy,
  Check,
  UserCog,
  Globe,
  Smartphone,
  Monitor,
  Link2,
  History,
  AlertCircle,
  Clock,
  ChevronRight,
  MoreHorizontal,
  ExternalLink,
  Activity as ActivityIcon,
  MapPin,
  Calendar,
  Phone,
  AtSign,
  Fingerprint,
  Gauge,
  Bell,
  Settings2,
  Zap,
  Hash,
  ShieldAlert,
  CircleDot,
  Sparkles,
  CalendarClock,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
  ItemHeader,
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
  FieldSet,
  FieldTitle,
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { cn } from "@/lib/utils"

// ─── Types ─────────────────────────────────────────────────────────────────

type DistinctIp = {
  ip: string
  firstSeen: string
  lastSeen: string
  signInCount: number
}

type LinkedAccount = {
  id: string
  providerId: string
  accountId: string
  createdAt: string
  lastSignInAt: string
}

type EnrichedUser = {
  id: string
  email: string
  name: string
  emailVerified: boolean
  image: string | null
  role: string | null
  banned: boolean | null
  banReason: string | null
  banExpires: string | null
  suspendedAt: string | null
  suspendedUntil: string | null
  suspendedReason: string | null
  appealMessage: string | null
  appealStatus: string | null
  appealSubmittedAt: string | null
  phone: string | null
  username: string | null
  displayUsername: string | null
  createdAt: string
  updatedAt: string
  lastSignInAt: string | null
  lastSignInIp: string | null
  lastSignInUserAgent: string | null
  activeSessionCount: number
  totalSessionCount: number
  distinctSignInIps: DistinctIp[]
  linkedAccounts: LinkedAccount[]
  signupFromIp: string | null
  signupFromUa: string | null
  signupAt: string | null
  auditEventCount: number
}

type Membership = {
  organizationId: string
  organizationName: string
  organizationSlug: string
  role: string
  createdAt: string
}

type Props = {
  user: EnrichedUser
  memberships: Membership[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function userStatus(u: EnrichedUser): "active" | "suspended" | "banned" {
  if (u.banned) return "banned"
  if (
    u.suspendedAt &&
    (u.suspendedUntil === null || new Date(u.suspendedUntil) > new Date())
  )
    return "suspended"
  return "active"
}

function statusTone(s: "active" | "suspended" | "banned") {
  if (s === "banned")
    return {
      label: "Banned",
      cls: "border-red-300 bg-red-50 text-red-900",
      dot: "bg-red-500",
    }
  if (s === "suspended")
    return {
      label: "Suspended",
      cls: "border-amber-300 bg-amber-50 text-amber-900",
      dot: "bg-amber-500",
    }
  return {
    label: "Active",
    cls: "border-emerald-300 bg-emerald-50 text-emerald-900",
    dot: "bg-emerald-500",
  }
}

function parseDevice(ua: string | null): {
  browser: string
  os: string
  isMobile: boolean
} {
  if (!ua) return { browser: "Unknown", os: "Unknown", isMobile: false }
  let browser = "Browser"
  if (/Edg\//.test(ua)) browser = "Edge"
  else if (/Chrome\//.test(ua)) browser = "Chrome"
  else if (/Firefox\//.test(ua)) browser = "Firefox"
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = "Safari"
  let os = "Unknown OS"
  if (/iPhone|iPad/.test(ua)) os = "iOS"
  else if (/Android/.test(ua)) os = "Android"
  else if (/Mac OS X/.test(ua)) os = "macOS"
  else if (/Windows/.test(ua)) os = "Windows"
  else if (/Linux/.test(ua)) os = "Linux"
  const isMobile = /Mobile|Android|iPhone|iPad/.test(ua)
  return { browser, os, isMobile }
}

function deviceIcon(ua: string | null) {
  const d = parseDevice(ua)
  if (d.isMobile) return <Smartphone className="size-3.5" />
  return <Monitor className="size-3.5" />
}

function providerIcon(providerId: string) {
  if (providerId === "google")
    return (
      <span className="text-[10px] font-bold leading-none text-brand-ink">
        G
      </span>
    )
  if (providerId === "credential")
    return <KeyRound className="size-3.5" />
  return <Link2 className="size-3.5" />
}

// ─── Page ──────────────────────────────────────────────────────────────────

export function UserDetailPage({ user: u, memberships }: Props) {
  console.log(`[USER-DETAIL-PAGE] rendering user=${u.id} ${u.email}`)
  const router = useRouter()
  const queryClient = useQueryClient()
  const [copied, setCopied] = React.useState<string | null>(null)
  const copy = (label: string, value: string) => {
    navigator.clipboard.writeText(value)
    setCopied(label)
    setTimeout(() => setCopied(null), 1200)
  }

  const status = userStatus(u)
  const tone = statusTone(status)
  const role = u.role === "admin" ? "admin" : "user"
  const initials = (u.name || u.email)
    .split(/[\s@]/g)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-users"] })
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] })
    queryClient.invalidateQueries({ queryKey: ["admin-user-sessions", u.id] })
    queryClient.invalidateQueries({ queryKey: ["admin-user-activity", u.id] })
    router.refresh()
  }

  // ── Action: ban / unban ─────────────────────────────────────────────
  const [banOpen, setBanOpen] = React.useState(false)
  const [banReason, setBanReason] = React.useState("Policy violation")
  const [banDays, setBanDays] = React.useState("30")
  const banMutation = useMutation({
    mutationFn: async () => {
      const days = Number(banDays) || 30
      const r = await authClient.admin.banUser({
        userId: u.id,
        banReason,
        banExpiresIn: 60 * 60 * 24 * days,
      })
      if (r.error) throw new Error(r.error.message || "Ban failed")
      await fetch(`/api/admin/users/${u.id}/audit-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "user.ban",
          metadata: { reason: banReason, days },
        }),
      })
    },
    onSuccess: () => {
      toast.success(`${u.email} banned`)
      setBanOpen(false)
      refreshAll()
    },
    onError: (e) => toast.error((e as Error).message),
  })

  const unbanMutation = useMutation({
    mutationFn: async () => {
      const r = await authClient.admin.unbanUser({ userId: u.id })
      if (r.error) throw new Error(r.error.message || "Unban failed")
      await fetch(`/api/admin/users/${u.id}/audit-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "user.unban" }),
      })
    },
    onSuccess: () => {
      toast.success(`${u.email} unbanned`)
      refreshAll()
    },
    onError: (e) => toast.error((e as Error).message),
  })

  // ── Action: suspend / lift ──────────────────────────────────────────
  const [suspendOpen, setSuspendOpen] = React.useState(false)
  const [suspendReason, setSuspendReason] = React.useState("")
  const [suspendDays, setSuspendDays] = React.useState("7")
  const suspendMutation = useMutation({
    mutationFn: async () => {
      const days = suspendDays ? Number(suspendDays) : null
      const r = await fetch(`/api/admin/users/${u.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "suspend",
          reason: suspendReason,
          durationDays: days,
        }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.error || "Suspend failed")
      }
    },
    onSuccess: () => {
      toast.success(`${u.email} suspended`)
      setSuspendOpen(false)
      setSuspendReason("")
      refreshAll()
    },
    onError: (e) => toast.error((e as Error).message),
  })

  const liftMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/admin/users/${u.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lift-suspension" }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.error || "Lift failed")
      }
    },
    onSuccess: () => {
      toast.success(`Suspension lifted`)
      refreshAll()
    },
    onError: (e) => toast.error((e as Error).message),
  })

  // ── Action: set role (platform) ─────────────────────────────────────
  const promoteMutation = useMutation({
    mutationFn: async (toRole: "user" | "admin") => {
      const r = await fetch(`/api/admin/users/${u.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-role", role: toRole }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.error || "Role change failed")
      }
    },
    onSuccess: (_d, toRole) => {
      toast.success(
        `Now ${toRole === "admin" ? "platform admin" : "a regular user"}`
      )
      refreshAll()
    },
    onError: (e) => toast.error((e as Error).message),
  })

  // ── Action: reset password ──────────────────────────────────────────
  const [resetOpen, setResetOpen] = React.useState(false)
  const [newPassword, setNewPassword] = React.useState("")
  const resetMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/admin/users/${u.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset-password",
          newPassword,
        }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.error || "Reset failed")
      }
    },
    onSuccess: () => {
      toast.success("Password reset")
      setResetOpen(false)
      setNewPassword("")
    },
    onError: (e) => toast.error((e as Error).message),
  })

  // ── Action: force verify ────────────────────────────────────────────
  const verifyMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/admin/users/${u.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "force-verify-email" }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.error || "Verify failed")
      }
    },
    onSuccess: () => {
      toast.success("Email marked as verified")
      refreshAll()
    },
    onError: (e) => toast.error((e as Error).message),
  })

  // ── Action: impersonate ─────────────────────────────────────────────
  const [impersonateOpen, setImpersonateOpen] = React.useState(false)
  const impersonateMutation = useMutation({
    mutationFn: async () => {
      const r = await authClient.admin.impersonateUser({ userId: u.id })
      if (r.error) throw new Error(r.error.message || "Impersonate failed")
      await fetch(`/api/admin/users/${u.id}/audit-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "user.impersonate" }),
      })
    },
    onSuccess: () => {
      toast.success(`Impersonating ${u.email}`)
      setImpersonateOpen(false)
      window.location.href = "/dashboard"
    },
    onError: (e) => toast.error((e as Error).message),
  })

  // ── Action: remove (DANGER ZONE) ────────────────────────────────────
  const [removeOpen, setRemoveOpen] = React.useState(false)
  const [removeTyped, setRemoveTyped] = React.useState("")
  const removeMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/admin/users/${u.id}/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.error || "Remove failed")
      }
      return r.json()
    },
    onSuccess: () => {
      toast.success(`${u.email} permanently deleted`)
      setRemoveOpen(false)
      router.push("/admin/users")
      router.refresh()
    },
    onError: (e) => toast.error((e as Error).message),
  })

  // Risk score: simple heuristic, 0–100 (low is good).
  //  - banned or suspended → 100
  //  - unverified email → +20
  //  - many distinct IPs in 90d → +10 per IP above 3
  //  - no sign-ins at all → +15
  const risk = (() => {
    let r = 0
    if (u.banned) r += 60
    if (u.suspendedAt && (u.suspendedUntil === null || new Date(u.suspendedUntil) > new Date())) r += 30
    if (!u.emailVerified) r += 20
    if (u.distinctSignInIps.length > 3) r += (u.distinctSignInIps.length - 3) * 10
    if (!u.lastSignInAt) r += 15
    return Math.min(100, r)
  })()
  const riskTone =
    risk >= 70 ? "destructive" : risk >= 40 ? "warn" : "ok"
  const riskLabel = riskTone === "destructive" ? "High" : riskTone === "warn" ? "Medium" : "Low"

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb ─────────────────────────────────────────── */}
      <div className="px-4 lg:px-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/admin" />}>Admin</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/admin/users" />}>
                Users
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{u.email}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* ── Hero header ────────────────────────────────────────── */}
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="size-20 rounded-xl">
              <AvatarImage src={u.image ?? undefined} alt={u.name} />
              <AvatarFallback className="rounded-xl bg-brand-ink text-brand-cream text-2xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="size-2 shrink-0 rounded-full bg-brand-accent" />
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-ink">
                  User
                </span>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-mono text-[10px] uppercase tracking-[0.04em] gap-1",
                          tone.cls
                        )}
                      />
                    }
                  >
                    <CircleDot className={cn("size-2", tone.dot)} />
                    {tone.label}
                  </TooltipTrigger>
                  <TooltipContent>Current account status</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-mono text-[10px] uppercase tracking-[0.04em] gap-1",
                          role === "admin"
                            ? "border-violet-300 bg-violet-50 text-violet-900"
                            : "border-brand-rule bg-brand-card text-brand-muted-soft"
                        )}
                      />
                    }
                  >
                    {role === "admin" && <Sparkles className="size-2.5" />}
                    {role === "admin" ? "Platform admin" : "Standard user"}
                  </TooltipTrigger>
                  <TooltipContent>
                    Platform role (independent of workspace roles)
                  </TooltipContent>
                </Tooltip>
                {u.emailVerified ? (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] uppercase tracking-[0.04em] gap-1 border-emerald-300 bg-emerald-50 text-emerald-900"
                        />
                      }
                    >
                      <Check className="size-2.5" />
                      Email verified
                    </TooltipTrigger>
                    <TooltipContent>Email is verified</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] uppercase tracking-[0.04em] gap-1 border-amber-300 bg-amber-50 text-amber-900"
                        />
                      }
                    >
                      <AlertCircle className="size-2.5" />
                      Email unverified
                    </TooltipTrigger>
                    <TooltipContent>User has not verified their email</TooltipContent>
                  </Tooltip>
                )}
              </div>
              <h1 className="mt-2 font-serif text-[clamp(28px,3.5vw,40px)] leading-[1.05] tracking-tight text-brand-ink">
                {u.name || u.email}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-brand-ink/70">
                <span className="font-mono">{u.email}</span>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        onClick={() => copy("id", u.id)}
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
                      {u.id.slice(0, 8)}…
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Click to copy full user id</TooltipContent>
                </Tooltip>
                {u.username && (
                  <span className="inline-flex items-center gap-1 text-brand-muted-soft">
                    <AtSign className="size-3" />
                    <span className="font-mono">{u.username}</span>
                  </span>
                )}
                {u.phone && (
                  <span className="inline-flex items-center gap-1 text-brand-muted-soft">
                    <Phone className="size-3" />
                    <span className="font-mono">{u.phone}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right side — quick actions menu */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => impersonateMutation.mutate()}
                    disabled={status !== "active" || impersonateMutation.isPending}
                    className="size-9"
                    aria-label="Impersonate"
                  />
                }
              >
                {impersonateMutation.isPending ? (
                  <Spinner className="size-4" />
                ) : (
                  <UserCog className="size-4" />
                )}
              </TooltipTrigger>
              <TooltipContent>Impersonate user</TooltipContent>
            </Tooltip>
            <ActionsMenu
              user={u}
              status={status}
              onBan={() => setBanOpen(true)}
              onUnban={() => unbanMutation.mutate()}
              unbanPending={unbanMutation.isPending}
              onSuspend={() => setSuspendOpen(true)}
              onLift={() => liftMutation.mutate()}
              liftPending={liftMutation.isPending}
              onPromoteToggle={() =>
                promoteMutation.mutate(role === "admin" ? "user" : "admin")
              }
              promotePending={promoteMutation.isPending}
              onResetPwd={() => setResetOpen(true)}
              onForceVerify={() => verifyMutation.mutate()}
              verifyPending={verifyMutation.isPending}
              isAdmin={role === "admin"}
              canImpersonate={status === "active"}
            />
          </div>
        </div>
      </div>

      {/* ── Status alerts (banned / suspended / unverified) ── */}
      {(u.banned || u.suspendedAt || !u.emailVerified) && (
        <div className="px-4 lg:px-6 space-y-2">
          {u.banned && u.banReason && (
            <Alert variant="destructive">
              <ShieldAlert className="size-4" />
              <AlertTitle>Account banned</AlertTitle>
              <AlertDescription className="flex items-center gap-2">
                <span>{u.banReason}</span>
                {u.banExpires && (
                  <span className="text-[11px] opacity-80">
                    · expires {new Date(u.banExpires).toLocaleString()}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
          {u.suspendedAt &&
            (u.suspendedUntil === null ||
              new Date(u.suspendedUntil) > new Date()) &&
            u.suspendedReason && (
              <Alert className="border-amber-300 bg-amber-50 text-amber-900">
                <Pause className="size-4" />
                <AlertTitle>Account suspended</AlertTitle>
                <AlertDescription className="flex items-center gap-2">
                  <span>{u.suspendedReason}</span>
                  <span className="text-[11px] opacity-80">
                    ·{" "}
                    {u.suspendedUntil
                      ? `ends ${new Date(u.suspendedUntil).toLocaleString()}`
                      : "indefinite"}{" "}
                    · started {new Date(u.suspendedAt).toLocaleString()}
                  </span>
                </AlertDescription>
              </Alert>
            )}
          {!u.emailVerified && (
            <Alert className="border-amber-300 bg-amber-50 text-amber-900">
              <MailCheck className="size-4" />
              <AlertTitle>Email unverified</AlertTitle>
              <AlertDescription>
                User has not clicked the verification link sent at sign-up. Use{" "}
                <Kbd>Force-verify</Kbd> in the actions menu to mark the email
                as verified.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* ── KPI strip ─────────────────────────────────────────── */}
      <div className="px-4 lg:px-6">
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <KpiCard
            label="Active sessions"
            value={`${u.activeSessionCount} / ${u.totalSessionCount}`}
            icon={Zap}
            tone={u.activeSessionCount > 0 ? "ok" : "muted"}
            hint={
              u.activeSessionCount > 0
                ? "Sessions live right now"
                : "No live sessions"
            }
            extra={
              u.lastSignInAt
                ? `last ${formatDistanceToNow(new Date(u.lastSignInAt), { addSuffix: true })}`
                : "never"
            }
          />
          <KpiCard
            label="Distinct IPs (90d)"
            value={String(u.distinctSignInIps.length)}
            icon={Globe}
            tone={
              u.distinctSignInIps.length > 5
                ? "warn"
                : u.distinctSignInIps.length === 0
                  ? "muted"
                  : "ok"
            }
            hint={
              u.distinctSignInIps.length > 5
                ? "Multiple locations"
                : u.distinctSignInIps.length === 0
                  ? "No sign-ins yet"
                  : u.distinctSignInIps.length === 1
                    ? "Single location"
                    : "A few locations"
            }
            extra={
              u.lastSignInIp
                ? `last from ${u.lastSignInIp}`
                : "no IP on file"
            }
          />
          <KpiCard
            label="Workspaces"
            value={String(memberships.length)}
            icon={Building2}
            tone={memberships.length === 0 ? "muted" : "ok"}
            hint={
              memberships.length === 0
                ? "No memberships"
                : memberships.length === 1
                  ? memberships[0].organizationName
                  : `${memberships.length} memberships`
            }
            extra={
              memberships.some((m) => m.role === "owner")
                ? "is an owner"
                : memberships.length > 0
                  ? "is a member"
                  : undefined
            }
          />
          <KpiCard
            label="Audit events"
            value={u.auditEventCount.toLocaleString()}
            icon={ScrollText}
            tone={u.auditEventCount > 100 ? "warn" : "ok"}
            hint="as actor or target"
            extra={
              <Link
                href={`/admin/audit?target=user:${u.id}`}
                className="inline-flex items-center gap-1 text-brand-accent hover:underline"
              >
                open audit log
                <ChevronRight className="size-3" />
              </Link>
            }
          />
        </div>
      </div>

      {/* ── Main grid ─────────────────────────────────────────── */}
      <div className="px-4 lg:px-6 grid gap-6 lg:grid-cols-12">
        {/* LEFT 8/12 */}
        <div className="lg:col-span-8 space-y-6">
          {/* Profile section */}
          <Section
            eyebrow="Profile"
            title="Identity & contact"
            description="How the user identifies themselves across Muvx."
            icon={Fingerprint}
          >
            <ItemGroup>
              <Item>
                <ItemMedia variant="icon">
                  <AtSign className="size-4" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Email</ItemTitle>
                  <ItemDescription className="font-mono text-brand-ink">
                    {u.email}
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
                          onClick={() => copy("email", u.email)}
                          aria-label="Copy email"
                        />
                      }
                    >
                      {copied === "email" ? (
                        <Check className="size-3.5" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </TooltipTrigger>
                    <TooltipContent>Copy email</TooltipContent>
                  </Tooltip>
                </ItemActions>
              </Item>
              <ItemSeparator />
              <Item>
                <ItemMedia variant="icon">
                  <UserCog className="size-4" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Display name</ItemTitle>
                  <ItemDescription>{u.name || "—"}</ItemDescription>
                </ItemContent>
              </Item>
              {u.username && (
                <>
                  <ItemSeparator />
                  <Item>
                    <ItemMedia variant="icon">
                      <AtSign className="size-4" />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>Username</ItemTitle>
                      <ItemDescription className="font-mono">
                        @{u.username}
                      </ItemDescription>
                    </ItemContent>
                  </Item>
                </>
              )}
              {u.phone && (
                <>
                  <ItemSeparator />
                  <Item>
                    <ItemMedia variant="icon">
                      <Phone className="size-4" />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>Phone</ItemTitle>
                      <ItemDescription className="font-mono">
                        {u.phone}
                      </ItemDescription>
                    </ItemContent>
                  </Item>
                </>
              )}
              <ItemSeparator />
              <Item>
                <ItemMedia variant="icon">
                  <Calendar className="size-4" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Account created</ItemTitle>
                  <ItemDescription>
                    {format(new Date(u.createdAt), "PPpp")} ·{" "}
                    {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                  </ItemDescription>
                </ItemContent>
              </Item>
              <ItemSeparator />
              <Item>
                <ItemMedia variant="icon">
                  <Hash className="size-4" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>User id</ItemTitle>
                  <ItemDescription className="font-mono text-[11px] break-all">
                    {u.id}
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
                          onClick={() => copy("id", u.id)}
                        />
                      }
                    >
                      {copied === "id" ? (
                        <Check className="size-3.5" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </TooltipTrigger>
                    <TooltipContent>Copy user id</TooltipContent>
                  </Tooltip>
                </ItemActions>
              </Item>
            </ItemGroup>
          </Section>

          {/* Workspace memberships */}
          <Section
            eyebrow="Workspaces"
            title={`${memberships.length} workspace${memberships.length === 1 ? "" : "s"}`}
            description="Organizations this user belongs to, with their role in each."
            icon={Building2}
            action={
              memberships.length > 0 && (
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] uppercase tracking-[0.04em]"
                >
                  {memberships.filter((m) => m.role === "owner").length} owner
                </Badge>
              )
            }
          >
            {memberships.length === 0 ? (
              <Empty>
                <EmptyMedia>
                  <Building2 className="size-5" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>No workspace memberships</EmptyTitle>
                  <EmptyDescription>
                    This user is not a member of any workspace. They can sign
                    in but will not see any TMS data.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ItemGroup>
                {memberships.map((m) => (
                  <Item
                    key={m.organizationId}
                    render={<Link href={`/admin/workspaces/${m.organizationId}`} />}
                    className="cursor-pointer hover:bg-brand-cream-soft/50 transition-colors"
                  >
                    <ItemMedia variant="icon">
                      <Building2 className="size-4" />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{m.organizationName}</ItemTitle>
                      <ItemDescription>
                        <span className="font-mono">/{m.organizationSlug}</span>
                        {" · "}
                        joined{" "}
                        {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-mono text-[10px] uppercase tracking-[0.04em]",
                          m.role === "owner" &&
                            "border-violet-300 bg-violet-50 text-violet-900"
                        )}
                      >
                        {m.role}
                      </Badge>
                      <ChevronRight className="size-4 text-brand-muted-soft" />
                    </ItemActions>
                  </Item>
                ))}
              </ItemGroup>
            )}
          </Section>

          {/* Tabs (deep-dive) */}
          <Section
            eyebrow="Deep dive"
            title="Sign-in, sessions, activity"
            description="Detailed logs and sign-in forensics."
            icon={ActivityIcon}
          >
            <Tabs defaultValue="sessions" className="w-full">
              <TabsList>
                <TabsTrigger value="sessions">
                  Sessions ({u.activeSessionCount})
                </TabsTrigger>
                <TabsTrigger value="signin">Sign-in history</TabsTrigger>
                <TabsTrigger value="activity">
                  Activity ({u.auditEventCount})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="sessions" className="mt-4">
                <SessionsTab userId={u.id} />
              </TabsContent>
              <TabsContent value="signin" className="mt-4">
                <SignInHistoryTab user={u} />
              </TabsContent>
              <TabsContent value="activity" className="mt-4">
                <ActivityTab userId={u.id} />
              </TabsContent>
            </Tabs>
          </Section>
        </div>

        {/* RIGHT 4/12 */}
        <div className="lg:col-span-4 space-y-6">
          {/* Security & access */}
          <Section
            eyebrow="Security"
            title="Access & devices"
            description="Last sign-in origin and risk."
            icon={ShieldCheck}
            compact
          >
            <ItemGroup>
              <Item>
                <ItemMedia variant="icon">
                  <Clock className="size-4" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Last sign-in</ItemTitle>
                  <ItemDescription>
                    {u.lastSignInAt
                      ? `${format(new Date(u.lastSignInAt), "PPp")} · ${formatDistanceToNow(new Date(u.lastSignInAt), { addSuffix: true })}`
                      : "No sign-in recorded"}
                  </ItemDescription>
                </ItemContent>
              </Item>
              <ItemSeparator />
              <Item>
                <ItemMedia variant="icon">
                  <Globe className="size-4" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Last sign-in IP</ItemTitle>
                  <ItemDescription className="font-mono">
                    {u.lastSignInIp ?? "—"}
                  </ItemDescription>
                </ItemContent>
                {u.lastSignInIp && (
                  <ItemActions>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => copy("lastip", u.lastSignInIp!)}
                          />
                        }
                      >
                        {copied === "lastip" ? (
                          <Check className="size-3" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </TooltipTrigger>
                      <TooltipContent>Copy IP</TooltipContent>
                    </Tooltip>
                  </ItemActions>
                )}
              </Item>
              <ItemSeparator />
              <Item>
                <ItemMedia variant="icon">
                  {deviceIcon(u.lastSignInUserAgent)}
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Last device</ItemTitle>
                  <ItemDescription className="truncate">
                    {parseDevice(u.lastSignInUserAgent).browser} ·{" "}
                    {parseDevice(u.lastSignInUserAgent).os}
                  </ItemDescription>
                </ItemContent>
              </Item>
              <ItemSeparator />
              <Item>
                <ItemMedia variant="icon">
                  <Fingerprint className="size-4" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Signup origin</ItemTitle>
                  <ItemDescription className="font-mono">
                    {u.signupFromIp ?? "—"}
                  </ItemDescription>
                </ItemContent>
                {u.signupFromIp && (
                  <ItemActions>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => copy("signupip", u.signupFromIp!)}
                          />
                        }
                      >
                        {copied === "signupip" ? (
                          <Check className="size-3" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </TooltipTrigger>
                      <TooltipContent>Copy signup IP</TooltipContent>
                    </Tooltip>
                  </ItemActions>
                )}
              </Item>
            </ItemGroup>
          </Section>

          {/* Risk score */}
          <Card className="border-brand-rule bg-brand-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft">
                Risk score
              </h3>
              <Gauge className="size-4 text-brand-muted-soft" />
            </div>
            <div className="flex items-end gap-2">
              <span
                className={cn(
                  "font-serif text-3xl",
                  riskTone === "destructive" && "text-brand-accent",
                  riskTone === "warn" && "text-amber-700",
                  riskTone === "ok" && "text-emerald-700"
                )}
              >
                {risk}
              </span>
              <span className="text-xs text-brand-muted-soft mb-1">/ 100</span>
            </div>
            <Progress
              value={risk}
              className={cn(
                "h-2",
                riskTone === "destructive" && "[&>div]:bg-brand-accent",
                riskTone === "warn" && "[&>div]:bg-amber-500",
                riskTone === "ok" && "[&>div]:bg-emerald-500"
              )}
            />
            <p className="text-[11px] text-brand-muted-soft">
              {riskLabel} risk · calculated from status, email verification,
              sign-in patterns, and IP history.
            </p>
          </Card>

          {/* Linked accounts */}
          <Section
            eyebrow="Linked"
            title="OAuth providers"
            description="Sign-in methods linked to this account."
            icon={Link2}
            compact
          >
            {u.linkedAccounts.length === 0 ? (
              <div className="text-sm text-brand-muted-soft p-3">
                No OAuth providers linked. User signs in with email + OTP only.
              </div>
            ) : (
              <ItemGroup>
                {u.linkedAccounts.map((a) => (
                  <Item key={a.id}>
                    <ItemMedia variant="icon">
                      {providerIcon(a.providerId)}
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle className="capitalize">
                        {a.providerId}
                      </ItemTitle>
                      <ItemDescription className="font-mono text-[11px]">
                        {a.accountId}
                      </ItemDescription>
                      <ItemDescription>
                        linked{" "}
                        {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}{" "}
                        · last used{" "}
                        {formatDistanceToNow(new Date(a.lastSignInAt), { addSuffix: true })}
                      </ItemDescription>
                    </ItemContent>
                  </Item>
                ))}
              </ItemGroup>
            )}
          </Section>

          {/* Quick info */}
          <Section
            eyebrow="Account"
            title="Lifecycle"
            description="Account age and last update."
            icon={CalendarClock}
            compact
          >
            <FieldGroup>
              <Field>
                <FieldLabel>Created</FieldLabel>
                <FieldDescription>
                  {format(new Date(u.createdAt), "PPpp")}
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel>Last updated</FieldLabel>
                <FieldDescription>
                  {format(new Date(u.updatedAt), "PPpp")}
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel>Account age</FieldLabel>
                <FieldDescription>
                  {Math.floor(
                    (Date.now() - new Date(u.createdAt).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )}{" "}
                  days
                </FieldDescription>
              </Field>
            </FieldGroup>
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
                Permanently delete {u.email}. This hard-deletes the user,
                their sessions, OAuth links, and any workspaces they own
                (including every load, driver, truck, trip, invoice, and
                payroll record in those workspaces). Audit log references
                are anonymized — the user row cannot be recovered.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="destructive"
              className="gap-2"
              onClick={() => setRemoveOpen(true)}
            >
              <Trash2 className="size-4" />
              Remove user permanently
            </Button>
            <Kbd>type DELETE to confirm</Kbd>
          </div>
        </Card>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────── */}
      <BanDialog
        open={banOpen}
        onOpenChange={setBanOpen}
        reason={banReason}
        setReason={setBanReason}
        days={banDays}
        setDays={setBanDays}
        email={u.email}
        pending={banMutation.isPending}
        onConfirm={() => banMutation.mutate()}
      />

      <SuspendDialog
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        reason={suspendReason}
        setReason={setSuspendReason}
        days={suspendDays}
        setDays={setSuspendDays}
        email={u.email}
        pending={suspendMutation.isPending}
        onConfirm={() => suspendMutation.mutate()}
      />

      <ResetPasswordDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        password={newPassword}
        setPassword={setNewPassword}
        email={u.email}
        pending={resetMutation.isPending}
        onConfirm={() => resetMutation.mutate()}
      />

      <ImpersonateDialog
        open={impersonateOpen}
        onOpenChange={setImpersonateOpen}
        email={u.email}
        pending={impersonateMutation.isPending}
        onConfirm={() => impersonateMutation.mutate()}
      />

      <RemoveUserDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        email={u.email}
        typed={removeTyped}
        setTyped={setRemoveTyped}
        pending={removeMutation.isPending}
        onConfirm={() => removeMutation.mutate()}
      />
    </div>
  )
}

// ─── Building blocks ───────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
  hint,
  extra,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  tone: "ok" | "warn" | "destructive" | "muted"
  hint?: string
  extra?: React.ReactNode
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
      <div className="font-serif text-3xl leading-none text-brand-ink">
        {value}
      </div>
      {hint && (
        <div className="text-[11px] text-brand-muted-soft">{hint}</div>
      )}
      {extra && <div className="text-[11px]">{extra}</div>}
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
    <Card
      className={cn(
        "border-brand-rule bg-brand-card overflow-hidden",
        compact ? "p-0" : "p-0"
      )}
    >
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

function ActionsMenu({
  user,
  status,
  onBan,
  onUnban,
  unbanPending,
  onSuspend,
  onLift,
  liftPending,
  onPromoteToggle,
  promotePending,
  onResetPwd,
  onForceVerify,
  verifyPending,
  isAdmin,
  canImpersonate,
}: {
  user: EnrichedUser
  status: "active" | "suspended" | "banned"
  onBan: () => void
  onUnban: () => void
  unbanPending: boolean
  onSuspend: () => void
  onLift: () => void
  liftPending: boolean
  onPromoteToggle: () => void
  promotePending: boolean
  onResetPwd: () => void
  onForceVerify: () => void
  verifyPending: boolean
  isAdmin: boolean
  canImpersonate: boolean
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
          Account
        </div>
        {status === "banned" ? (
          <PopoverItem
            icon={ShieldCheck}
            label="Unban user"
            onClick={onUnban}
            disabled={unbanPending}
          />
        ) : (
          <PopoverItem
            icon={ShieldOff}
            label="Ban user"
            onClick={onBan}
            disabled={user.banned === true}
          />
        )}
        {status === "suspended" ? (
          <PopoverItem
            icon={PlayCircle}
            label="Lift suspension"
            onClick={onLift}
            disabled={liftPending}
          />
        ) : (
          <PopoverItem
            icon={Pause}
            label="Suspend"
            onClick={onSuspend}
            disabled={user.banned === true}
          />
        )}
        <PopoverItem
          icon={UserCog}
          label={isAdmin ? "Demote to user" : "Promote to platform admin"}
          onClick={onPromoteToggle}
          disabled={promotePending}
        />
        <PopoverItem icon={KeyRound} label="Reset password" onClick={onResetPwd} />
        {!user.emailVerified && (
          <PopoverItem
            icon={MailCheck}
            label="Force-verify email"
            onClick={onForceVerify}
            disabled={verifyPending}
          />
        )}
        <Separator className="my-1" />
        <div className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft px-2 py-1.5">
          Shortcuts
        </div>
        <div className="px-2 py-1.5 flex items-center justify-between text-[11px]">
          <span className="text-brand-muted-soft">Open audit log</span>
          <Kbd>⌘A</Kbd>
        </div>
        <div className="px-2 py-1.5 flex items-center justify-between text-[11px]">
          <span className="text-brand-muted-soft">Impersonate</span>
          <Kbd>⌘I</Kbd>
        </div>
        {canImpersonate && (
          <>
            <Separator className="my-1" />
            <PopoverItem
              icon={UserCog}
              label="Impersonate user"
              onClick={() => {
                /* wired separately via the icon button */
              }}
              disabled={!canImpersonate}
            />
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

function PopoverItem({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-brand-cream-soft disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
    >
      <Icon className="size-3.5 text-brand-muted-soft" />
      {label}
    </button>
  )
}

// ─── Tabs ──────────────────────────────────────────────────────────────────

function SignInHistoryTab({ user: u }: { user: EnrichedUser }) {
  console.log(`[USER-DETAIL-PAGE] SignInHistoryTab userId=${u.id}`)
  return (
    <Card className="border-brand-rule bg-brand-card overflow-hidden">
      <div className="border-b border-brand-rule p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft">
              Distinct sign-in IPs (last 90 days)
            </h3>
            <p className="mt-0.5 text-[11px] text-brand-muted-soft">
              Grouped by IP. Each row shows first-seen, last-seen, total
              sign-ins.
            </p>
          </div>
          <History className="size-4 text-brand-muted-soft" />
        </div>
      </div>

      {u.distinctSignInIps.length === 0 ? (
        <Empty>
          <EmptyMedia>
            <Globe className="size-5" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>No sign-in IPs recorded</EmptyTitle>
            <EmptyDescription>
              This user has not signed in yet, or sessions are not capturing
              IP addresses.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-brand-cream-soft/50 hover:bg-brand-cream-soft/50">
              <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                IP address
              </TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                First seen
              </TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                Last seen
              </TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft text-right">
                Sign-ins
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {u.distinctSignInIps.map((row) => (
              <TableRow key={row.ip}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Globe className="size-3.5 text-brand-muted-soft" />
                    <span className="font-mono text-sm text-brand-ink">
                      {row.ip}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-brand-ink/80">
                  {format(new Date(row.firstSeen), "PPp")}
                </TableCell>
                <TableCell className="text-xs text-brand-ink/80">
                  {format(new Date(row.lastSeen), "PPp")}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] uppercase tracking-[0.04em]"
                  >
                    {row.signInCount}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  )
}

function SessionsTab({ userId }: { userId: string }) {
  console.log(`[USER-DETAIL-PAGE] SessionsTab userId=${userId}`)
  const q = useQuery({
    queryKey: ["admin-user-sessions", userId],
    queryFn: async () => {
      const r = await fetch(`/api/admin/users/${userId}/sessions`)
      if (!r.ok) throw new Error("Failed to load sessions")
      return r.json() as Promise<{
        sessions: {
          id: string
          ipAddress: string | null
          userAgent: string | null
          createdAt: string
          expiresAt: string
          isCurrent: boolean
        }[]
      }>
    },
    staleTime: 15_000,
  })

  const queryClient = useQueryClient()
  const revokeAll = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/admin/users/${userId}/sessions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      })
      if (!r.ok) throw new Error("Revoke failed")
    },
    onSuccess: () => {
      toast.success("All sessions revoked")
      queryClient.invalidateQueries({ queryKey: ["admin-user-sessions", userId] })
    },
    onError: (e) => toast.error((e as Error).message),
  })

  if (q.isLoading)
    return (
      <Card className="border-brand-rule bg-brand-card p-6 space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </Card>
    )

  if (q.isError)
    return (
      <Card className="border-brand-rule bg-brand-card p-6 text-sm text-brand-accent">
        {(q.error as Error).message}
      </Card>
    )

  const sessions = q.data?.sessions ?? []

  return (
    <Card className="border-brand-rule bg-brand-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-brand-rule p-4">
        <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft">
          {sessions.length} active session{sessions.length === 1 ? "" : "s"}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => revokeAll.mutate()}
          disabled={revokeAll.isPending || sessions.length === 0}
          className="gap-1.5 text-brand-accent border-red-200 hover:bg-red-50"
        >
          {revokeAll.isPending ? (
            <Spinner className="size-3" />
          ) : (
            <ShieldOff className="size-3" />
          )}
          Revoke all
        </Button>
      </div>

      {sessions.length === 0 ? (
        <Empty>
          <EmptyMedia>
            <Eye className="size-5" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>No active sessions</EmptyTitle>
            <EmptyDescription>
              The user is not currently signed in on any device.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ItemGroup>
          {sessions.map((s) => {
            const d = parseDevice(s.userAgent)
            return (
              <Item key={s.id}>
                <ItemMedia variant="icon">
                  {d.isMobile ? (
                    <Smartphone className="size-4" />
                  ) : (
                    <Monitor className="size-4" />
                  )}
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>
                    {d.browser} · {d.os}
                    {s.isCurrent && (
                      <Badge
                        variant="outline"
                        className="ml-2 font-mono text-[10px] uppercase tracking-[0.04em] border-emerald-300 bg-emerald-50 text-emerald-900"
                      >
                        current
                      </Badge>
                    )}
                  </ItemTitle>
                  <ItemDescription>
                    {s.ipAddress ? (
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Globe className="size-3" />
                        {s.ipAddress}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-700">
                        <AlertCircle className="size-3" />
                        no IP captured
                      </span>
                    )}
                    <span className="mx-2 text-brand-muted-soft">·</span>
                    started {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                    <span className="mx-2 text-brand-muted-soft">·</span>
                    expires{" "}
                    {formatDistanceToNow(new Date(s.expiresAt), { addSuffix: true })}
                  </ItemDescription>
                </ItemContent>
              </Item>
            )
          })}
        </ItemGroup>
      )}
    </Card>
  )
}

function ActivityTab({ userId }: { userId: string }) {
  console.log(`[USER-DETAIL-PAGE] ActivityTab userId=${userId}`)
  const q = useQuery({
    queryKey: ["admin-user-activity", userId],
    queryFn: async () => {
      const r = await fetch(`/api/admin/users/${userId}/activity`)
      if (!r.ok) throw new Error("Failed to load activity")
      return r.json() as Promise<{
        events: {
          id: string
          action: string
          actorEmail: string
          metadata: Record<string, unknown> | null
          createdAt: string
        }[]
      }>
    },
    staleTime: 15_000,
  })

  if (q.isLoading)
    return (
      <Card className="border-brand-rule bg-brand-card p-6 space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
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
            <EmptyTitle>No activity recorded yet</EmptyTitle>
            <EmptyDescription>
              Audit events targeting this user will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ScrollArea className="max-h-[480px]">
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
        </ScrollArea>
      )}
    </Card>
  )
}

// ─── Dialogs ──────────────────────────────────────────────────────────────

function BanDialog({
  open,
  onOpenChange,
  reason,
  setReason,
  days,
  setDays,
  email,
  pending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  reason: string
  setReason: (s: string) => void
  days: string
  setDays: (s: string) => void
  email: string
  pending: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ban {email}?</DialogTitle>
          <DialogDescription>
            Banning blocks the user from signing in. They can still be
            invited to workspaces but cannot authenticate.
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
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>Ban duration (days)</FieldLabel>
            <FieldContent>
              <Input
                type="number"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                min={1}
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
            className="bg-brand-accent text-white hover:bg-brand-accent/90"
          >
            {pending ? <Spinner className="mr-2 size-4" /> : null}
            Ban user
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SuspendDialog({
  open,
  onOpenChange,
  reason,
  setReason,
  days,
  setDays,
  email,
  pending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  reason: string
  setReason: (s: string) => void
  days: string
  setDays: (s: string) => void
  email: string
  pending: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspend {email}?</DialogTitle>
          <DialogDescription>
            Suspended users see an appeal screen on sign-in. They can
            request reinstatement; you resolve appeals in /admin/appeals.
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
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>Duration (days, blank = indefinite)</FieldLabel>
            <FieldContent>
              <Input
                type="number"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                min={1}
                placeholder="7"
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

function ResetPasswordDialog({
  open,
  onOpenChange,
  password,
  setPassword,
  email,
  pending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  password: string
  setPassword: (s: string) => void
  email: string
  pending: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password for {email}</DialogTitle>
          <DialogDescription>
            Set a new password. The user can sign in with it immediately.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>New password (min 8 chars)</FieldLabel>
            <FieldContent>
              <Input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
              />
            </FieldContent>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={pending || password.length < 8}>
            {pending ? <Spinner className="mr-2 size-4" /> : null}
            Reset password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ImpersonateDialog({
  open,
  onOpenChange,
  email,
  pending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  email: string
  pending: boolean
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Impersonate {email}?</AlertDialogTitle>
          <AlertDialogDescription>
            You will be signed in as this user for up to 30 minutes. Every
            action is logged in the audit log with your admin email as the
            actor. To stop, click "Stop impersonating" in the banner.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={pending}>
            {pending ? <Spinner className="mr-2 size-4" /> : null}
            Impersonate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function RemoveUserDialog({
  open,
  onOpenChange,
  email,
  typed,
  setTyped,
  pending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  email: string
  typed: string
  setTyped: (s: string) => void
  pending: boolean
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Permanently delete {email}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action is <b>not reversible</b>. The user, their sessions,
            OAuth links, and any workspaces they own (with every load,
            driver, truck, trip, invoice, and payroll record) will be
            permanently deleted. Audit log references are anonymized.
            <br />
            <br />
            Type <Kbd>DELETE</Kbd> to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="DELETE"
          className="h-10 font-mono"
          autoFocus
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={typed !== "DELETE" || pending}
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
