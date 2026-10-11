"use client"

/**
 * UserDetailSheet — the per-user admin drawer.
 *
 * Opens from the users table via the "View" menu item. Tabs:
 *   - Profile   — read-only summary + set-role / impersonate / ban
 *   - Sessions  — active sessions list, revoke one / revoke all
 *   - Activity  — the audit events where this user is the target
 *
 * Stays consistent with the existing brand: cream card, ink numerals,
 * serif headings, orange delta chips. Uses shadcn Tabs + Sheet + Badge.
 */
import * as React from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import {
  X,
  Monitor,
  Smartphone,
  Globe,
  Ban,
  ShieldCheck,
  ShieldOff,
  Pause,
  PlayCircle,
  KeyRound,
  MailCheck,
  UserCog,
  Copy,
  Activity,
  LogOut,
  type LucideIcon,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { UserActionsBar } from "./user-actions-bar"

type EnrichedUser = {
  id: string
  email: string
  name: string
  emailVerified: boolean
  image?: string | null
  role: string | null
  banned: boolean | null
  banReason?: string | null
  banExpires?: Date | string | null
  suspendedAt?: Date | string | null
  suspendedUntil?: Date | string | null
  suspendedReason?: string | null
  appealStatus?: string | null
  createdAt: Date | string
}

type SessionRow = {
  id: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  expiresAt: string
  isCurrent?: boolean
}

type AuditRow = {
  id: string
  action: string
  actorEmail: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

function initials(name: string, email: string) {
  return (
    (name || email)
      .split(/[\s@]/g)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  )
}

function formatUptime(seconds: number) {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

function deviceIcon(ua: string | null): LucideIcon {
  if (!ua) return Globe
  if (/Mobile|Android|iPhone|iPad/i.test(ua)) return Smartphone
  return Monitor
}

function deviceLabel(ua: string | null): string {
  if (!ua) return "Unknown device"
  if (/iPhone/.test(ua)) return "iPhone"
  if (/iPad/.test(ua)) return "iPad"
  if (/Android/.test(ua)) return "Android"
  if (/Mac OS X/.test(ua)) {
    if (/Chrome/.test(ua)) return "Chrome on macOS"
    if (/Safari/.test(ua)) return "Safari on macOS"
    if (/Firefox/.test(ua)) return "Firefox on macOS"
    return "macOS"
  }
  if (/Windows/.test(ua)) {
    if (/Chrome/.test(ua)) return "Chrome on Windows"
    if (/Firefox/.test(ua)) return "Firefox on Windows"
    return "Windows"
  }
  if (/Linux/.test(ua)) {
    if (/Chrome/.test(ua)) return "Chrome on Linux"
    if (/Firefox/.test(ua)) return "Firefox on Linux"
    return "Linux"
  }
  return "Unknown device"
}

export function UserDetailSheet({
  user,
  open,
  onOpenChange,
  onMutated,
}: {
  user: EnrichedUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onMutated: () => void
}) {
  if (!user) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl" />
      </Sheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-hidden border-brand-rule bg-brand-card p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b border-brand-rule px-6 py-4">
          <div className="flex items-start gap-3">
            <Avatar className="size-12 rounded-lg">
              <AvatarImage src={user.image ?? undefined} alt={user.name} />
              <AvatarFallback className="rounded-lg bg-brand-ink text-brand-cream text-sm font-semibold">
                {initials(user.name, user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate font-serif text-lg tracking-tight text-brand-ink">
                {user.name || user.email}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2">
                <span className="truncate font-mono text-[11px]">{user.email}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(user.id)
                    toast.success("User id copied")
                  }}
                  className="text-brand-muted-soft hover:text-brand-ink"
                  title="Copy user id"
                >
                  <Copy className="size-3" />
                </button>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="profile" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-6 mt-3 grid w-auto grid-cols-3 border-brand-rule bg-brand-cream-soft">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <TabsContent value="profile" className="mt-0 space-y-4">
              <ProfileTab user={user} onMutated={onMutated} />
            </TabsContent>
            <TabsContent value="sessions" className="mt-0">
              <SessionsTab user={user} />
            </TabsContent>
            <TabsContent value="activity" className="mt-0">
              <ActivityTab user={user} />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

function ProfileTab({
  user,
  onMutated,
}: {
  user: EnrichedUser
  onMutated: () => void
}) {
  const queryClient = useQueryClient()
  const [resetOpen, setResetOpen] = React.useState(false)
  const [newPassword, setNewPassword] = React.useState("")

  const isSuspended =
    !!user.suspendedAt &&
    (!user.suspendedUntil || new Date(user.suspendedUntil).getTime() > Date.now())
  const status: "active" | "banned" | "suspended" = user.banned
    ? "banned"
    : isSuspended
      ? "suspended"
      : "active"

  async function callAction(action: string, payload?: any) {
    const r = await fetch(`/api/admin/users/${user.id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    })
    if (!r.ok) {
      const body = await r.json().catch(() => ({}))
      throw new Error(body.error || "Action failed")
    }
    return r.json()
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Role" value={user.role ?? "user"} mono />
        <Stat label="Status" value={status} />
        <Stat
          label="Email verified"
          value={user.emailVerified ? "yes" : "no"}
        />
        <Stat
          label="Joined"
          value={new Date(user.createdAt).toLocaleDateString()}
        />
        {user.banned && user.banExpires && (
          <Stat
            label="Ban expires"
            value={new Date(user.banExpires).toLocaleDateString()}
            mono
          />
        )}
        {isSuspended && user.suspendedUntil && (
          <Stat
            label="Suspension ends"
            value={new Date(user.suspendedUntil).toLocaleDateString()}
            mono
          />
        )}
      </div>

      {user.suspendedReason && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.04em] text-amber-900">
              <Pause className="size-3.5" /> Suspension reason
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-950">{user.suspendedReason}</p>
          </CardContent>
        </Card>
      )}

      {user.banReason && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.04em] text-red-900">
              <Ban className="size-3.5" /> Ban reason
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-950">{user.banReason}</p>
          </CardContent>
        </Card>
      )}

      <Separator className="bg-brand-rule" />

      <div className="space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
          Quick actions
        </p>
        <div className="grid grid-cols-2 gap-2">
          {status === "banned" ? (
            <Button
              variant="outline"
              onClick={async () => {
                const r = await authClient.admin.unbanUser({ userId: user.id })
                if (r.error) {
                  toast.error(r.error.message ?? "Unban failed")
                  return
                }
                await fetch(`/api/admin/users/${user.id}/audit-event`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "user.unban" }),
                })
                toast.success("Unbanned")
                onMutated()
              }}
              className="h-9 border-emerald-300 text-emerald-900 hover:bg-emerald-50"
            >
              <ShieldCheck className="mr-2 size-3.5" />
              Unban
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={async () => {
                const r = await authClient.admin.banUser({
                  userId: user.id,
                  banReason: "Banned by admin from user detail sheet",
                })
                if (r.error) {
                  toast.error(r.error.message ?? "Ban failed")
                  return
                }
                await fetch(`/api/admin/users/${user.id}/audit-event`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "user.ban",
                    metadata: { reason: "Banned by admin from user detail sheet" },
                  }),
                })
                toast.success("Banned")
                onMutated()
              }}
              className="h-9 border-red-300 text-red-900 hover:bg-red-50"
            >
              <ShieldOff className="mr-2 size-3.5" />
              Ban
            </Button>
          )}

          {status === "suspended" ? (
            <Button
              variant="outline"
              onClick={async () => {
                await callAction("lift-suspension")
                toast.success("Suspension lifted")
                onMutated()
              }}
              className="h-9 border-emerald-300 text-emerald-900 hover:bg-emerald-50"
            >
              <PlayCircle className="mr-2 size-3.5" />
              Lift suspension
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={async () => {
                await callAction("suspend", {
                  reason: "Suspended by admin from user detail sheet",
                  durationDays: 7,
                })
                toast.success("Suspended")
                onMutated()
              }}
              className="h-9 border-amber-300 text-amber-900 hover:bg-amber-50"
              disabled={status === "banned"}
            >
              <Pause className="mr-2 size-3.5" />
              Suspend
            </Button>
          )}

          {user.role === "admin" ? (
            <Button
              variant="outline"
              onClick={async () => {
                await callAction("set-role", { role: "user" })
                toast.success("Demoted to user")
                onMutated()
              }}
              className="h-9"
            >
              <UserCog className="mr-2 size-3.5" />
              Demote to user
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={async () => {
                await callAction("set-role", { role: "admin" })
                toast.success("Promoted to admin")
                onMutated()
              }}
              className="h-9"
            >
              <UserCog className="mr-2 size-3.5" />
              Promote to admin
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => setResetOpen(true)}
            className="h-9"
          >
            <KeyRound className="mr-2 size-3.5" />
            Reset password
          </Button>

          {!user.emailVerified && (
            <Button
              variant="outline"
              onClick={async () => {
                await callAction("force-verify-email")
                toast.success("Email marked verified")
                onMutated()
              }}
              className="h-9"
            >
              <MailCheck className="mr-2 size-3.5" />
              Force-verify email
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset password</AlertDialogTitle>
            <AlertDialogDescription>
              Choose a temporary password for {user.email} and share it through
              a secure channel. The user can change it after signing in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="new-pw">New password</Label>
            <Input
              id="new-pw"
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="h-10 font-mono text-sm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await callAction("reset-password", { newPassword })
                toast.success("Password reset")
                setNewPassword("")
                setResetOpen(false)
              }}
              disabled={newPassword.length < 8}
              className="bg-brand-ink text-brand-cream hover:bg-brand-ink-hover"
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function Stat({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="rounded-lg border border-brand-rule bg-brand-cream p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 truncate text-sm",
          mono ? "font-mono" : "font-medium text-brand-ink"
        )}
      >
        {value}
      </p>
    </div>
  )
}

function SessionsTab({ user }: { user: EnrichedUser }) {
  const sessionsQuery = useQuery({
    queryKey: ["admin-user-sessions", user.id],
    queryFn: async () => {
      const r = await fetch(`/api/admin/users/${user.id}/sessions`)
      if (!r.ok) throw new Error("Failed to load sessions")
      return r.json() as Promise<{ sessions: SessionRow[] }>
    },
    enabled: !!user.id,
    staleTime: 15 * 1000,
  })

  const sessions = sessionsQuery.data?.sessions ?? []

  async function revokeOne(sessionId: string) {
    const r = await fetch(`/api/admin/users/${user.id}/sessions`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
    if (!r.ok) {
      toast.error("Revoke failed")
      return
    }
    toast.success("Session revoked")
    sessionsQuery.refetch()
  }

  async function revokeAll() {
    const r = await fetch(`/api/admin/users/${user.id}/sessions`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    })
    if (!r.ok) {
      toast.error("Revoke all failed")
      return
    }
    toast.success("All sessions revoked")
    sessionsQuery.refetch()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
            Active sessions
          </p>
          <p className="text-sm text-brand-ink">
            {sessions.length} {sessions.length === 1 ? "device" : "devices"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={revokeAll}
          disabled={sessions.length === 0}
          className="h-8 border-red-200 text-red-900 hover:bg-red-50"
        >
          <LogOut className="mr-1.5 size-3" />
          Revoke all
        </Button>
      </div>

      {sessionsQuery.isLoading ? (
        <div className="flex justify-center py-12 text-brand-muted-soft">
          <Spinner className="size-4" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-lg border border-brand-rule bg-brand-cream p-8 text-center text-sm text-brand-muted-soft">
          No active sessions.
        </div>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => {
            const Icon = deviceIcon(s.userAgent)
            return (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-lg border border-brand-rule bg-brand-card p-3"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-cream text-brand-ink">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-brand-ink">
                      {deviceLabel(s.userAgent)}
                    </p>
                    {s.isCurrent && (
                      <Badge
                        variant="outline"
                        className="border-emerald-300 bg-emerald-50 font-mono text-[9px] uppercase tracking-[0.04em] text-emerald-900"
                      >
                        this session
                      </Badge>
                    )}
                  </div>
                  <p className="font-mono text-[10px] text-brand-muted-soft">
                    {s.ipAddress ?? "—"} · created{" "}
                    {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => revokeOne(s.id)}
                  disabled={s.isCurrent}
                  className="size-8 text-brand-muted-soft hover:text-brand-accent"
                  title="Revoke"
                >
                  <X className="size-3.5" />
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ActivityTab({ user }: { user: EnrichedUser }) {
  const activityQuery = useQuery({
    queryKey: ["admin-user-activity", user.id],
    queryFn: async () => {
      const r = await fetch(`/api/admin/users/${user.id}/activity`)
      if (!r.ok) throw new Error("Failed to load activity")
      return r.json() as Promise<{ events: AuditRow[] }>
    },
    enabled: !!user.id,
    staleTime: 15 * 1000,
  })

  const events = activityQuery.data?.events ?? []

  return (
    <div className="space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
        Recent admin actions against this user
      </p>

      {activityQuery.isLoading ? (
        <div className="flex justify-center py-12 text-brand-muted-soft">
          <Spinner className="size-4" />
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-lg border border-brand-rule bg-brand-cream p-8 text-center text-sm text-brand-muted-soft">
          No activity recorded yet.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {events.map((e) => (
            <li
              key={e.id}
              className="flex items-start gap-3 rounded-lg border border-brand-rule bg-brand-card p-3"
            >
              <Activity className="mt-0.5 size-3.5 shrink-0 text-brand-muted-soft" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-brand-ink">
                  <span className="font-mono text-[11px] text-brand-muted-soft">
                    {e.action}
                  </span>{" "}
                  by {e.actorEmail}
                </p>
                <p className="font-mono text-[10px] text-brand-muted-soft">
                  {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}
                  {" · "}
                  {new Date(e.createdAt).toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/admin/audit"
        className="mt-3 inline-flex items-center gap-1 text-[12px] text-brand-muted-soft hover:text-brand-ink"
      >
        Open the full audit log →
      </Link>
    </div>
  )
}
