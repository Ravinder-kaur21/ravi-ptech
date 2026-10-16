"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { authClient } from "@/lib/auth-client"
import { useAuthStore } from "@/lib/stores/auth-store"
import { useWorkspaceDate } from "@/lib/timezone"
import { removeMemberAction } from "@/app/actions/remove-member"
import {
  resendInvitationAction,
  suspendMemberAction,
  liftWorkspaceSuspensionAction,
  transferOwnershipAction,
  updateMemberRoleAction,
} from "@/app/actions/invitation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  Loader2,
  Mail,
  Trash2,
  Send,
  ShieldOff,
  Users,
  LogOut,
  X,
  Plus,
  ShieldCheck,
  Search,
  MoreHorizontal,
  ArrowLeftRight,
  Ban,
} from "lucide-react"

// ─── Role metadata — SINGLE SOURCE OF TRUTH ──────────────────────────
// Roles are defined in lib/auth-roles.ts (ROLE_CATALOG) and served by
// /api/settings/role-catalog. We map that catalog here to avoid the role
// list drifting across files (GAP-2). `owner` is excluded from assignable
// roles — owners are set only via transfer-ownership, not via invite or
// role-change dialogs. `member` (previously missing) is included and is
// now the default invite role.
import { ROLE_CATALOG, type RoleId } from "@/lib/auth-roles"

type RoleMeta = { value: string; label: string; description: string }
const ROLES: RoleMeta[] = ROLE_CATALOG.filter(
  (r) => r.id !== "owner",
).map((r) => ({ value: r.id, label: r.label, description: r.description }))

// Canonical assignable role type (excludes "owner" — set via transfer only)
type Role = Exclude<RoleId, "owner">

// Better Auth returns the active member via getActiveMember (and it's on
// session.user.role too). We treat owner / admin as full-access; everyone
// else gets read-only on this page.
type ViewerRole = "owner" | "admin" | Role | string

/**
 * Human-readable label for an audit action in the
 * "Recent access changes" card (WS-30).
 */
function eventLabel(action: string): string {
  const map: Record<string, string> = {
    "user.invite-to-org": "Invited a member",
    "user.invite-resent": "Re-sent invitation",
    "user.invite-cancelled": "Cancelled invitation",
    "user.set-member-role": "Changed member role",
    "user.remove-from-org": "Removed member from workspace",
    "user.suspend-from-workspace": "Suspended from this workspace",
    "user.lift-workspace-suspension": "Lifted workspace suspension",
    "org.transfer-ownership": "Transferred workspace ownership",
  }
  return map[action] ?? action
}

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
  const { formatDate, formatTime } = useWorkspaceDate()

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

  // ─── Member search + status filter state (WS-22, WS-26) ──
  const [memberSearch, setMemberSearch] = useState("")
  const [memberStatus, setMemberStatus] =
    useState<"all" | "active" | "suspended">("all")

  // ─── Full org (members list) — server-backed, with search + status ──
  const membersQuery = useQuery({
    queryKey: ["workspace-members", memberSearch, memberStatus],
    queryFn: async () => {
      console.log(
        `[TEAM] listWorkspaceMembers search=${memberSearch} status=${memberStatus}`,
      )
      const url = `/api/settings/workspace-members?search=${encodeURIComponent(memberSearch)}&status=${memberStatus}`
      const res = await fetch(url, { cache: "no-store" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed (${res.status})`)
      }
      const data = await res.json()
      console.log(`[TEAM] workspace-members: ${data.members?.length ?? 0} rows`)
      return data as {
        members: Array<{
          memberId: string
          userId: string
          email: string
          name: string | null
          image: string | null
          role: string
          platformRole: string | null
          banned: boolean | null
          userSuspendedAt: string | null
          userSuspendedUntil: string | null
          memberSuspendedAt: string | null
          memberSuspendedUntil: string | null
          memberSuspendedReason: string | null
          memberSuspendedBy: string | null
          joinedAt: string
          lastActiveAt: string | null
        }>
        total: number
      }
    },
  })

  // ─── Invitations (WS-19, WS-20) — server-backed with status filter ──
  const [inviteStatus, setInviteStatus] =
    useState<"pending" | "accepted" | "rejected" | "canceled" | "all">("pending")
  const invitesQuery = useQuery({
    queryKey: ["workspace-invitations", inviteStatus],
    queryFn: async () => {
      console.log(`[TEAM] listInvitations status=${inviteStatus}`)
      const res = await fetch(
        `/api/settings/workspace-invitations?status=${inviteStatus}`,
        { cache: "no-store" },
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed (${res.status})`)
      }
      const data = await res.json()
      console.log(`[TEAM] workspace-invitations: ${data.length ?? 0} rows`)
      return data as Array<{
        id: string
        email: string
        role: string | null
        status: string
        expiresAt: string
        createdAt: string
        inviterEmail: string | null
      }>
    },
  })

  // ─── Recent access changes (WS-30) — server-backed ──
  const recentEventsQuery = useQuery({
    queryKey: ["workspace-recent-events"],
    queryFn: async () => {
      console.log("[TEAM] listOrgRecentAudit")
      const res = await fetch("/api/settings/workspace-recent-events", {
        cache: "no-store",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed (${res.status})`)
      }
      const data = await res.json()
      console.log(`[TEAM] recent-events: ${data.events?.length ?? 0} rows`)
      return data as { events: Array<{
        id: string
        action: string
        actorEmail: string
        targetType: string
        targetLabel: string | null
        createdAt: string
      }> }
    },
  })

  const viewerRole: ViewerRole =
    (activeMember as { role?: string } | null)?.role ??
    activeOrg?.metadata?.role ??
    "member"

  const isOwner = viewerRole === "owner"
  const canManage = isOwner || viewerRole === "admin"

  // ─── Invite dialog state ──
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<Role>("member")

  // ─── Suspend / lift / transfer state (WS-26, WS-28) ──
  const [suspendTarget, setSuspendTarget] = useState<
    | { id: string; name: string; email: string; memberSuspendedAt: string | null }
    | null
  >(null)
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [transferTarget, setTransferTarget] = useState<
    { id: string; name: string; email: string } | null
  >(null)
  const [transferOpen, setTransferOpen] = useState(false)

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
      setInviteRole("member")
      setInviteOpen(false)
      queryClient.invalidateQueries({ queryKey: ["workspace-invitations"] })
      queryClient.invalidateQueries({ queryKey: ["workspace-recent-events"] })
    },
    onError: (err: Error) => {
      console.error("[TEAM] inviteMember failed:", err)
      toast.error(err.message)
    },
  })

  // ─── Cancel invitation (Better Auth client; status="canceled") ──
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
      queryClient.invalidateQueries({ queryKey: ["workspace-invitations"] })
      queryClient.invalidateQueries({ queryKey: ["workspace-recent-events"] })
    },
    onError: (err: Error) => {
      console.error("[TEAM] cancelInvitation failed:", err)
      toast.error(err.message)
    },
  })

  // ─── Resend invitation (WS-20) ──
  const resendInviteMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      console.log("[TEAM] resendInvitation →", invitationId)
      return await resendInvitationAction({ invitationId })
    },
    onSuccess: () => {
      toast.success("Invitation re-sent")
      queryClient.invalidateQueries({ queryKey: ["workspace-invitations"] })
      queryClient.invalidateQueries({ queryKey: ["workspace-recent-events"] })
    },
    onError: (err: Error) => {
      console.error("[TEAM] resend failed:", err)
      toast.error(err.message)
    },
  })

  // ─── Suspend member from this workspace (WS-26) ──
  const suspendMutation = useMutation({
    mutationFn: async ({
      memberId,
      reason,
      until,
    }: {
      memberId: string
      reason?: string
      until?: string
    }) => {
      console.log(`[TEAM] suspendMember → ${memberId}`)
      return await suspendMemberAction({ memberId, reason, until })
    },
    onSuccess: (res) => {
      toast.success(
        res.suspendedUntil
          ? `Member suspended until ${formatDate(new Date(res.suspendedUntil))}`
          : "Member suspended",
      )
      queryClient.invalidateQueries({ queryKey: ["workspace-members"] })
      queryClient.invalidateQueries({ queryKey: ["workspace-recent-events"] })
    },
    onError: (err: Error) => {
      console.error("[TEAM] suspend failed:", err)
      toast.error(err.message)
    },
  })

  // ─── Lift workspace suspension (WS-26) ──
  const liftSuspendMutation = useMutation({
    mutationFn: async (memberId: string) => {
      console.log(`[TEAM] liftSuspend → ${memberId}`)
      return await liftWorkspaceSuspensionAction({ memberId })
    },
    onSuccess: () => {
      toast.success("Suspension lifted")
      queryClient.invalidateQueries({ queryKey: ["workspace-members"] })
      queryClient.invalidateQueries({ queryKey: ["workspace-recent-events"] })
    },
    onError: (err: Error) => {
      console.error("[TEAM] lift failed:", err)
      toast.error(err.message)
    },
  })

  // ─── Transfer ownership (WS-28) ──
  const transferMutation = useMutation({
    mutationFn: async (newOwnerMemberId: string) => {
      console.log(`[TEAM] transferOwnership → ${newOwnerMemberId}`)
      return await transferOwnershipAction({ newOwnerMemberId })
    },
    onSuccess: () => {
      toast.success("Ownership transferred. You are now an admin.", {
        duration: 6000,
      })
      queryClient.invalidateQueries()
      queryClient.invalidateQueries({ queryKey: ["workspace-members"] })
      queryClient.invalidateQueries({ queryKey: ["workspace-recent-events"] })
      router.refresh()
    },
    onError: (err: Error) => {
      console.error("[TEAM] transfer failed:", err)
      toast.error(err.message)
    },
  })

  // ─── Remove member (cascade) ──
  // The server action detaches workspace-scoped driver rows and sessions,
  // then deletes only this membership. The person's account is retained.
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      console.log(`[TEAM] removeMember (cascade) → ${memberId}`)
      return await removeMemberAction({ memberId })
    },
    onSuccess: (result) => {
      console.log("[TEAM] removeMember cascade result:", result)
      toast.success("Member removed from this workspace", { duration: 5000 })
      queryClient.invalidateQueries({ queryKey: ["workspace-members"] })
      queryClient.invalidateQueries({ queryKey: ["workspace-recent-events"] })
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
      return await updateMemberRoleAction({
        memberId,
        role: role as Role,
      })
    },
    onSuccess: () => {
      toast.success("Role updated")
      queryClient.invalidateQueries({ queryKey: ["workspace-members"] })
      queryClient.invalidateQueries({ queryKey: ["workspace-recent-events"] })
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

  const members = membersQuery.data?.members ?? []
  const invitations = invitesQuery.data ?? []
  const recentEvents = recentEventsQuery.data?.events ?? []

  /**
   * Is the current viewer the owner of the active member row?
   * Used to gate "Transfer ownership to me" and similar affordances.
   */
  const myWorkspaceMemberRow =
    members.find((m) => m.userId === activeMember?.user?.id) ?? null
  const iAmOwner = myWorkspaceMemberRow?.role === "owner"

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
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h2 className="font-medium text-brand-ink">Members</h2>
            <p className="text-xs text-brand-muted-soft mt-0.5">
              {membersQuery.data?.total ?? members.length}{" "}
              {(membersQuery.data?.total ?? members.length) === 1 ? "member" : "members"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-brand-muted-soft" />
              <Input
                placeholder="Search by name or email…"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="h-9 pl-8 text-xs"
              />
            </div>
            <Tabs
              value={memberStatus}
              onValueChange={(v) => setMemberStatus(v as "all" | "active" | "suspended")}
            >
              <TabsList className="h-9">
                <TabsTrigger value="all" className="text-xs">
                  All
                </TabsTrigger>
                <TabsTrigger value="active" className="text-xs">
                  Active
                </TabsTrigger>
                <TabsTrigger value="suspended" className="text-xs">
                  Suspended
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {membersQuery.isLoading ? (
          <div className="py-8 flex justify-center text-brand-muted-soft">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <p className="py-6 text-center text-sm text-brand-muted-soft">
            {memberSearch
              ? `No members match "${memberSearch}".`
              : memberStatus === "suspended"
                ? "No suspended members."
                : "No members yet."}
          </p>
        ) : (
          <ul className="divide-y divide-brand-rule">
            {members.map((m) => {
              const isMe = m.userId === activeMember?.user?.id
              const canEditThisMember =
                canManage && !isMe && m.role !== "owner"
              // WS-23 — status projections
              const isBanned = !!m.banned
              const userSuspended =
                m.userSuspendedAt &&
                (!m.userSuspendedUntil ||
                  new Date(m.userSuspendedUntil) > new Date())
              const memberSuspended =
                m.memberSuspendedAt &&
                (!m.memberSuspendedUntil ||
                  new Date(m.memberSuspendedUntil) > new Date())
              return (
                <li
                  key={m.memberId}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-accent-tint text-brand-accent font-medium text-sm uppercase">
                    {(m.name ?? m.email ?? "?")
                      .split(" ")
                      .map((w: string) => w[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="truncate text-sm font-medium text-brand-ink">
                        {m.name ?? m.email ?? "Member"}
                        {isMe && (
                          <span className="ml-1.5 text-xs text-brand-muted-soft font-normal">
                            (you)
                          </span>
                        )}
                      </p>
                      {m.role === "owner" && (
                        <Badge
                          variant="default"
                          className="h-5 text-[10px] uppercase"
                        >
                          Owner
                        </Badge>
                      )}
                      {isBanned && (
                        <Badge
                          variant="destructive"
                          className="h-5 text-[10px] uppercase gap-1"
                        >
                          <Ban className="h-2.5 w-2.5" />
                          Banned
                        </Badge>
                      )}
                      {userSuspended && !isBanned && (
                        <Badge
                          variant="destructive"
                          className="h-5 text-[10px] uppercase"
                        >
                          Platform suspended
                        </Badge>
                      )}
                      {memberSuspended && !userSuspended && (
                        <Badge
                          variant="secondary"
                          className="h-5 text-[10px] uppercase bg-amber-100 text-amber-900 border-amber-200"
                        >
                          Workspace suspended
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-brand-muted-soft">
                      {m.email}
                      {memberSuspended && m.memberSuspendedReason && (
                        <>
                          {" · "}
                          <span className="italic">
                            reason: {m.memberSuspendedReason}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  {canEditThisMember ? (
                    <Select
                      value={m.role}
                      onValueChange={(v) =>
                        updateRoleMutation.mutate({
                          memberId: m.memberId,
                          role: v ?? m.role,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-[150px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        {ROLES.filter((r) => r.value !== "admin").map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary" className="h-6 text-[11px]">
                      {ROLES.find((x) => x.value === m.role)?.label ?? m.role}
                    </Badge>
                  )}
                  {canManage && !isMe && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label="Member actions"
                          />
                        }
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        {memberSuspended ? (
                          <DropdownMenuItem
                            onClick={() => liftSuspendMutation.mutate(m.memberId)}
                            disabled={liftSuspendMutation.isPending}
                          >
                            <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                            Lift suspension
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => {
                              setSuspendTarget({
                                id: m.memberId,
                                name: m.name ?? "",
                                email: m.email,
                                memberSuspendedAt: m.memberSuspendedAt,
                              })
                              setSuspendOpen(true)
                            }}
                            disabled={m.role === "owner"}
                          >
                            <ShieldOff className="mr-2 h-3.5 w-3.5" />
                            Suspend from this workspace
                          </DropdownMenuItem>
                        )}
                        {iAmOwner && m.role !== "owner" && !isMe && (
                          <DropdownMenuItem
                            onClick={() => {
                              setTransferTarget({
                                id: m.memberId,
                                name: m.name ?? "",
                                email: m.email,
                              })
                              setTransferOpen(true)
                            }}
                          >
                            <ArrowLeftRight className="mr-2 h-3.5 w-3.5" />
                            Transfer ownership
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {m.role !== "owner" && (
                          <RemoveMemberDropdown
                            memberId={m.memberId}
                            name={m.name ?? m.email}
                            workspaceName={activeOrg?.name ?? "this workspace"}
                            pending={removeMemberMutation.isPending}
                            onConfirm={() =>
                              removeMemberMutation.mutate(m.memberId)
                            }
                          />
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {/* ─── Invitations (WS-19, WS-20) ─── */}
      <Card className="border-brand-rule bg-brand-card p-6">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h2 className="font-medium text-brand-ink">Invitations</h2>
            <p className="text-xs text-brand-muted-soft mt-0.5">
              {invitations.length === 0
                ? inviteStatus === "pending"
                  ? "No pending invites."
                  : `No ${inviteStatus} invites.`
                : `${invitations.length} ${invitations.length === 1 ? "invite" : "invites"} · ${inviteStatus}`}
            </p>
          </div>
          <Tabs
            value={inviteStatus}
            onValueChange={(v) =>
              setInviteStatus(
                v as "pending" | "accepted" | "rejected" | "canceled" | "all",
              )
            }
          >
            <TabsList className="h-9">
              <TabsTrigger value="pending" className="text-xs">
                Pending
              </TabsTrigger>
              <TabsTrigger value="accepted" className="text-xs">
                Accepted
              </TabsTrigger>
              <TabsTrigger value="rejected" className="text-xs">
                Rejected
              </TabsTrigger>
              <TabsTrigger value="canceled" className="text-xs">
                Canceled
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs">
                All
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {invitesQuery.isLoading ? (
          <div className="py-8 flex justify-center text-brand-muted-soft">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : invitations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-brand-rule p-6 text-center">
            <Mail className="mx-auto h-5 w-5 text-brand-muted-soft" />
            <p className="mt-2 text-sm text-brand-muted-soft">
              {inviteStatus === "pending"
                ? "No invitations out. Invite your first teammate above."
                : `No ${inviteStatus} invitations.`}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-brand-rule">
            {invitations.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-accent-tint text-brand-accent">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="truncate text-sm font-medium text-brand-ink">
                      {inv.email}
                    </p>
                    <Badge
                      variant="secondary"
                      className="h-5 text-[10px] uppercase"
                    >
                      {inv.status}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-brand-muted-soft">
                    {ROLES.find((r) => r.value === inv.role)?.label ?? inv.role}
                    {inv.expiresAt && (
                      <>
                        {" · expires "}
                        {formatDate(new Date(inv.expiresAt))}
                      </>
                    )}
                    {inv.inviterEmail && (
                      <>
                        {" · invited by "}
                        {inv.inviterEmail}
                      </>
                    )}
                  </p>
                </div>
                {canManage && inv.status === "pending" && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resendInviteMutation.mutate(inv.id)}
                      disabled={resendInviteMutation.isPending}
                      className="text-brand-muted-soft hover:text-brand-ink"
                    >
                      {resendInviteMutation.isPending &&
                      resendInviteMutation.variables === inv.id ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5 mr-1" />
                      )}
                      Resend
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelInviteMutation.mutate(inv.id)}
                      disabled={cancelInviteMutation.isPending}
                      className="text-brand-muted-soft hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Revoke
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ─── Recent access changes (WS-30) ─── */}
      <Card className="border-brand-rule bg-brand-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-medium text-brand-ink">
              Recent access changes
            </h2>
            <p className="text-xs text-brand-muted-soft mt-0.5">
              Last 20 events scoped to this workspace.
            </p>
          </div>
        </div>
        {recentEventsQuery.isLoading ? (
          <div className="py-8 flex justify-center text-brand-muted-soft">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : recentEvents.length === 0 ? (
          <p className="py-6 text-center text-sm text-brand-muted-soft">
            No recent access changes.
          </p>
        ) : (
          <ul className="divide-y divide-brand-rule">
            {recentEvents.map((e) => (
              <li
                key={e.id}
                className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="size-2 rounded-full bg-brand-accent mt-2 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-brand-ink">
                    {eventLabel(e.action)}{" "}
                    <span className="text-brand-muted-soft font-normal">
                      by {e.actorEmail}
                    </span>
                  </p>
                  <p className="text-[11px] text-brand-muted-soft mt-0.5">
                    {formatDate(new Date(e.createdAt))} · target:{" "}
                    {e.targetLabel ?? e.targetType}
                  </p>
                </div>
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

      {/* ─── Suspend / Transfer dialogs (WS-26, WS-28) ─── */}
      <SuspendMemberDialog
        target={suspendTarget}
        open={suspendOpen}
        onOpenChange={(o) => {
          setSuspendOpen(o)
          if (!o) setSuspendTarget(null)
        }}
        pending={suspendMutation.isPending}
        onSubmit={(memberId, reason, until) => {
          suspendMutation.mutate(
            { memberId, reason, until },
            {
              onSuccess: () => {
                setSuspendOpen(false)
                setSuspendTarget(null)
              },
            },
          )
        }}
      />
      <TransferOwnershipDialog
        target={transferTarget}
        open={transferOpen}
        onOpenChange={(o) => {
          setTransferOpen(o)
          if (!o) setTransferTarget(null)
        }}
        pending={transferMutation.isPending}
        onConfirm={(newOwnerMemberId) => {
          transferMutation.mutate(newOwnerMemberId, {
            onSuccess: () => {
              setTransferOpen(false)
              setTransferTarget(null)
            },
          })
        }}
      />
    </div>
  )
}

// ─── Remove-member confirmation dialog (typed) ─────────────────────────────
// The cascade is destructive: removes the member, detaches their driver
// profile in this workspace, kills their sessions in this workspace,
// and (if it's their last workspace and they're not a platform admin)
// hard-deletes their user account. So we require a typed confirmation.

/**
 * RemoveMemberDropdown — Phase 1 row-level remove affordance.
 *
 * Renders as a DropdownMenuItem that opens a typed-confirmation
 * AlertDialog. The cascade (`removeMemberAction` → `cascadeRemoveMember`)
 * detaches the member's driver profile in this workspace, kills their
 * active sessions in this workspace, deletes the membership, and
 * (if last workspace + not platform admin) hard-deletes the user.
 */
function RemoveMemberDropdown({
  name,
  workspaceName,
  pending,
  onConfirm,
}: {
  memberId: string
  name: string
  workspaceName: string
  pending: boolean
  onConfirm: () => void
}) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState("")
  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setTyped("")
      }}
    >
      <AlertDialogTrigger
        render={
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              setOpen(true)
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Remove from workspace
          </DropdownMenuItem>
        }
      />
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

/**
 * SuspendMemberDialog — Phase 1 (WS-26). Confirms a workspace-scoped
 * suspension with optional reason + optional until date. Does NOT
 * touch platform-level user.suspendedAt.
 */
function SuspendMemberDialog({
  target,
  open,
  onOpenChange,
  onSubmit,
  pending,
}: {
  target: { id: string; name: string; email: string } | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (
    memberId: string,
    reason: string | undefined,
    until: string | undefined,
  ) => void
  pending: boolean
}) {
  const [reason, setReason] = useState("")
  const [until, setUntil] = useState("")
  // Reset state whenever the dialog re-opens with a new target.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setReason("")
      setUntil("")
    }
  }, [open, target?.id])
  /* eslint-enable react-hooks/set-state-in-effect */
  if (!target) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Suspend {target.name || target.email}?</DialogTitle>
          <DialogDescription>
            Suspends them from <b>this workspace only</b>. They keep their
            account and other workspace memberships. Their active sessions
            in this workspace will be revoked.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="suspend-reason">Reason (optional)</Label>
            <Textarea
              id="suspend-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this member being suspended?"
              className="min-h-[64px]"
              maxLength={500}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="suspend-until">Suspend until (optional)</Label>
            <Input
              id="suspend-until"
              type="datetime-local"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              className="h-10"
            />
            <p className="text-[11px] text-brand-muted-soft">
              Leave blank for indefinite suspension.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              let iso: string | undefined = undefined
              if (until) {
                const d = new Date(until)
                if (Number.isNaN(d.getTime())) {
                  toast.error("Invalid date")
                  return
                }
                iso = d.toISOString()
              }
              onSubmit(target.id, reason.trim() || undefined, iso)
            }}
            disabled={pending}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ShieldOff className="h-4 w-4 mr-2" />
            )}
            Suspend
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * TransferOwnershipDialog — Phase 1 (WS-28). Type-to-confirm dialog
 * for ownership transfer. Single-transaction demote-self + promote-target
 * guarantees the workspace never has zero owners.
 */
function TransferOwnershipDialog({
  target,
  open,
  onOpenChange,
  onConfirm,
  pending,
}: {
  target: { id: string; name: string; email: string } | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (newOwnerMemberId: string) => void
  pending: boolean
}) {
  const [typed, setTyped] = useState("")
  // Reset typed state when re-opened with new target
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setTyped("")
    }
  }, [open, target?.id])
  /* eslint-enable react-hooks/set-state-in-effect */
  if (!target) return null
  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setTyped("")
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Transfer ownership to {target.name || target.email}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            You will be demoted to <b>admin</b>. They will become the new
            <b> owner</b> of this workspace. There is no undo — they can
            transfer it back manually.
            <br />
            <br />
            Type <code className="font-mono">TRANSFER</code> to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="TRANSFER"
          className="h-10 font-mono"
          autoFocus
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(target.id)}
            disabled={typed !== "TRANSFER" || pending}
            className="bg-brand-ink text-brand-cream hover:bg-brand-ink-soft"
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Transfer
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
