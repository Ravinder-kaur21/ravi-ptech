"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { authClient } from "@/lib/auth-client"
import { useAuthStore } from "@/lib/stores/auth-store"
import { removeMemberAction } from "@/app/actions/remove-member"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Loader2,
  Mail,
  Trash2,
  Send,
  ShieldOff,
  Users,
  Building2,
  LogOut,
  X,
  Plus,
  ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Role metadata (matches Better Auth org plugin roles in lib/auth-roles.ts) ──
const ROLES = [
  { value: "admin", label: "Admin", description: "Full access except billing" },
  { value: "operations_manager", label: "Ops Manager", description: "Loads, trips, fleet, drivers" },
  { value: "dispatcher", label: "Dispatcher", description: "Create / assign loads & trips" },
  { value: "accounting", label: "Accounting", description: "Invoices, payroll, reports" },
  { value: "driver", label: "Driver", description: "View assigned loads, upload POD" },
  { value: "safety", label: "Safety", description: "Driver records, compliance" },
] as const

const ROLE_VALUES = ROLES.map((r) => r.value)
type Role = (typeof ROLES)[number]["value"]

// Better Auth returns the active member via getActiveMember (and it's on
// session.user.role too). We treat owner / admin as full-access; everyone
// else gets read-only on this page.
type ViewerRole = "owner" | "admin" | Role | string

export function TeamSettingsClient() {
  return (
    <TeamSettingsGuard>
      <TeamSettingsInner />
    </TeamSettingsGuard>
  )
}

function TeamSettingsInner() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const reset = useAuthStore((s) => s.reset)
  const activeOrg = useAuthStore((s) => s.activeOrganization)

  // Deep log on mount (per memory rule).
  useEffect(() => {
    console.log("[TEAM] mounted — activeOrg:", activeOrg)
  }, [activeOrg])

  // ─── Active member (gives us the current viewer's role for gating) ──
  const { data: activeMember } = useQuery({
    queryKey: ["active-member"],
    queryFn: async () => {
      console.log("[TEAM] getActiveMember…")
      const { data, error } = await authClient.organization.getActiveMember()
      if (error) {
        console.error("[TEAM] getActiveMember error:", error)
        return null
      }
      console.log("[TEAM] activeMember:", data)
      return data
    },
  })

  // ─── Full org (members list) ──
  const membersQuery = useQuery({
    queryKey: ["org-members"],
    queryFn: async () => {
      console.log("[TEAM] getFullOrganization…")
      const { data, error } = await authClient.organization.getFullOrganization()
      if (error) {
        console.error("[TEAM] getFullOrganization error:", error)
        throw new Error(error.message || "Failed to load members")
      }
      console.log("[TEAM] fullOrg:", data)
      return data
    },
  })

  // ─── Pending invitations ──
  const invitesQuery = useQuery({
    queryKey: ["org-invitations"],
    queryFn: async () => {
      console.log("[TEAM] listInvitations…")
      const { data, error } =
        await authClient.organization.listInvitations()
      if (error) {
        console.error("[TEAM] listInvitations error:", error)
        throw new Error(error.message || "Failed to load invitations")
      }
      return Array.isArray(data) ? data : []
    },
  })

  const viewerRole: ViewerRole =
    (activeMember as any)?.role ?? activeOrg?.metadata?.role ?? "member"

  const isOwner = viewerRole === "owner"
  const canManage = isOwner || viewerRole === "admin"

  // ─── Invite dialog state ──
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<Role>("dispatcher")

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const email = inviteEmail.trim().toLowerCase()
      console.log(`[TEAM] inviteMember → ${email} as ${inviteRole}`)
      const { data, error } = await authClient.organization.inviteMember({
        email,
        role: inviteRole,
      })
      if (error) throw new Error(error.message || "Failed to send invite")
      return data
    },
    onSuccess: () => {
      toast.success(`Invitation sent to ${inviteEmail}`)
      setInviteEmail("")
      setInviteRole("dispatcher")
      setInviteOpen(false)
      queryClient.invalidateQueries({ queryKey: ["org-invitations"] })
    },
    onError: (err: Error) => {
      console.error("[TEAM] inviteMember failed:", err)
      toast.error(err.message)
    },
  })

  // ─── Cancel invitation ──
  const cancelInviteMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      console.log("[TEAM] cancelInvitation →", invitationId)
      const { error } = await authClient.organization.cancelInvitation({
        invitationId,
      })
      if (error) throw new Error(error.message || "Failed to cancel invite")
      return true
    },
    onSuccess: () => {
      toast.success("Invitation cancelled")
      queryClient.invalidateQueries({ queryKey: ["org-invitations"] })
    },
    onError: (err: Error) => {
      console.error("[TEAM] cancelInvitation failed:", err)
      toast.error(err.message)
    },
  })

  // ─── Remove member (cascade) ──
  // The server action cascadeRemoveMember() detaches the member's
  // driver rows in this workspace, kills their sessions in this
  // workspace, deletes the membership, and (if the user has no other
  // workspaces and is not a platform admin) hard-deletes the user.
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      console.log(`[TEAM] removeMember (cascade) → ${memberId}`)
      return await removeMemberAction({ memberId })
    },
    onSuccess: (result) => {
      console.log("[TEAM] removeMember cascade result:", result)
      const msg = result.userDeleted
        ? "Member removed and their account was permanently deleted (last workspace)"
        : "Member removed from this workspace"
      toast.success(msg, { duration: 5000 })
      queryClient.invalidateQueries({ queryKey: ["org-members"] })
      // If the user was hard-deleted, their row disappears from
      // many admin views too — invalidate everything.
      if (result.userDeleted) {
        queryClient.invalidateQueries({ queryKey: ["admin-users"] })
        queryClient.invalidateQueries({ queryKey: ["admin-stats"] })
      }
      router.refresh()
    },
    onError: (err: Error) => {
      console.error("[TEAM] removeMember failed:", err)
      toast.error(err.message)
    },
  })

  // ─── Update role ──
  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      console.log("[TEAM] updateMemberRole →", { memberId, role })
      const { error } = await authClient.organization.updateMemberRole({
        memberId,
        role,
      })
      if (error) throw new Error(error.message || "Failed to update role")
      return true
    },
    onSuccess: () => {
      toast.success("Role updated")
      queryClient.invalidateQueries({ queryKey: ["org-members"] })
    },
    onError: (err: Error) => {
      console.error("[TEAM] updateMemberRole failed:", err)
      toast.error(err.message)
    },
  })

  // ─── Leave workspace ──
  const [leaveOpen, setLeaveOpen] = useState(false)
  const leaveMutation = useMutation({
    mutationFn: async () => {
      if (!activeOrg?.id) throw new Error("No active workspace")
      console.log("[TEAM] leave →", activeOrg.id)
      const { error } = await authClient.organization.leave({
        organizationId: activeOrg.id,
      })
      if (error) throw new Error(error.message || "Failed to leave workspace")
      return true
    },
    onSuccess: async () => {
      toast.success("You left the workspace")
      setLeaveOpen(false)
      reset()
      queryClient.clear()
      router.push("/select-org")
    },
    onError: (err: Error) => {
      console.error("[TEAM] leaveOrganization failed:", err)
      toast.error(err.message)
    },
  })

  // ─── Delete workspace (owner only) ──
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState("")
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!activeOrg?.id) throw new Error("No active workspace")
      console.log("[TEAM] delete org →", activeOrg.id)
      const { error } = await authClient.organization.delete({
        organizationId: activeOrg.id,
      })
      if (error) throw new Error(error.message || "Failed to delete workspace")
      return true
    },
    onSuccess: async () => {
      toast.success("Workspace deleted")
      setDeleteOpen(false)
      reset()
      queryClient.clear()
      router.push("/onboarding")
    },
    onError: (err: Error) => {
      console.error("[TEAM] deleteOrganization failed:", err)
      toast.error(err.message)
    },
  })

  const fullOrg = membersQuery.data
  const members = (fullOrg as any)?.members ?? []
  const invitations = invitesQuery.data ?? []

  const myMemberId = (activeMember as any)?.id ?? null

  // ─── Render ──
  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
              <Users className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
              <span className="italic text-brand-accent">Team</span>
            </h1>
          </div>
          <p className="text-sm text-brand-ink/80 max-w-md">
            Invite dispatchers, drivers, and accountants to your workspace.
            {isOwner && " As owner, you can also delete this workspace."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="h-7 px-3 text-xs">
            <ShieldCheck className="h-3 w-3 mr-1" />
            {viewerRole}
          </Badge>
          {canManage && (
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger
                render={
                  <Button className="h-9 px-4 rounded-full bg-brand-ink hover:bg-brand-ink-soft text-brand-cream text-sm" />
                }
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Invite teammate
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Invite a teammate</DialogTitle>
                  <DialogDescription>
                    They&apos;ll receive an email with a link to join
                    {activeOrg?.name ? ` ${activeOrg.name}` : " your workspace"}.
                  </DialogDescription>
                </DialogHeader>
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (
                      inviteEmail &&
                      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)
                    ) {
                      inviteMutation.mutate()
                    } else {
                      toast.error("Enter a valid email address")
                    }
                  }}
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-email">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="teammate@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="h-10"
                      autoFocus
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-role">Role</Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(v) => setInviteRole(v as Role)}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            <div className="flex flex-col">
                              <span className="font-medium">{r.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {r.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setInviteOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-brand-ink hover:bg-brand-ink-soft text-brand-cream"
                      disabled={inviteMutation.isPending}
                    >
                      {inviteMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending…
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send invite
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* ─── Members ─── */}
      <Card className="border-brand-rule bg-brand-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-medium text-brand-ink">Members</h2>
            <p className="text-xs text-brand-muted-soft mt-0.5">
              {members.length} {members.length === 1 ? "member" : "members"}
            </p>
          </div>
        </div>

        {membersQuery.isLoading ? (
          <div className="py-8 flex justify-center text-brand-muted-soft">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <p className="py-6 text-center text-sm text-brand-muted-soft">
            No members yet.
          </p>
        ) : (
          <ul className="divide-y divide-brand-rule">
            {members.map((m: any) => {
              const isMe = m.id === myMemberId
              const canEditThisMember =
                canManage && !isMe && m.role !== "owner"
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-accent-tint text-brand-accent font-medium text-sm uppercase">
                    {(m.user?.name ?? m.user?.email ?? "?")
                      .split(" ")
                      .map((w: string) => w[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-brand-ink">
                        {m.user?.name ?? m.user?.email ?? "Member"}
                        {isMe && (
                          <span className="ml-1.5 text-xs text-brand-muted-soft font-normal">
                            (you)
                          </span>
                        )}
                      </p>
                      {m.role === "owner" && (
                        <Badge variant="default" className="h-5 text-[10px] uppercase">
                          Owner
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-brand-muted-soft">
                      {m.user?.email ?? "—"}
                    </p>
                  </div>
                  {canEditThisMember ? (
                    <Select
                      value={m.role}
                      onValueChange={(v) =>
                        updateRoleMutation.mutate({ memberId: m.id, role: v })
                      }
                    >
                      <SelectTrigger className="h-8 w-[150px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        {ROLE_VALUES.filter((r) => r !== "admin").map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLES.find((x) => x.value === r)?.label ?? r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary" className="h-6 text-[11px]">
                      {ROLES.find((x) => x.value === m.role)?.label ?? m.role}
                    </Badge>
                  )}
                  {canEditThisMember && (
                    <RemoveMemberDialog
                      name={m.user.name || m.user.email}
                      workspaceName={activeOrg?.name ?? "this workspace"}
                      pending={removeMemberMutation.isPending}
                      onConfirm={() => removeMemberMutation.mutate(m.id)}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {/* ─── Pending invitations ─── */}
      <Card className="border-brand-rule bg-brand-card p-6">
        <div className="mb-4">
          <h2 className="font-medium text-brand-ink">Pending invitations</h2>
          <p className="text-xs text-brand-muted-soft mt-0.5">
            {invitations.length === 0
              ? "No pending invites."
              : `${invitations.length} ${invitations.length === 1 ? "invite" : "invites"} awaiting response.`}
          </p>
        </div>

        {invitesQuery.isLoading ? (
          <div className="py-8 flex justify-center text-brand-muted-soft">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : invitations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-brand-rule p-6 text-center">
            <Mail className="mx-auto h-5 w-5 text-brand-muted-soft" />
            <p className="mt-2 text-sm text-brand-muted-soft">
              No invitations out. Invite your first teammate above.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-brand-rule">
            {invitations.map((inv: any) => (
              <li
                key={inv.id}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-accent-tint text-brand-accent">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-brand-ink">
                    {inv.email}
                  </p>
                  <p className="truncate text-xs text-brand-muted-soft">
                    {ROLES.find((r) => r.value === inv.role)?.label ?? inv.role}
                    {" · expires "}
                    {inv.expiresAt
                      ? new Date(inv.expiresAt).toLocaleDateString()
                      : "soon"}
                  </p>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => cancelInviteMutation.mutate(inv.id)}
                    className="text-brand-muted-soft hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ─── Self-leave + Danger zone ─── */}
      <Card className="border-brand-rule bg-brand-card p-6 space-y-4">
        <div>
          <h2 className="font-medium text-brand-ink">Your membership</h2>
          <p className="text-xs text-brand-muted-soft mt-1">
            Leave this workspace to switch to another one. Workspace data
            (loads, drivers, invoices) is preserved for the rest of the team.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isOwner && (
            <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="outline"
                    className="h-9 text-sm border-brand-rule hover:bg-brand-cream"
                  />
                }
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                Leave workspace
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Leave this workspace?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You&apos;ll lose access to {activeOrg?.name ?? "this workspace"}.
                    You can be re-invited later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => leaveMutation.mutate()}
                    className="bg-brand-ink text-brand-cream hover:bg-brand-ink-soft"
                  >
                    Leave workspace
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {isOwner && (
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger
                render={
                  <Button
                    variant="outline"
                    className="h-9 text-sm border-destructive/40 text-destructive hover:bg-destructive/10"
                  />
                }
              >
                <ShieldOff className="h-3.5 w-3.5 mr-1.5" />
                Delete workspace
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Delete this workspace?</DialogTitle>
                  <DialogDescription>
                    This permanently removes {activeOrg?.name ?? "this workspace"},
                    every load, driver, invoice, and member record. There is no
                    undo. Type the workspace name to confirm.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-2">
                  <Label htmlFor="confirm-name">
                    Type <span className="font-medium">{activeOrg?.name}</span>
                  </Label>
                  <Input
                    id="confirm-name"
                    value={deleteConfirmName}
                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                    placeholder={activeOrg?.name ?? ""}
                    className="h-10"
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setDeleteOpen(false)
                      setDeleteConfirmName("")
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => deleteMutation.mutate()}
                    disabled={
                      deleteConfirmName !== (activeOrg?.name ?? "") ||
                      deleteMutation.isPending
                    }
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    {deleteMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting…
                      </>
                    ) : (
                      "Delete forever"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </Card>
    </div>
  )
}

// ─── Remove-member confirmation dialog (typed) ─────────────────────────────
// The cascade is destructive: removes the member, detaches their driver
// profile in this workspace, kills their sessions in this workspace,
// and (if it's their last workspace and they're not a platform admin)
// hard-deletes their user account. So we require a typed confirmation.

function RemoveMemberDialog({
  name,
  workspaceName,
  pending,
  onConfirm,
}: {
  name: string
  workspaceName: string
  pending: boolean
  onConfirm: () => void
}) {
  const [typed, setTyped] = useState("")
  return (
    <AlertDialog onOpenChange={(o) => !o && setTyped("")}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-brand-muted-soft hover:text-destructive"
            aria-label="Remove member"
          />
        }
      >
        <Trash2 className="h-4 w-4" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes them from <b>{workspaceName}</b>, detaches their
            driver profile in this workspace, and kills their active
            sessions in this workspace.{" "}
            <b>
              If this is their only workspace and they are not a platform
              admin, their account is also permanently deleted.
            </b>
            <br />
            <br />
            Type <code className="font-mono">REMOVE</code> to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="REMOVE"
          className="h-10 font-mono"
          autoFocus
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={typed !== "REMOVE" || pending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {pending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Remove {typed === "REMOVE" ? "forever" : ""}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Guard: ensure only signed-in users with an active org can see this page.
// We use Better Auth's getSession via the client; the (dashboard) layout
// already redirects unauthenticated and org-less users, but a defensive
// check on the client prevents a flash of empty content.
function TeamSettingsGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await authClient.getSession()
      if (cancelled) return
      if (!data?.user) {
        router.replace("/login")
        return
      }
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  if (!ready) {
    return (
      <div className="p-8 flex justify-center text-brand-muted-soft">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }
  return <>{children}</>
}
