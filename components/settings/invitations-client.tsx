"use client"

/**
 * /settings/team/invitations — dedicated invitations management page.
 *
 * Split out of /settings/team so the member table can stay wide and the
 * invitation lifecycle (pending / accepted / rejected / canceled / all)
 * has room for per-status actions and counts.
 *
 * Shadcn: Breadcrumb, Button, Card, Input, Select, Table, Tabs, Badge,
 * Spinner, Alert, Tooltip, DropdownMenu, Dialog, Field, Textarea, Separator.
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import { authClient } from "@/lib/auth-client"
import { resendInvitationAction } from "@/app/actions/invitation"
import { ROLE_CATALOG, type RoleId } from "@/lib/auth-roles"
import { TeamSubNav } from "@/components/settings/team-subnav"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Check,
  Clock,
  Inbox,
  Loader2,
  Mail,
  MoreHorizontal,
  RefreshCcw,
  Send,
  UserPlus,
  X,
} from "lucide-react"

type Status = "pending" | "accepted" | "rejected" | "canceled" | "all"

type Invitation = {
  id: string
  email: string
  role: string | null
  status: string
  expiresAt: string
  createdAt: string
  inviterEmail: string | null
}

type Role = Exclude<RoleId, "owner">

const ROLES = ROLE_CATALOG.filter((r) => r.id !== "owner").map((r) => ({
  value: r.id as string,
  label: r.label,
  description: r.description,
}))

const STATUS_TONE: Record<string, string> = {
  pending:
    "border-amber-300 bg-amber-50 text-amber-900 font-mono text-[10px] uppercase tracking-[0.04em]",
  accepted:
    "border-emerald-300 bg-emerald-50 text-emerald-900 font-mono text-[10px] uppercase tracking-[0.04em]",
  rejected:
    "border-red-300 bg-red-50 text-red-900 font-mono text-[10px] uppercase tracking-[0.04em]",
  canceled:
    "border-zinc-300 bg-zinc-50 text-zinc-700 font-mono text-[10px] uppercase tracking-[0.04em]",
}

function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000))
}

export function InvitationsClient() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState<Status>("pending")
  const [search, setSearch] = useState("")
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<Role>("member")
  const [inviterRole, setInviterRole] = useState<string>("member")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await authClient.getSession()
      if (cancelled) return
      if (!data?.user) {
        router.replace("/login")
        return
      }
      const { data: me } = await authClient.organization.getActiveMember()
      if (cancelled) return
      setInviterRole((me as { role?: string } | null)?.role ?? "member")
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  const canInvite = inviterRole === "owner" || inviterRole === "admin"

  // Counts per status (one unfiltered fetch, client-side split)
  const allQuery = useQuery({
    queryKey: ["workspace-invitations", "all"],
    queryFn: async () => {
      const r = await fetch("/api/settings/workspace-invitations?status=all", {
        cache: "no-store",
      })
      if (!r.ok) {
        const e = await r.json().catch(() => ({}))
        throw new Error(e.error || `Failed (${r.status})`)
      }
      return (await r.json()) as Invitation[]
    },
    enabled: ready,
  })

  const all = allQuery.data ?? []
  const counts = {
    pending: all.filter((i) => i.status === "pending").length,
    accepted: all.filter((i) => i.status === "accepted").length,
    rejected: all.filter((i) => i.status === "rejected").length,
    canceled: all.filter((i) => i.status === "canceled").length,
    all: all.length,
  }

  const rows = all
    .filter((i) => (status === "all" ? true : i.status === status))
    .filter((i) =>
      search ? i.email.toLowerCase().includes(search.toLowerCase()) : true,
    )
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))

  const expiringSoon = all.filter(
    (i) => i.status === "pending" && daysLeft(i.expiresAt) <= 3,
  ).length

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["workspace-invitations"] })

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.organization.inviteMember({
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      })
      if (error) throw new Error(error.message || "Failed to send invite")
    },
    onSuccess: () => {
      toast.success(`Invitation sent to ${inviteEmail}`)
      setInviteEmail("")
      setInviteRole("member")
      setInviteOpen(false)
      refresh()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const resendMutation = useMutation({
    mutationFn: async (id: string) => resendInvitationAction({ invitationId: id }),
    onSuccess: () => {
      toast.success("Invitation re-sent")
      refresh()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await authClient.organization.cancelInvitation({
        invitationId: id,
      })
      if (error) throw new Error(error.message || "Failed to cancel")
    },
    onSuccess: () => {
      toast.success("Invitation canceled")
      refresh()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!ready) {
    return (
      <div className="p-4 lg:p-8 max-w-6xl mx-auto">
        <Spinner className="size-5 text-brand-muted-soft" />
      </div>
    )
  }

  return (
    <TooltipProvider delay={200}>
      <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
        {/* Subnav bridging Team, Invites, and Roles */}
        <TeamSubNav activeTab="invitations" />

        {/* ─── Header ─── */}
        <div>
          <Link
            href="/settings/team"
            className="inline-flex items-center gap-1.5 text-xs text-brand-muted-soft hover:text-brand-ink transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Team
          </Link>
          <div className="mt-2 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
                Invitations
              </h1>
              <p className="mt-1 text-sm text-brand-muted-soft">
                Every invite sent to this workspace, and where it stands.
              </p>
            </div>
            {canInvite && (
              <Button
                onClick={() => setInviteOpen(true)}
                className="bg-brand-ink hover:bg-brand-ink-soft text-brand-cream"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite member
              </Button>
            )}
          </div>
        </div>

        {/* ─── Expiring alert ─── */}
        {expiringSoon > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {expiringSoon} pending invitation{expiringSoon === 1 ? "" : "s"}{" "}
              expiring within 3 days.{" "}
              <Button
                variant="link"
                className="h-auto p-0 text-brand-accent"
                onClick={() => {
                  all
                    .filter(
                      (i) => i.status === "pending" && daysLeft(i.expiresAt) <= 3,
                    )
                    .forEach((i) => resendMutation.mutate(i.id))
                }}
              >
                Re-send all
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* ─── Toolbar + Table ─── */}
        <Card className="border-brand-rule bg-brand-card overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 border-b border-brand-rule">
            <Tabs value={status} onValueChange={(v) => setStatus(v as Status)}>
              <TabsList className="h-9">
                <TabsTrigger value="pending" className="text-xs">
                  Pending {counts.pending > 0 && `· ${counts.pending}`}
                </TabsTrigger>
                <TabsTrigger value="accepted" className="text-xs">
                  Accepted {counts.accepted > 0 && `· ${counts.accepted}`}
                </TabsTrigger>
                <TabsTrigger value="rejected" className="text-xs">
                  Rejected {counts.rejected > 0 && `· ${counts.rejected}`}
                </TabsTrigger>
                <TabsTrigger value="canceled" className="text-xs">
                  Canceled {counts.canceled > 0 && `· ${counts.canceled}`}
                </TabsTrigger>
                <TabsTrigger value="all" className="text-xs">
                  All · {counts.all}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative md:w-72">
              <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-brand-muted-soft" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email…"
                className="h-9 pl-8 text-xs"
              />
            </div>
          </div>

          {allQuery.isLoading ? (
            <div className="p-12 flex justify-center text-brand-muted-soft">
              <Spinner className="size-5" />
            </div>
          ) : allQuery.isError ? (
            <div className="p-12 text-center text-brand-accent">
              <p className="text-sm">
                {(allQuery.error as Error).message}
              </p>
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center">
              <Inbox className="size-8 mx-auto text-brand-muted-soft" />
              <p className="mt-3 text-sm text-brand-ink">
                {search
                  ? `No invitations match "${search}".`
                  : status === "pending"
                    ? "No pending invitations."
                    : `No ${status} invitations.`}
              </p>
              <p className="mt-1 text-xs text-brand-muted-soft">
                {canInvite && status === "pending"
                  ? "Invite a teammate above to get started."
                  : "Switch tabs to see other statuses."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-brand-cream-soft/50 hover:bg-brand-cream-soft/50">
                  <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                    Email
                  </TableHead>
                  <TableHead className="w-[160px] font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                    Role
                  </TableHead>
                  <TableHead className="w-[150px] font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                    Status
                  </TableHead>
                  <TableHead className="w-[200px] font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                    Invited
                  </TableHead>
                  <TableHead className="w-[160px] font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                    Expires
                  </TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((inv) => {
                  const left = daysLeft(inv.expiresAt)
                  const expired = inv.status === "pending" && left === 0
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="py-3">
                        <span className="text-sm font-medium text-brand-ink">
                          {inv.email}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant="secondary" className="h-6 text-[11px]">
                          {ROLES.find((r) => r.value === inv.role)?.label ??
                            inv.role ??
                            "member"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge
                          variant="outline"
                          className={
                            expired
                              ? "border-zinc-300 bg-zinc-50 text-zinc-700 font-mono text-[10px] uppercase tracking-[0.04em]"
                              : (STATUS_TONE[inv.status] ??
                                "border-zinc-300 bg-zinc-50 text-zinc-700 font-mono text-[10px] uppercase tracking-[0.04em]")
                          }
                        >
                          {expired ? (
                            <>
                              <Clock className="size-3 mr-1" />
                              Expired
                            </>
                          ) : inv.status === "pending" ? (
                            <>
                              <Clock className="size-3 mr-1" />
                              Pending
                            </>
                          ) : inv.status === "accepted" ? (
                            <>
                              <Check className="size-3 mr-1" />
                              Accepted
                            </>
                          ) : inv.status === "rejected" ? (
                            <>
                              <Ban className="size-3 mr-1" />
                              Rejected
                            </>
                          ) : (
                            <>
                              <X className="size-3 mr-1" />
                              Canceled
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 text-xs text-brand-muted-soft">
                        {formatDistanceToNow(new Date(inv.createdAt), {
                          addSuffix: true,
                        })}
                        {inv.inviterEmail && (
                          <span className="block text-[11px]">
                            by {inv.inviterEmail}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-xs text-brand-muted-soft">
                        {inv.status === "pending" ? (
                          left > 0 ? (
                            <span className="text-amber-700">
                              in {left} day{left === 1 ? "" : "s"}
                            </span>
                          ) : (
                            <span className="text-zinc-500">expired</span>
                          )
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        {inv.status === "pending" && !expired ? (
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-[11px] text-brand-ink/70 hover:text-brand-ink"
                                    onClick={() =>
                                      resendMutation.mutate(inv.id)
                                    }
                                  />
                                }
                              >
                                <RefreshCcw className="mr-1 h-3 w-3" />
                                Re-send
                              </TooltipTrigger>
                              <TooltipContent>
                                Send the invitation email again
                              </TooltipContent>
                            </Tooltip>
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7"
                                    aria-label="Invitation actions"
                                  />
                                }
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    resendMutation.mutate(inv.id)
                                  }
                                >
                                  <RefreshCcw className="mr-2 h-3.5 w-3.5" />
                                  Re-send invitation
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-700"
                                  onClick={() => cancelMutation.mutate(inv.id)}
                                >
                                  <X className="mr-2 h-3.5 w-3.5" />
                                  Cancel invitation
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ) : (
                          <span className="text-xs text-brand-muted-soft">
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* ─── Footer ─── */}
        <div className="flex items-center justify-between text-xs text-brand-muted-soft">
          <Link
            href="/settings/team"
            className="inline-flex items-center gap-1.5 hover:text-brand-ink transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to members
          </Link>
          <div className="flex items-center gap-3">
            <span>{counts.pending} pending</span>
            <Separator orientation="vertical" className="h-3" />
            <span>{counts.all} total</span>
          </div>
        </div>

        {/* ─── Invite dialog ─── */}
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a teammate</DialogTitle>
              <DialogDescription>
                They&apos;ll get an email with a sign-up link valid for 7 days.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@company.com"
                />
              </Field>
              <Field>
                <FieldLabel>Role</FieldLabel>
                <Select
                  value={inviteRole}
                  onValueChange={(v) => setInviteRole(v as Role)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        <div>
                          <div>{r.label}</div>
                          <div className="text-xs text-brand-muted-soft">
                            {r.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  The role determines what this person can see and do.
                </FieldDescription>
              </Field>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => inviteMutation.mutate()}
                disabled={
                  !inviteEmail.includes("@") || inviteMutation.isPending
                }
                className="bg-brand-ink hover:bg-brand-ink-soft text-brand-cream"
              >
                {inviteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send invite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}