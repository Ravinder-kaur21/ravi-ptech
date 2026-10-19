"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { usePermissions } from "@/lib/permissions-context"
import { PRESET_LIST } from "@/lib/role-presets"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Search,
  Plus,
  MoreHorizontal,
  Loader2,
  Users as UsersIcon,
  RefreshCcw,
  X,
  Users,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { SettingsPageHeader } from "@/components/settings/settings-page-header"

type Member = {
  memberId: string
  userId: string
  email: string
  name: string | null
  image: string | null
  role: string
  banned: boolean
  memberSuspendedAt: string | null
  joinedAt: string
  lastActiveAt: string | null
  invitationPending: boolean
  invitationEmail?: string
}

type MembersResponse = {
  members: Member[]
  total: number
}

const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  PRESET_LIST.map((p) => [p.role, p.label])
)

const ROLE_COLOR: Record<string, string> = {
  owner: "bg-brand-ink text-brand-cream",
  admin: "bg-brand-accent text-brand-cream",
  operations_manager: "bg-brand-accent/20 text-brand-accent",
  dispatcher: "bg-blue-100 text-blue-800",
  accounting: "bg-emerald-100 text-emerald-800",
  safety: "bg-amber-100 text-amber-800",
  driver: "bg-zinc-100 text-zinc-800",
  member: "bg-zinc-100 text-zinc-700",
}

export function MembersClient() {
  const router = useRouter()
  const perms = usePermissions()
  const [search, setSearch] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState<string>("all")

  const { data, isLoading } = useQuery<MembersResponse>({
    queryKey: ["members-list-v2", search, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (roleFilter !== "all") params.set("role", roleFilter)
      const r = await fetch(`/api/settings/workspace-members?${params}`)
      if (!r.ok) throw new Error("Failed to load members")
      return r.json()
    },
  })

  const canManage = perms.has("users.change_role")
  const canInvite = perms.has("users.invite")
  const canRemove = perms.has("users.remove")

  const activeCount = data?.members.filter((m) => !m.invitationPending).length ?? 0
  const pendingCount = data?.members.filter((m) => m.invitationPending).length ?? 0

  return (
    <div>
      <SettingsPageHeader
        kicker="Team"
        title="Members"
        description="Invite dispatchers, drivers, and accountants. Each member gets a role that controls what they see and do."
        icon={Users}
      >
        {canInvite && (
          <Button
            onClick={() => router.push("/settings/team/invite")}
            className="h-10 gap-1.5 rounded-full bg-brand-ink px-5 text-[13px] font-medium text-brand-cream hover:bg-brand-ink-soft"
          >
            <Plus className="h-4 w-4" />
            Invite member
          </Button>
        )}
      </SettingsPageHeader>

      {/* Stats strip */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat
          label="Active members"
          value={String(activeCount)}
          isLoading={isLoading}
        />
        <Stat
          label="Pending invitations"
          value={String(pendingCount)}
          isLoading={isLoading}
        />
        <Stat
          label="Roles in use"
          value={String(
            new Set(data?.members.map((m) => m.role) ?? []).size
          )}
          isLoading={isLoading}
        />
      </div>

      {/* Search + filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-muted-soft" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9 text-[13px] bg-brand-card border-brand-rule"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-10 rounded-md border border-brand-rule bg-brand-card px-3 text-[13px] text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
        >
          <option value="all">All roles</option>
          {PRESET_LIST.map((p) => (
            <option key={p.role} value={p.role}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
          ))}
        </div>
      ) : data && data.members.length === 0 ? (
        <EmptyState canInvite={canInvite} />
      ) : (
        <div className="rounded-xl border border-brand-rule bg-brand-card overflow-hidden">
          <ul className="divide-y divide-brand-rule">
            {data?.members.map((m) => (
              <MemberRow
                key={m.memberId}
                member={m}
                canManage={canManage}
                canRemove={canRemove}
              />
            ))}
          </ul>
        </div>
      )}

      {data && data.members.length > 0 && (
        <p className="mt-6 text-[12px] text-brand-muted-soft">
          All member changes are recorded in the audit log.
        </p>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  isLoading,
}: {
  label: string
  value: string
  isLoading: boolean
}) {
  return (
    <div className="rounded-xl border border-brand-rule bg-brand-card p-4">
      <p className="text-[11px] font-mono uppercase tracking-[0.06em] text-brand-muted-soft">
        {label}
      </p>
      <p className="mt-1 font-serif text-2xl text-brand-ink">
        {isLoading ? "—" : value}
      </p>
    </div>
  )
}

function MemberRow({
  member: m,
  canManage,
  canRemove,
}: {
  member: Member
  canManage: boolean
  canRemove: boolean
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const initials = (m.name || m.email || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
  const role = m.role || "member"
  const roleLabel = ROLE_LABEL[role] ?? role
  const isPending = m.invitationPending
  const isSuspended = !!m.memberSuspendedAt

  const resend = useMutation({
    mutationFn: async () => {
      if (!m.invitationEmail) return
      const r = await fetch("/api/settings/workspace-invitations/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: m.invitationEmail }),
      })
      if (!r.ok) throw new Error("Failed to resend")
    },
    onSuccess: () => toast.success(`Invitation resent to ${m.invitationEmail}`),
    onError: () => toast.error("Failed to resend invitation"),
  })

  const revoke = useMutation({
    mutationFn: async () => {
      const r = await fetch(
        `/api/settings/workspace-invitations/${m.memberId}/revoke`,
        { method: "POST" }
      )
      if (!r.ok) throw new Error("Failed to revoke")
    },
    onSuccess: () => {
      toast.success("Invitation revoked")
      queryClient.invalidateQueries({ queryKey: ["members-list-v2"] })
    },
    onError: () => toast.error("Failed to revoke"),
  })

  const remove = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/settings/workspace-members/${m.userId}`, {
        method: "DELETE",
      })
      if (!r.ok) throw new Error("Failed to remove")
    },
    onSuccess: () => {
      toast.success("Member removed")
      queryClient.invalidateQueries({ queryKey: ["members-list-v2"] })
    },
    onError: () => toast.error("Failed to remove"),
  })

  return (
    <li className="px-5 py-3.5 hover:bg-brand-cream/50 transition-colors">
      <div className="flex items-center gap-4">
        <Avatar className="size-11 shrink-0">
          {m.image && <AvatarImage src={m.image} alt={m.name ?? m.email} />}
          <AvatarFallback className="bg-brand-accent-tint text-brand-accent text-[13px] font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-semibold text-brand-ink truncate">
              {m.name || m.email}
            </p>
            {isSuspended && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-amber-100 text-amber-800">
                Suspended
              </Badge>
            )}
            {isPending && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-zinc-100 text-zinc-700">
                Invited
              </Badge>
            )}
          </div>
          <p className="text-[12px] text-brand-muted-soft truncate">{m.email}</p>
          <p className="text-[11px] text-brand-muted-soft mt-0.5">
            {isPending
              ? `Invitation sent ${formatDistanceToNow(new Date(m.joinedAt))} ago · Awaiting signup`
              : `Joined ${formatDistanceToNow(new Date(m.joinedAt))} ago${
                  m.lastActiveAt
                    ? ` · Last active ${formatDistanceToNow(new Date(m.lastActiveAt))} ago`
                    : ""
                }`}
          </p>
        </div>

        <Badge
          className={`text-[11px] font-medium px-2.5 py-0.5 shrink-0 ${
            ROLE_COLOR[role] ?? "bg-zinc-100 text-zinc-800"
          }`}
        >
          {roleLabel}
        </Badge>

        {isPending ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => resend.mutate()}
              disabled={resend.isPending}
              className="h-8 text-[12px] text-brand-muted-soft hover:text-brand-ink"
            >
              {resend.isPending ? <Loader2 className="size-3 animate-spin" /> : <RefreshCcw className="size-3" />}
              <span className="ml-1.5">Resend</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => revoke.mutate()}
              disabled={revoke.isPending}
              className="h-8 text-[12px] text-brand-muted-soft hover:text-red-600"
            >
              <X className="size-3" />
              <span className="ml-1.5">Revoke</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            {canManage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/settings/team/${m.userId}`)}
                className="h-8 text-[12px] text-brand-ink/80 hover:text-brand-ink"
              >
                Manage
              </Button>
            )}
            {canRemove && m.role !== "owner" && (
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center size-8 rounded-md hover:bg-brand-accent-tint text-brand-muted-soft">
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-lg border-brand-rule bg-brand-card p-1 min-w-[180px]">
                  <DropdownMenuItem
                    onClick={() => router.push(`/settings/team/${m.userId}`)}
                    className="rounded-md cursor-pointer text-[13px]"
                  >
                    View profile & permissions
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-brand-rule" />
                  <DropdownMenuItem
                    onClick={() => {
                      if (confirm(`Remove ${m.name || m.email} from this workspace?`)) {
                        remove.mutate()
                      }
                    }}
                    className="rounded-md cursor-pointer text-[13px] text-red-600 focus:text-red-700"
                  >
                    Remove from workspace
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

function EmptyState({ canInvite }: { canInvite: boolean }) {
  return (
    <div className="rounded-xl border border-brand-rule bg-brand-card p-12 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-brand-accent-tint flex items-center justify-center mb-4">
        <UsersIcon className="h-5 w-5 text-brand-accent" />
      </div>
      <p className="font-serif text-lg text-brand-ink">No teammates yet</p>
      <p className="mt-1 text-[13px] text-brand-muted-soft max-w-sm mx-auto">
        Invite your first dispatcher, driver, or accountant. They will get an email with a sign-up link.
      </p>
      {canInvite && (
        <Link
          href="/settings/team/invite"
          className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-ink px-4 text-[13px] font-medium text-brand-cream hover:bg-brand-ink-soft"
        >
          <Plus className="h-3.5 w-3.5" />
          Invite member
        </Link>
      )}
    </div>
  )
}
