"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import {
  Search,
  MoreHorizontal,
  Eye,
  ShieldOff,
  ShieldCheck,
  Pause,
  PlayCircle,
  Trash2,
  UserCog,
  UserPlus,
  KeyRound,
  MailCheck,
  Filter,
  ExternalLink,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useWorkspaceDate } from "@/lib/timezone"
// Note: the user detail UI now lives at /admin/users/[id] (a dedicated
// full page) rather than a Sheet drawer. The "View details" item in
// the row dropdown navigates to that page.
import { ChangeRoleSheet } from "@/components/admin/change-role-sheet"

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
  suspendedBy?: string | null
  appealStatus?: string | null
  appealSubmittedAt?: Date | string | null
  createdAt: Date | string
}

const STATUSES = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "banned", label: "Banned" },
  { value: "suspended", label: "Suspended" },
] as const
type StatusFilter = (typeof STATUSES)[number]["value"]

const ROLES = [
  { value: "user", label: "user — standard" },
  { value: "admin", label: "admin — superadmin" },
] as const
type AdminRole = "user" | "admin"

export function UsersTable() {
  const { formatDate } = useWorkspaceDate()
  const queryClient = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all")
  const [page, setPage] = React.useState(0)
  const pageSize = 25

  const [activeUser, setActiveUser] = React.useState<EnrichedUser | null>(null)
  const [changeRoleOpen, setChangeRoleOpen] = React.useState(false)
  const [banOpen, setBanOpen] = React.useState(false)
  const [unbanOpen, setUnbanOpen] = React.useState(false)
  const [suspendOpen, setSuspendOpen] = React.useState(false)
  const [liftOpen, setLiftOpen] = React.useState(false)
  const [removeOpen, setRemoveOpen] = React.useState(false)
  const [impersonateOpen, setImpersonateOpen] = React.useState(false)
  const [resetPwdOpen, setResetPwdOpen] = React.useState(false)
  const [verifyOpen, setVerifyOpen] = React.useState(false)

  const closeAll = () => setActiveUser(null)
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-users"] })

  // [ADMIN-USERS] Fetch enriched users via our /api/admin/users endpoint
  const usersQuery = useQuery({
    queryKey: ["admin-users", search, statusFilter, page],
    queryFn: async () => {
      console.log("[ADMIN-USERS] fetch", { search, statusFilter, page })
      const params = new URLSearchParams({
        status: statusFilter,
        limit: String(pageSize),
        offset: String(page * pageSize),
      })
      if (search.trim()) params.set("search", search.trim())
      const r = await fetch(`/api/admin/users?${params}`)
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.error || "Failed to load users")
      }
      return r.json() as Promise<{ users: EnrichedUser[]; total: number }>
    },
    staleTime: 30 * 1000,
  })

  const users = usersQuery.data?.users ?? []
  const total = usersQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <>
      {/* ─── Toolbar ─── */}
      <Card className="border-brand-rule bg-brand-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-brand-muted-soft" />
            <Input
              placeholder="Search by email or name…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
              className="h-9 pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v: string | null) => {
              if (v) {
                setStatusFilter(v as StatusFilter)
                setPage(0)
              }
            }}
          >
            <SelectTrigger className="h-9 w-35">
              <Filter className="size-3.5 mr-1.5 text-brand-muted-soft" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {usersQuery.isFetching && (
            <div className="flex items-center gap-1.5 text-xs text-brand-muted-soft">
              <Spinner className="size-3" />
              Refreshing…
            </div>
          )}
          <div className="ml-auto text-xs text-brand-muted-soft">
            {total.toLocaleString()} {total === 1 ? "user" : "users"} total
          </div>
        </div>
      </Card>

      {/* ─── Table ─── */}
      <Card className="border-brand-rule bg-brand-card overflow-hidden">
        {usersQuery.isLoading ? (
          <div className="p-12 flex justify-center text-brand-muted-soft">
            <Spinner className="size-5" />
          </div>
        ) : usersQuery.isError ? (
          <div className="p-12 text-center text-brand-accent">
            <p className="text-sm">{(usersQuery.error as Error).message}</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-sm text-brand-muted-soft">
            No users match your filters.
          </div>
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
                  Status
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  Joined
                </TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const initials =
                  (u.name || u.email)
                    .split(/[\s@]/g)
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "?"
                const isSuspended =
                  u.suspendedAt &&
                  (!u.suspendedUntil ||
                    new Date(u.suspendedUntil).getTime() > Date.now())
                const status: "active" | "banned" | "suspended" = u.banned
                  ? "banned"
                  : isSuspended
                    ? "suspended"
                    : "active"
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9 rounded-full">
                          <AvatarImage src={u.image ?? undefined} alt={u.name} />
                          <AvatarFallback className="bg-brand-accent text-brand-cream text-xs font-semibold rounded-full">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-brand-ink truncate">
                            {u.name || "—"}
                          </p>
                          <p className="text-xs text-brand-muted-soft truncate">
                            {u.email}
                            {!u.emailVerified && (
                              <span className="ml-2 inline-flex items-center gap-1 rounded bg-brand-cream-soft px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.04em] text-brand-muted-soft">
                                unverified
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={u.role === "admin" ? "default" : "outline"}
                        className="font-mono text-[10px] uppercase tracking-[0.04em]"
                      >
                        {u.role ?? "user"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {status === "banned" ? (
                        <Badge
                          variant="outline"
                          className="border-red-300 bg-red-50 text-red-900 font-mono text-[10px] uppercase tracking-[0.04em]"
                        >
                          <ShieldOff className="size-3 mr-1" />
                          Banned
                        </Badge>
                      ) : status === "suspended" ? (
                        <Badge
                          variant="outline"
                          className="border-amber-300 bg-amber-50 text-amber-900 font-mono text-[10px] uppercase tracking-[0.04em]"
                        >
                          <Pause className="size-3 mr-1" />
                          Suspended
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-emerald-300 bg-emerald-50 text-emerald-900 font-mono text-[10px] uppercase tracking-[0.04em]"
                        >
                          <ShieldCheck className="size-3 mr-1" />
                          Active
                        </Badge>
                      )}
                      {u.appealStatus === "open" && (
                        <Badge
                          variant="outline"
                          className="ml-1 border-blue-300 bg-blue-50 text-blue-900 font-mono text-[9px] uppercase tracking-[0.04em]"
                        >
                          appeal open
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-brand-muted-soft">
                      {formatDate(new Date(u.createdAt))}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-brand-muted-soft hover:text-brand-ink"
                              aria-label="User actions"
                            />
                          }
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-60 border-brand-rule bg-brand-card"
                        >
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                              {u.email}
                            </DropdownMenuLabel>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator className="bg-brand-rule" />

                          <DropdownMenuItem
                            render={
                              <Link
                                href={`/admin/users/${u.id}`}
                                className="flex items-center"
                              />
                            }
                            className="rounded-md cursor-pointer"
                          >
                            <Eye className="mr-2 size-4 text-brand-muted-soft" />
                            View details
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => {
                              setActiveUser(u)
                              setImpersonateOpen(true)
                            }}
                            className="rounded-md cursor-pointer"
                            disabled={status !== "active"}
                          >
                            <ExternalLink className="mr-2 size-4 text-brand-muted-soft" />
                            Impersonate
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => {
                              setActiveUser(u)
                              setChangeRoleOpen(true)
                            }}
                            className="rounded-md cursor-pointer"
                          >
                            <UserCog className="mr-2 size-4 text-brand-muted-soft" />
                            Change role
                          </DropdownMenuItem>

                          {!u.emailVerified && (
                            <DropdownMenuItem
                              onClick={() => {
                                setActiveUser(u)
                                setVerifyOpen(true)
                              }}
                              className="rounded-md cursor-pointer"
                            >
                              <MailCheck className="mr-2 size-4 text-emerald-700" />
                              Force-verify email
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            onClick={() => {
                              setActiveUser(u)
                              setResetPwdOpen(true)
                            }}
                            className="rounded-md cursor-pointer"
                          >
                            <KeyRound className="mr-2 size-4 text-brand-muted-soft" />
                            Reset password
                          </DropdownMenuItem>

                          <DropdownMenuSeparator className="bg-brand-rule" />

                          {status === "suspended" ? (
                            <DropdownMenuItem
                              onClick={() => {
                                setActiveUser(u)
                                setLiftOpen(true)
                              }}
                              className="rounded-md cursor-pointer text-emerald-900 focus:text-emerald-950"
                            >
                              <PlayCircle className="mr-2 size-4" />
                              Lift suspension
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => {
                                setActiveUser(u)
                                setSuspendOpen(true)
                              }}
                              className="rounded-md cursor-pointer"
                              disabled={status === "banned"}
                            >
                              <Pause className="mr-2 size-4 text-amber-700" />
                              Suspend
                            </DropdownMenuItem>
                          )}

                          {status === "banned" ? (
                            <DropdownMenuItem
                              onClick={() => {
                                setActiveUser(u)
                                setUnbanOpen(true)
                              }}
                              className="rounded-md cursor-pointer text-emerald-900 focus:text-emerald-950"
                            >
                              <ShieldCheck className="mr-2 size-4" />
                              Unban
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => {
                                setActiveUser(u)
                                setBanOpen(true)
                              }}
                              className="rounded-md cursor-pointer"
                            >
                              <ShieldOff className="mr-2 size-4 text-red-700" />
                              Ban
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator className="bg-brand-rule" />

                          <DropdownMenuItem
                            onClick={() => {
                              setActiveUser(u)
                              setRemoveOpen(true)
                            }}
                            className="rounded-md cursor-pointer text-brand-accent focus:text-brand-accent"
                          >
                            <Trash2 className="mr-2 size-4" />
                            Remove user
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* ─── Pagination ─── */}
      {total > pageSize && (
        <div className="flex items-center justify-between text-xs text-brand-muted-soft">
          <p>
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || usersQuery.isFetching}
              className="h-8 px-3 border-brand-rule"
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || usersQuery.isFetching}
              className="h-8 px-3 border-brand-rule"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ─── Dialogs ─── */}
      <BanUserDialog
        user={activeUser}
        open={banOpen}
        onOpenChange={(o) => {
          setBanOpen(o)
          if (!o) closeAll()
        }}
        onSuccess={refresh}
      />
      <UnbanUserDialog
        user={activeUser}
        open={unbanOpen}
        onOpenChange={(o) => {
          setUnbanOpen(o)
          if (!o) closeAll()
        }}
        onSuccess={refresh}
      />
      <SuspendUserDialog
        user={activeUser}
        open={suspendOpen}
        onOpenChange={(o) => {
          setSuspendOpen(o)
          if (!o) closeAll()
        }}
        onSuccess={refresh}
      />
      <LiftSuspensionDialog
        user={activeUser}
        open={liftOpen}
        onOpenChange={(o) => {
          setLiftOpen(o)
          if (!o) closeAll()
        }}
        onSuccess={refresh}
      />
      <ChangeRoleSheet
        userId={activeUser?.id ?? null}
        open={changeRoleOpen}
        onOpenChange={(o) => {
          setChangeRoleOpen(o)
          if (!o) closeAll()
        }}
        onMutated={refresh}
      />
      <RemoveUserDialog
        user={activeUser}
        open={removeOpen}
        onOpenChange={(o) => {
          setRemoveOpen(o)
          if (!o) closeAll()
        }}
        onSuccess={refresh}
      />
      <ImpersonateDialog
        user={activeUser}
        open={impersonateOpen}
        onOpenChange={(o) => {
          setImpersonateOpen(o)
          if (!o) closeAll()
        }}
      />
      <ResetPasswordDialog
        user={activeUser}
        open={resetPwdOpen}
        onOpenChange={(o) => {
          setResetPwdOpen(o)
          if (!o) closeAll()
        }}
      />
      <VerifyEmailDialog
        user={activeUser}
        open={verifyOpen}
        onOpenChange={(o) => {
          setVerifyOpen(o)
          if (!o) closeAll()
        }}
        onSuccess={refresh}
      />
    </>
  )
}

// ─── Generic admin-action mutator ──────────────────────────────
function useAdminAction() {
  return useMutation({
    mutationFn: async (input: {
      userId: string
      action: string
      payload?: any
    }) => {
      console.log("[ADMIN-USERS] action", input.action, "→", input.userId)
      const r = await fetch(`/api/admin/users/${input.userId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: input.action, ...input.payload }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.error || "Action failed")
      }
      return r.json()
    },
  })
}

/** Fire-and-forget audit-event write for client-driven Better Auth calls
 *  (ban / unban / impersonate / remove) that bypass /api/admin/users/[id]/action. */
async function recordAudit(
  userId: string,
  action: "user.ban" | "user.unban" | "user.impersonate" | "user.remove",
  metadata?: Record<string, unknown>
) {
  try {
    await fetch(`/api/admin/users/${userId}/audit-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, metadata }),
    })
  } catch (err) {
    console.warn("[ADMIN-USERS] audit-event write failed (non-fatal):", err)
  }
}

// ─── BanUserDialog ──────────────────────────────────────────────
function BanUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: {
  user: EnrichedUser | null
  open: boolean
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const [reason, setReason] = React.useState("")
  const [durationDays, setDurationDays] = React.useState<string>("30")
  const [pending, setPending] = React.useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ban this user?</DialogTitle>
          <DialogDescription>
            <strong className="text-brand-ink">Permanent action.</strong>{" "}
            {user?.email} will be signed out immediately and blocked from
            signing back in. They will not see an appeal screen — this is the
            final state. Use suspend if the user should be able to appeal.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ban-reason">Reason</Label>
            <Input
              id="ban-reason"
              placeholder="Policy violation, abuse, chargeback…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ban-duration">Duration</Label>
            <Select
              value={durationDays}
              onValueChange={(v: string | null) => v && setDurationDays(v)}
            >
              <SelectTrigger id="ban-duration" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days (default)</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
                <SelectItem value="permanent">Permanent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              const days = durationDays === "permanent" ? undefined : Number(durationDays)
              setPending(true)
              console.log(`[USERS-TABLE] ban ${user!.id} days=${days ?? "permanent"}`)
              try {
                const r = await authClient.admin.banUser({
                  userId: user!.id,
                  banReason: reason.trim() || undefined,
                  banExpiresIn: days ? days * 24 * 60 * 60 : undefined,
                })
                if (r.error) throw new Error(r.error.message || "Ban failed")
                await recordAudit(user!.id, "user.ban", {
                  reason: reason.trim(),
                  durationDays: days ?? null,
                })
                console.log(`[USERS-TABLE] ✅ banned ${user!.id}`)
                toast.success(`${user?.email} banned`)
                onSuccess()
                onOpenChange(false)
                setReason("")
              } catch (e) {
                console.error(`[USERS-TABLE] ban failed:`, e)
                toast.error(e instanceof Error ? e.message : "Ban failed")
              } finally {
                setPending(false)
              }
            }}
            disabled={pending}
            className="bg-red-700 text-white hover:bg-red-800"
          >
            {pending ? (
              <>
                <Spinner className="mr-2 size-4" />
                Banning…
              </>
            ) : (
              "Ban user"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── UnbanUserDialog ───────────────────────────────────────────
function UnbanUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: {
  user: EnrichedUser | null
  open: boolean
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const mutation = useMutation({
    mutationFn: async () => {
      const r = await authClient.admin.unbanUser({ userId: user!.id })
      if (r.error) throw new Error(r.error.message || "Unban failed")
      return user!.id
    },
    onSuccess: async () => {
      await recordAudit(user!.id, "user.unban")
      toast.success(`${user?.email} unbanned`)
      onSuccess()
      onOpenChange(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unban {user?.email}?</AlertDialogTitle>
          <AlertDialogDescription>
            They will be able to sign in again immediately. Existing sessions
            are restored — if you want to invalidate them, sign them out from
            Sessions first.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-emerald-700 text-white hover:bg-emerald-800"
          >
            {mutation.isPending ? (
              <>
                <Spinner className="mr-2 size-4" />
                Unbanning…
              </>
            ) : (
              "Unban"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─── SuspendUserDialog ─────────────────────────────────────────
function SuspendUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: {
  user: EnrichedUser | null
  open: boolean
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const [reason, setReason] = React.useState("")
  const [durationDays, setDurationDays] = React.useState<string>("7")
  const mutation = useAdminAction()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Suspend {user?.email}?</DialogTitle>
          <DialogDescription>
            Suspended users can see an appeal screen and submit a request to
            be reinstated. They are signed out immediately. Use this instead
            of ban when the situation is recoverable.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="suspend-reason">Reason (shown to the user)</Label>
            <Textarea
              id="suspend-reason"
              placeholder="What happened? Be specific so the user can address it."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="suspend-duration">Duration</Label>
            <Select
              value={durationDays}
              onValueChange={(v: string | null) => v && setDurationDays(v)}
            >
              <SelectTrigger id="suspend-duration" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="7">7 days (default)</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="indefinite">Until lifted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              const days =
                durationDays === "indefinite" ? null : Number(durationDays)
              await mutation.mutateAsync({
                userId: user!.id,
                action: "suspend",
                payload: {
                  reason: reason.trim(),
                  durationDays: days,
                },
              })
              toast.success(`${user?.email} suspended`)
              onSuccess()
              onOpenChange(false)
              setReason("")
            }}
            disabled={mutation.isPending || reason.trim().length < 5}
            className="bg-amber-700 text-white hover:bg-amber-800"
          >
            {mutation.isPending ? (
              <>
                <Spinner className="mr-2 size-4" />
                Suspending…
              </>
            ) : (
              "Suspend"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── LiftSuspensionDialog ──────────────────────────────────────
function LiftSuspensionDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: {
  user: EnrichedUser | null
  open: boolean
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const [note, setNote] = React.useState("")
  const mutation = useAdminAction()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Lift suspension for {user?.email}?</AlertDialogTitle>
          <AlertDialogDescription>
            The user will be able to sign in again. Their original reason was:{" "}
            <em className="text-brand-ink not-italic">
              {user?.suspendedReason ?? "(none recorded)"}
            </em>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1.5 py-2">
          <Label htmlFor="lift-note">Internal note (optional)</Label>
          <Textarea
            id="lift-note"
            placeholder="Why are you lifting? Recorded for the audit trail."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="resize-none"
            maxLength={500}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              await mutation.mutateAsync({
                userId: user!.id,
                action: "lift-suspension",
                payload: { note: note.trim() || undefined },
              })
              toast.success(`Suspension lifted for ${user?.email}`)
              onSuccess()
              onOpenChange(false)
              setNote("")
            }}
            disabled={mutation.isPending}
            className="bg-emerald-700 text-white hover:bg-emerald-800"
          >
            {mutation.isPending ? (
              <>
                <Spinner className="mr-2 size-4" />
                Lifting…
              </>
            ) : (
              "Lift suspension"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─── SetRoleDialog ─────────────────────────────────────────────
function SetRoleDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: {
  user: EnrichedUser | null
  open: boolean
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const mutation = useAdminAction()
  const isCurrentlyAdmin = user?.role === "admin"
  const targetRole: AdminRole = isCurrentlyAdmin ? "user" : "admin"

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isCurrentlyAdmin
              ? `Demote ${user?.email} to user?`
              : `Promote ${user?.email} to admin?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isCurrentlyAdmin
              ? "They will lose access to the /admin console and any admin-only endpoints."
              : "They will gain access to the /admin console — list users, ban/suspend, impersonate, delete orgs, manage roles. Only do this for people you fully trust."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              await mutation.mutateAsync({
                userId: user!.id,
                action: "set-role",
                payload: { role: targetRole },
              })
              toast.success(
                `${user?.email} is now ${targetRole === "admin" ? "an admin" : "a user"}`
              )
              onSuccess()
              onOpenChange(false)
            }}
            disabled={mutation.isPending}
            className={
              isCurrentlyAdmin
                ? "bg-brand-ink text-brand-cream hover:bg-brand-ink-soft"
                : "bg-brand-accent text-white hover:bg-brand-accent/90"
            }
          >
            {mutation.isPending ? (
              <>
                <Spinner className="mr-2 size-4" />
                Saving…
              </>
            ) : isCurrentlyAdmin ? (
              "Demote to user"
            ) : (
              "Promote to admin"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─── RemoveUserDialog ──────────────────────────────────────────
function RemoveUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: {
  user: EnrichedUser | null
  open: boolean
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const removeMutation = useMutation({
    mutationFn: async () => {
      const r = await authClient.admin.removeUser({ userId: user!.id })
      if (r.error) throw new Error(r.error.message || "Remove failed")
      return user!.id
    },
    onSuccess: async () => {
      await recordAudit(user!.id, "user.remove")
      toast.success(`${user?.email} deleted`)
      onSuccess()
      onOpenChange(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {user?.email}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the user and every record that points at
            them (sessions, accounts, memberships, invitations). There is no
            undo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => removeMutation.mutate()}
            disabled={removeMutation.isPending}
            className="bg-brand-accent text-white hover:bg-brand-accent/90"
          >
            {removeMutation.isPending ? (
              <>
                <Spinner className="mr-2 size-4" />
                Deleting…
              </>
            ) : (
              "Delete forever"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─── ImpersonateDialog ─────────────────────────────────────────
function ImpersonateDialog({
  user,
  open,
  onOpenChange,
}: {
  user: EnrichedUser | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [confirmText, setConfirmText] = React.useState("")
  const mutation = useMutation({
    mutationFn: async () => {
      const r = await authClient.admin.impersonateUser({ userId: user!.id })
      if (r.error) throw new Error(r.error.message || "Impersonate failed")
      return user!.id
    },
    onSuccess: async () => {
      await recordAudit(user!.id, "user.impersonate")
      toast.success(`Now viewing as ${user?.email}`)
      onOpenChange(false)
      setConfirmText("")
      window.location.href = "/dashboard"
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Impersonate {user?.email}?</DialogTitle>
          <DialogDescription>
            You will see Muvx exactly as this user sees it. Every action you
            take while impersonating will appear in the audit log attributed
            to your admin account. The amber banner at the top tells you
            when impersonation is active.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          <Label htmlFor="impersonate-confirm">
            Type the email{" "}
            <span className="font-medium">{user?.email}</span> to confirm
          </Label>
          <Input
            id="impersonate-confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={user?.email ?? ""}
            className="h-10 font-mono text-sm"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={
              mutation.isPending ||
              confirmText.toLowerCase() !== (user?.email ?? "").toLowerCase()
            }
            className="bg-brand-ink text-brand-cream hover:bg-brand-ink-soft"
          >
            {mutation.isPending ? (
              <>
                <Spinner className="mr-2 size-4" />
                Starting…
              </>
            ) : (
              "Start impersonating"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── ResetPasswordDialog ───────────────────────────────────────
function ResetPasswordDialog({
  user,
  open,
  onOpenChange,
}: {
  user: EnrichedUser | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [password, setPassword] = React.useState("")
  const mutation = useAdminAction()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset password for {user?.email}</DialogTitle>
          <DialogDescription>
            Choose a temporary password and share it with the user through a
            secure channel. The user can change it after signing in.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="h-10 font-mono text-sm"
            minLength={8}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              await mutation.mutateAsync({
                userId: user!.id,
                action: "reset-password",
                payload: { newPassword: password },
              })
              toast.success("Password reset")
              onOpenChange(false)
              setPassword("")
            }}
            disabled={mutation.isPending || password.length < 8}
            className="bg-brand-ink text-brand-cream hover:bg-brand-ink-soft"
          >
            {mutation.isPending ? (
              <>
                <Spinner className="mr-2 size-4" />
                Resetting…
              </>
            ) : (
              "Reset password"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── VerifyEmailDialog ─────────────────────────────────────────
function VerifyEmailDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: {
  user: EnrichedUser | null
  open: boolean
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const mutation = useAdminAction()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Force-verify {user?.email}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Mark their email address as verified without them clicking a link.
            Use this when a verification email is missing or stuck.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              await mutation.mutateAsync({
                userId: user!.id,
                action: "force-verify-email",
              })
              toast.success("Email marked verified")
              onSuccess()
              onOpenChange(false)
            }}
            disabled={mutation.isPending}
            className="bg-emerald-700 text-white hover:bg-emerald-800"
          >
            {mutation.isPending ? (
              <>
                <Spinner className="mr-2 size-4" />
                Verifying…
              </>
            ) : (
              "Force-verify"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}