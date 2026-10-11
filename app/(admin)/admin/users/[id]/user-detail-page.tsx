"use client"

/**
 * /admin/users/[id] — comprehensive dedicated detail page for one user.
 *
 * Replaces the previous right-side Sheet (user-detail-sheet.tsx) with
 * a real full page that has: profile, action toolbar, sessions/activity/
 * workspaces tabs, and a danger-zone with typed-confirmation delete.
 *
 * The page is fed the initial user + role payload from the server
 * component (so the first paint has data); the live state for the
 * tabs is loaded via React Query.
 */
import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
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
} from "lucide-react"
import { Card } from "@/components/ui/card"
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
import { cn } from "@/lib/utils"

// ─── Types (server-rendered shape) ─────────────────────────────────────────

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

function statusTone(
  s: "active" | "suspended" | "banned"
): { label: string; cls: string } {
  if (s === "banned")
    return {
      label: "Banned",
      cls: "border-red-300 bg-red-50 text-red-900",
    }
  if (s === "suspended")
    return {
      label: "Suspended",
      cls: "border-amber-300 bg-amber-50 text-amber-900",
    }
  return {
    label: "Active",
    cls: "border-emerald-300 bg-emerald-50 text-emerald-900",
  }
}

function StatCell({
  label,
  value,
  hint,
}: {
  label: string
  value: React.ReactNode
  hint?: string
}) {
  return (
    <div className="space-y-1">
      <div className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft">
        {label}
      </div>
      <div className="font-serif text-lg leading-tight text-brand-ink">
        {value}
      </div>
      {hint && (
        <div className="text-[11px] text-brand-muted-soft">{hint}</div>
      )}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

export function UserDetailPage({ user: u, memberships }: Props) {
  console.log(`[USER-DETAIL-PAGE] rendering user=${u.id} ${u.email}`)
  const router = useRouter()
  const queryClient = useQueryClient()
  const [copied, setCopied] = React.useState(false)

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
    queryClient.invalidateQueries({ queryKey: ["admin-user", u.id] })
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
      router.refresh()
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
      router.refresh()
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
      router.refresh()
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
      router.refresh()
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
      toast.success(`Now ${toRole === "admin" ? "platform admin" : "a regular user"}`)
      refreshAll()
      router.refresh()
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
      router.refresh()
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

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-4 lg:px-6">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-xs text-brand-muted-soft hover:text-brand-ink transition-colors"
        >
          <ArrowLeft className="size-3" />
          Back to users
        </Link>

        <div className="mt-3 flex items-start gap-4">
          <Avatar className="size-14 rounded-lg">
            <AvatarImage src={u.image ?? undefined} alt={u.name} />
            <AvatarFallback className="rounded-lg bg-brand-ink text-brand-cream text-base font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="size-1.5 shrink-0 rounded-full bg-brand-accent" />
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-ink">
                USER
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "font-mono text-[10px] uppercase tracking-[0.04em]",
                  tone.cls
                )}
              >
                {tone.label}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "font-mono text-[10px] uppercase tracking-[0.04em]",
                  role === "admin"
                    ? "border-violet-300 bg-violet-50 text-violet-900"
                    : "border-brand-rule bg-brand-card text-brand-muted-soft"
                )}
              >
                {role}
              </Badge>
              {u.emailVerified ? (
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] uppercase tracking-[0.04em] border-emerald-300 bg-emerald-50 text-emerald-900"
                >
                  email verified
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] uppercase tracking-[0.04em] border-amber-300 bg-amber-50 text-amber-900"
                >
                  email unverified
                </Badge>
              )}
            </div>
            <h1 className="mt-2 font-serif text-[clamp(28px,3.5vw,40px)] leading-[1.05] tracking-tight text-brand-ink">
              {u.name || u.email}
            </h1>
            <div className="mt-1 flex items-center gap-2 text-[13px] text-brand-ink/70">
              <span>{u.email}</span>
              <HoverCard>
                <HoverCardTrigger
                  render={
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(u.id)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 1500)
                      }}
                      className="inline-flex items-center gap-1 rounded p-1 text-brand-muted-soft hover:text-brand-ink hover:bg-brand-cream-soft transition-colors"
                      aria-label="Copy user id"
                    />
                  }
                >
                  {copied ? (
                    <Check className="size-3" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                  <span className="font-mono text-[10px]">
                    {u.id.slice(0, 8)}…
                  </span>
                </HoverCardTrigger>
                <HoverCardContent>
                  <p className="text-xs">Click to copy full user id</p>
                </HoverCardContent>
              </HoverCard>
            </div>
          </div>
        </div>
      </div>

      {/* ── Profile + Actions ────────────────────────────────────── */}
      <div className="px-4 lg:px-6 grid gap-6 lg:grid-cols-3">
        <Card className="border-brand-rule bg-brand-card p-5 lg:col-span-2 space-y-5">
          <div>
            <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft">
              Profile
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3">
              <StatCell label="Email" value={u.email} />
              <StatCell
                label="Phone"
                value={u.phone ?? <span className="text-brand-muted-soft">—</span>}
              />
              <StatCell
                label="Joined"
                value={new Date(u.createdAt).toLocaleDateString()}
                hint={
                  u.lastSignInAt
                    ? `last sign-in ${formatDistanceToNow(new Date(u.lastSignInAt), { addSuffix: true })}`
                    : "never signed in"
                }
              />
              <StatCell
                label="Email verified"
                value={u.emailVerified ? "Yes" : "No"}
              />
              <StatCell label="Platform role" value={role} />
              <StatCell
                label="Workspaces"
                value={memberships.length}
                hint={
                  memberships.length === 1
                    ? memberships[0].organizationName
                    : `${memberships.length} memberships`
                }
              />
            </div>
          </div>

          {u.banned && u.banReason && (
            <Card className="border-red-200 bg-red-50 p-3">
              <div className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-red-900">
                Ban reason
              </div>
              <p className="mt-1 text-sm text-red-900">{u.banReason}</p>
              {u.banExpires && (
                <p className="mt-1 text-[11px] text-red-700">
                  Expires {new Date(u.banExpires).toLocaleString()}
                </p>
              )}
            </Card>
          )}

          {u.suspendedAt &&
            (u.suspendedUntil === null ||
              new Date(u.suspendedUntil) > new Date()) &&
            u.suspendedReason && (
              <Card className="border-amber-200 bg-amber-50 p-3">
                <div className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-amber-900">
                  Suspension reason
                </div>
                <p className="mt-1 text-sm text-amber-900">
                  {u.suspendedReason}
                </p>
                <p className="mt-1 text-[11px] text-amber-700">
                  {u.suspendedUntil
                    ? `Ends ${new Date(u.suspendedUntil).toLocaleString()}`
                    : "Indefinite"}{" "}
                  · started{" "}
                  {new Date(u.suspendedAt).toLocaleString()}
                </p>
              </Card>
            )}
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5 space-y-3">
          <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft">
            Quick actions
          </h2>
          <div className="space-y-2">
            {u.banned ? (
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => unbanMutation.mutate()}
                disabled={unbanMutation.isPending}
              >
                {unbanMutation.isPending ? (
                  <Spinner className="size-4" />
                ) : (
                  <ShieldCheck className="size-4" />
                )}
                Unban user
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setBanOpen(true)}
                disabled={!!u.banned}
              >
                <ShieldOff className="size-4" />
                Ban user
              </Button>
            )}

            {status === "suspended" ? (
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => liftMutation.mutate()}
                disabled={liftMutation.isPending}
              >
                {liftMutation.isPending ? (
                  <Spinner className="size-4" />
                ) : (
                  <PlayCircle className="size-4" />
                )}
                Lift suspension
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setSuspendOpen(true)}
                disabled={!!u.banned}
              >
                <Pause className="size-4" />
                Suspend
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() =>
                promoteMutation.mutate(role === "admin" ? "user" : "admin")
              }
              disabled={promoteMutation.isPending}
            >
              <UserCog className="size-4" />
              {role === "admin" ? "Demote to user" : "Promote to platform admin"}
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => setResetOpen(true)}
            >
              <KeyRound className="size-4" />
              Reset password
            </Button>

            {!u.emailVerified && (
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => verifyMutation.mutate()}
                disabled={verifyMutation.isPending}
              >
                {verifyMutation.isPending ? (
                  <Spinner className="size-4" />
                ) : (
                  <MailCheck className="size-4" />
                )}
                Force-verify email
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* ── Security + Linked accounts (deep info) ────────────── */}
      <div className="px-4 lg:px-6 grid gap-6 lg:grid-cols-2">
        <SecurityCard user={u} />
        <LinkedAccountsCard user={u} />
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div className="px-4 lg:px-6">
        <Tabs defaultValue="sessions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sessions">
              Sessions ({u.activeSessionCount})
            </TabsTrigger>
            <TabsTrigger value="signin">Sign-in history</TabsTrigger>
            <TabsTrigger value="activity">Activity ({u.auditEventCount})</TabsTrigger>
            <TabsTrigger value="workspaces">
              Workspaces ({memberships.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sessions">
            <SessionsTab userId={u.id} />
          </TabsContent>

          <TabsContent value="signin">
            <SignInHistoryTab user={u} />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityTab userId={u.id} />
          </TabsContent>

          <TabsContent value="workspaces">
            <WorkspacesTab memberships={memberships} />
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Danger zone ──────────────────────────────────────────── */}
      <div className="px-4 lg:px-6">
        <Card className="border-red-200 bg-red-50/40 p-5 space-y-3">
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
          <Button
            variant="destructive"
            className="gap-2"
            onClick={() => setRemoveOpen(true)}
          >
            <Trash2 className="size-4" />
            Remove user permanently
          </Button>
        </Card>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────── */}
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

// ─── Tabs ──────────────────────────────────────────────────────────────────

function SecurityCard({ user: u }: { user: EnrichedUser }) {
  console.log(`[USER-DETAIL-PAGE] SecurityCard userId=${u.id}`)
  const ageDays = Math.floor(
    (Date.now() - new Date(u.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <Card className="border-brand-rule bg-brand-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft">
          Security &amp; access
        </h2>
        <ShieldCheck className="size-4 text-brand-muted-soft" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCell
          label="Email verified"
          value={
            u.emailVerified ? (
              <span className="text-emerald-700">Yes</span>
            ) : (
              <span className="text-amber-700">No</span>
            )
          }
          hint={u.emailVerified ? "verified" : "unverified"}
        />
        <StatCell
          label="Account age"
          value={`${ageDays} ${ageDays === 1 ? "day" : "days"}`}
          hint={`joined ${new Date(u.createdAt).toLocaleDateString()}`}
        />
        <StatCell
          label="Active sessions"
          value={
            <span className="font-mono">
              {u.activeSessionCount} / {u.totalSessionCount}
            </span>
          }
          hint={`${u.totalSessionCount - u.activeSessionCount} expired`}
        />
        <StatCell
          label="Distinct IPs (90d)"
          value={u.distinctSignInIps.length}
          hint={
            u.distinctSignInIps.length === 0
              ? "no sign-ins yet"
              : u.distinctSignInIps.length === 1
                ? "single location"
                : "multiple locations"
          }
        />
      </div>

      <div className="border-t border-brand-rule pt-4 space-y-3">
        <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft">
          Last sign-in
        </h3>
        {u.lastSignInAt ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="size-3.5 text-brand-muted-soft" />
              <span className="text-brand-ink">
                {new Date(u.lastSignInAt).toLocaleString()}
              </span>
              <span className="text-[11px] text-brand-muted-soft">
                ({formatDistanceToNow(new Date(u.lastSignInAt), { addSuffix: true })})
              </span>
            </div>
            {u.lastSignInIp && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="size-3.5 text-brand-muted-soft" />
                <span className="font-mono text-brand-ink">
                  {u.lastSignInIp}
                </span>
                <CopyIpButton ip={u.lastSignInIp} />
              </div>
            )}
            {u.lastSignInUserAgent && (
              <div className="flex items-center gap-2 text-sm">
                <Monitor className="size-3.5 text-brand-muted-soft" />
                <span className="text-brand-ink/80 truncate text-[12px]">
                  {parseDevice(u.lastSignInUserAgent)}
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-brand-muted-soft">No sign-ins recorded</p>
        )}
      </div>

      <div className="border-t border-brand-rule pt-4 space-y-2">
        <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft">
          Signup origin
        </h3>
        {u.signupAt ? (
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="size-3.5 text-brand-muted-soft" />
              <span className="text-brand-ink/80">
                {new Date(u.signupAt).toLocaleString()}
              </span>
            </div>
            {u.signupFromIp && (
              <div className="flex items-center gap-2">
                <Globe className="size-3.5 text-brand-muted-soft" />
                <span className="font-mono text-brand-ink">
                  {u.signupFromIp}
                </span>
                <CopyIpButton ip={u.signupFromIp} />
              </div>
            )}
            {u.signupFromUa && (
              <div className="flex items-center gap-2">
                <Monitor className="size-3.5 text-brand-muted-soft" />
                <span className="text-brand-ink/80 truncate text-[12px]">
                  {parseDevice(u.signupFromUa)}
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-brand-muted-soft">
            No signup attempt record (likely signed up before this tracker existed)
          </p>
        )}
      </div>
    </Card>
  )
}

function LinkedAccountsCard({ user: u }: { user: EnrichedUser }) {
  console.log(`[USER-DETAIL-PAGE] LinkedAccountsCard userId=${u.id}`)
  return (
    <Card className="border-brand-rule bg-brand-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft">
          Linked accounts
        </h2>
        <Link2 className="size-4 text-brand-muted-soft" />
      </div>

      {u.linkedAccounts.length === 0 ? (
        <p className="text-sm text-brand-muted-soft">
          No OAuth providers linked. User signs in with email + OTP only.
        </p>
      ) : (
        <ul className="divide-y divide-brand-rule">
          {u.linkedAccounts.map((a) => (
            <li key={a.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-md bg-brand-cream-soft text-brand-ink shrink-0">
                  {providerIcon(a.providerId)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-brand-ink capitalize">
                      {a.providerId}
                    </span>
                    <span className="font-mono text-[10px] text-brand-muted-soft truncate">
                      {a.accountId}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-[11px] text-brand-muted-soft">
                    <span>
                      linked{" "}
                      {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                    </span>
                    <span>
                      last used{" "}
                      {formatDistanceToNow(new Date(a.lastSignInAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-brand-rule pt-4 space-y-2">
        <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft">
          Account identifiers
        </h3>
        <dl className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2">
            <dt className="text-brand-muted-soft w-24">User id</dt>
            <dd className="font-mono text-brand-ink truncate">{u.id}</dd>
          </div>
          {u.username && (
            <div className="flex items-center gap-2">
              <dt className="text-brand-muted-soft w-24">Username</dt>
              <dd className="font-mono text-brand-ink">@{u.username}</dd>
            </div>
          )}
          <div className="flex items-center gap-2">
            <dt className="text-brand-muted-soft w-24">Email</dt>
            <dd className="text-brand-ink truncate">{u.email}</dd>
          </div>
          {u.phone && (
            <div className="flex items-center gap-2">
              <dt className="text-brand-muted-soft w-24">Phone</dt>
              <dd className="font-mono text-brand-ink">{u.phone}</dd>
            </div>
          )}
        </dl>
      </div>
    </Card>
  )
}

function CopyIpButton({ ip }: { ip: string }) {
  const [copied, setCopied] = React.useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(ip)
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      }}
      className="inline-flex items-center gap-1 rounded p-1 text-brand-muted-soft hover:text-brand-ink hover:bg-brand-cream-soft transition-colors"
      aria-label="Copy IP"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </button>
  )
}

function providerIcon(providerId: string) {
  if (providerId === "google")
    return <span className="text-xs font-semibold">G</span>
  return <Link2 className="size-3.5" />
}

function parseDevice(ua: string | null): string {
  if (!ua) return "Unknown device"
  // Best-effort UA parser (no library — keep it light). Handles the
  // common cases: Chrome/Safari/Firefox + iOS/Android.
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
  return `${browser} · ${os}`
}

function SignInHistoryTab({ user: u }: { user: EnrichedUser }) {
  console.log(`[USER-DETAIL-PAGE] SignInHistoryTab userId=${u.id}`)
  return (
    <Card className="border-brand-rule bg-brand-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-brand-rule p-4">
        <div>
          <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft">
            Distinct sign-in IPs (last 90 days)
          </h3>
          <p className="mt-0.5 text-[11px] text-brand-muted-soft">
            Grouped by IP. Each row shows first-seen, last-seen, and total sign-ins.
          </p>
        </div>
        <History className="size-4 text-brand-muted-soft" />
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
                    <CopyIpButton ip={row.ip} />
                  </div>
                </TableCell>
                <TableCell className="text-xs text-brand-ink/80">
                  {new Date(row.firstSeen).toLocaleString()}
                </TableCell>
                <TableCell className="text-xs text-brand-ink/80">
                  {new Date(row.lastSeen).toLocaleString()}
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
      <Card className="border-brand-rule bg-brand-card p-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="mt-2 h-12 w-full" />
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
        <ScrollArea className="max-h-[420px]">
          <ul className="divide-y divide-brand-rule">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 p-4 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {s.userAgent?.includes("Mobile") || s.userAgent?.includes("Android") || s.userAgent?.includes("iPhone") ? (
                      <Smartphone className="size-3.5 text-brand-muted-soft" />
                    ) : (
                      <Monitor className="size-3.5 text-brand-muted-soft" />
                    )}
                    <span className="font-medium text-brand-ink truncate">
                      {parseDevice(s.userAgent)}
                    </span>
                    {s.isCurrent && (
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] uppercase tracking-[0.04em] border-emerald-300 bg-emerald-50 text-emerald-900"
                      >
                        current
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-brand-muted-soft">
                    {s.ipAddress ? (
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Globe className="size-3" />
                        {s.ipAddress}
                        <CopyIpButton ip={s.ipAddress} />
                      </span>
                    ) : (
                      <span className="text-amber-700 inline-flex items-center gap-1">
                        <AlertCircle className="size-3" />
                        no IP captured
                      </span>
                    )}
                    <span>
                      started {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                    </span>
                    {s.expiresAt && (
                      <span>
                        expires{" "}
                        {formatDistanceToNow(new Date(s.expiresAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
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
      <Card className="border-brand-rule bg-brand-card p-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="mt-2 h-12 w-full" />
        <Skeleton className="mt-2 h-12 w-full" />
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

function WorkspacesTab({ memberships }: { memberships: Membership[] }) {
  console.log(`[USER-DETAIL-PAGE] WorkspacesTab count=${memberships.length}`)
  if (memberships.length === 0) {
    return (
      <Card className="border-brand-rule bg-brand-card">
        <Empty>
          <EmptyMedia>
            <Building2 className="size-5" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>No workspace memberships</EmptyTitle>
            <EmptyDescription>
              This user is not a member of any workspace.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </Card>
    )
  }
  return (
    <Card className="border-brand-rule bg-brand-card overflow-hidden">
      <ul className="divide-y divide-brand-rule">
        {memberships.map((m) => (
          <li
            key={m.organizationId}
            className="flex items-center gap-3 p-4 text-sm"
          >
            <Building2 className="size-4 text-brand-muted-soft shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/workspaces/${m.organizationId}`}
                  className="font-medium text-brand-ink hover:underline truncate"
                >
                  {m.organizationName}
                </Link>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] uppercase tracking-[0.04em]"
                >
                  {m.role}
                </Badge>
              </div>
              <div className="mt-0.5 text-[11px] text-brand-muted-soft font-mono">
                /{m.organizationSlug} · joined{" "}
                {new Date(m.createdAt).toLocaleDateString()}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

// ─── Dialogs (inline, page-scoped) ─────────────────────────────────────────

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
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
              Reason
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
              Ban duration (days)
            </Label>
            <Input
              type="number"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              min={1}
            />
          </div>
        </div>
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
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
              Reason
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
              Duration (days, blank = indefinite)
            </Label>
            <Input
              type="number"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              min={1}
              placeholder="7"
            />
          </div>
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
        <div className="space-y-1.5 py-2">
          <Label className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
            New password (min 8 chars)
          </Label>
          <Input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={pending || password.length < 8}
          >
            {pending ? <Spinner className="mr-2 size-4" /> : null}
            Reset password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
            Type <code className="font-mono">DELETE</code> to confirm.
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
            {pending ? <Spinner className="mr-2 size-4" /> : <Trash2 className="mr-2 size-4" />}
            Delete forever
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
