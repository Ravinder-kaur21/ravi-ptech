"use client"

import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { authClient } from "@/lib/auth-client"
import { useAuthStore } from "@/lib/stores/auth-store"
import { useWorkspaceDate } from "@/lib/timezone"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Eye,
  X,
  Plus,
  Check,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"

// ─── Types ──────────────────────────────────────────────────────────

type ResourceEntry = { resource: string; actions: string[] }
type RoleEntry = {
  id: string
  label: string
  description: string
  order: number
  permissions: Record<string, string[]>
  isCustom?: boolean
}
type MemberEntry = {
  memberId: string
  userId: string
  email: string
  name: string | null
  image: string | null
  role: string
  platformRole: string | null
  banned: boolean
  memberSuspendedAt: Date | string | null
  memberSuspendedUntil: Date | string | null
  joinedAt: Date | string
  lastActiveAt: Date | string | null
}

interface CatalogResponse {
  roles: RoleEntry[]
  resources: ResourceEntry[]
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Flatten a role's permissions into a Set of "resource.action" strings. */
function permissionsToSet(role: RoleEntry): Set<string> {
  const set = new Set<string>()
  for (const [res, actions] of Object.entries(role.permissions)) {
    for (const a of actions) set.add(`${res}.${a}`)
  }
  return set
}

/** Get all actions for a resource across all roles in the catalog. */
function allActionStrings(res: string, resources: ResourceEntry[]): string[] {
  const r = resources.find((r) => r.resource === res)
  return r ? r.actions : []
}

// ─── Component ─────────────────────────────────────────────────────

export function RolesClient() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { formatDate } = useWorkspaceDate()
  const activeOrg = useAuthStore((s) => s.activeOrganization)

  useEffect(() => {
    ;(async () => {
      const { data } = await authClient.getSession()
      if (!data?.user) router.replace("/login")
    })()
  }, [router])

  // ── Delete custom role ──────────────────────────────────────────────
  const deleteRoleMutation = useMutation({
    mutationFn: async ({ roleId }: { roleId: string }) => {
      if (!activeOrg?.id) throw new Error("No active organization")
      const { error } = await authClient.organization.deleteRole({
        roleId,
        organizationId: activeOrg.id,
      })
      if (error) throw new Error(error.message || "Failed to delete role")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-catalog"] })
      toast.success("Role deleted")
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete role")
    },
  })

  // ── Role catalog (static — same for every workspace) ──
  const catalogQuery = useQuery({
    queryKey: ["role-catalog"],
    queryFn: async (): Promise<CatalogResponse> => {
      const r = await fetch("/api/settings/role-catalog", {
        credentials: "include",
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return await r.json()
    },
    staleTime: 60_000,
  })

  // ── Workspace members (for the member-level inspector) ──
  const membersQuery = useQuery({
    queryKey: ["workspace-members"],
    queryFn: async (): Promise<{ members: MemberEntry[] }> => {
      const r = await fetch("/api/settings/workspace-members", {
        credentials: "include",
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return await r.json()
    },
    staleTime: 30_000,
  })

  const data = catalogQuery.data
  const rawResources = useMemo(
    () => data?.resources ?? [],
    [data]
  )
  const sortedResources = useMemo(
    () => [...rawResources].sort((a, b) => a.resource.localeCompare(b.resource)),
    [rawResources]
  )
  const members = membersQuery.data?.members ?? []

  if (catalogQuery.isLoading) {
    return (
      <div className="p-4 lg:p-8 space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }
  if (catalogQuery.isError) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load role catalog: {(catalogQuery.error as Error).message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!data) return null

  const roles = data.roles

  return (
    <RolePermissionsShell
      roles={roles}
      resources={sortedResources}
      members={members}
      membersLoading={membersQuery.isLoading}
      formatDate={formatDate}
      onRoleCreated={() => catalogQuery.refetch()}
      onDeleteRole={(roleId: string) => deleteRoleMutation.mutate({ roleId })}
    />
  )
}

// ─── Shell (tabs + matrix + members) ────────────────────────────────

function RolePermissionsShell({
  roles,
  resources,
  members,
  membersLoading,
  formatDate,
  onRoleCreated,
  onDeleteRole,
}: {
  roles: RoleEntry[]
  resources: ResourceEntry[]
  members: MemberEntry[]
  membersLoading: boolean
  formatDate: (d: Date | string) => string
  onRoleCreated: () => void
  onDeleteRole: (roleId: string) => void
}) {
  // Impact preview state: compare two roles
  const [compareFrom, setCompareFrom] = useState<string>("")
  const [compareTo, setCompareTo] = useState<string>("")
  const [selectedRoleForMembers, setSelectedRoleForMembers] = useState<string>("")
  const [inspectedMember, setInspectedMember] = useState<MemberEntry | null>(null)
  const [showCreateRole, setShowCreateRole] = useState(false)

  const impactResult = useMemo(() => {
    if (!compareFrom || !compareTo) return null
    const from = roles.find((r) => r.id === compareFrom)
    const to = roles.find((r) => r.id === compareTo)
    if (!from || !to) return null

    const fromSet = permissionsToSet(from)
    const toSet = permissionsToSet(to)

    const granted: string[] = []
    const removed: string[] = []
    const same: string[] = []

    for (const perm of Array.from(new Set([...fromSet, ...toSet])).sort()) {
      const inFrom = fromSet.has(perm)
      const inTo = toSet.has(perm)
      if (inTo && !inFrom) granted.push(perm)
      else if (!inTo && inFrom) removed.push(perm)
      else if (inTo && inFrom) same.push(perm)
    }

    return { granted, removed, same, fromLabel: from.label, toLabel: to.label }
  }, [compareFrom, compareTo, roles])

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
            <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
            Roles &amp; <span className="italic text-brand-accent">permissions</span>
          </h1>
        </div>
        <p className="text-sm text-brand-ink/80">
          The {roles.length} predefined roles in MUVX. Explore the full permission
          matrix, inspect what individual members can do, and preview the impact
          of a role change before you apply it.
        </p>
      </div>

      {/* Info card */}
      <Card className="border-brand-rule bg-brand-card p-4">
        <div className="flex items-start gap-3 text-xs text-brand-muted-soft">
          <KeyRound className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="mb-1">
              <span className="text-brand-ink font-medium">Permission resolution:</span>{" "}
              Default-deny. A user can only perform an action if an applicable
              role grants the matching{" "}
              <code className="font-mono text-[11px] bg-brand-cream px-1 rounded">
                resource:action
              </code>
              .
            </p>
            <p>
              Critical administrative actions (e.g. role delegation, ownership
              transfer) are additionally guarded by Better Auth and by
              last-owner checks in the workspace server actions.
            </p>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-brand-cream border border-brand-rule flex-wrap h-auto">
          <TabsTrigger value="overview" className="text-xs">
            What this role does
          </TabsTrigger>
          <TabsTrigger value="matrix" className="text-xs">
            Permission matrix
          </TabsTrigger>
          <TabsTrigger value="members" className="text-xs">
            Members &amp; access
          </TabsTrigger>
          <TabsTrigger value="impact" className="text-xs">
            Impact preview
          </TabsTrigger>
        </TabsList>

        {/* ── Overview tab — human-readable summary ── */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <RoleOverview
            roles={roles}
            selectedRoleForMembers={selectedRoleForMembers}
          />
        </TabsContent>

        {/* ── Matrix tab ── */}
        <TabsContent key="matrix" value="matrix" className="mt-4 space-y-4">
          {/* Header row: title + Create role button */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-brand-muted-soft">
              {roles.length} roles defined globally. Custom roles are scoped to this workspace.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCreateRole(true)}
              className="h-7 gap-1.5 text-xs border-brand-rule text-brand-ink"
            >
              <Plus className="h-3 w-3" /> Create role
            </Button>
          </div>
          {roles.map((role) => (
            <RoleMatrixCard
              key={role.id}
              role={role}
              resources={resources}
              onDeleteRole={role.isCustom ? onDeleteRole : undefined}
            />
          ))}
        </TabsContent>

        {/* ── Members tab ── */}
        <TabsContent value="members" className="mt-4 space-y-4">
          <MembersTabContent
            roles={roles}
            resources={resources}
            members={members}
            membersLoading={membersLoading}
            formatDate={formatDate}
            selectedRoleForMembers={selectedRoleForMembers}
            setSelectedRoleForMembers={setSelectedRoleForMembers}
            onInspect={setInspectedMember}
          />
          {/* Reverse-lookup helper: who has this permission? */}
          {selectedRoleForMembers && (
            <Card className="border-brand-rule bg-brand-card p-4 mt-4">
              <h3 className="font-medium text-sm text-brand-ink mb-2">
                Members with role: {roles.find((r) => r.id === selectedRoleForMembers)?.label ?? selectedRoleForMembers}
              </h3>
              <div className="flex flex-wrap gap-2">
                {members.filter((m) => m.role === selectedRoleForMembers).length === 0 && (
                  <p className="text-xs text-brand-muted-soft">No members have this role.</p>
                )}
                {members
                  .filter((m) => m.role === selectedRoleForMembers)
                  .map((m) => (
                    <div
                      key={m.memberId}
                      className="flex items-center gap-2 text-xs"
                    >
                      <Badge
                        variant="outline"
                        className="border-brand-rule text-brand-ink/80 text-[10px] font-mono"
                      >
                        {m.role}
                      </Badge>
                      <span className="text-brand-ink/80">
                        {m.name || m.email}
                      </span>
                    </div>
                  ))}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ── Impact tab ── */}
        <TabsContent value="impact" className="mt-4 space-y-4">
          <Card className="border-brand-rule bg-brand-card p-6 space-y-4">
            <div>
              <h2 className="font-serif text-xl text-brand-ink">
                Impact preview
              </h2>
              <p className="text-xs text-brand-muted-soft mt-1">
                Compare two roles to see the exact permission delta — what
                would be granted, removed, or unchanged.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-brand-ink">
                  From role
                </label>
                <select
                  value={compareFrom}
                  onChange={(e) => setCompareFrom(e.target.value)}
                  className="h-9 w-52 rounded-lg border border-brand-rule bg-white px-3 text-sm text-brand-ink focus:ring-2 focus:ring-brand-accent/20"
                >
                  <option value="">Select a role…</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-brand-ink">
                  To role
                </label>
                <select
                  value={compareTo}
                  onChange={(e) => setCompareTo(e.target.value)}
                  className="h-9 w-52 rounded-lg border border-brand-rule bg-white px-3 text-sm text-brand-ink focus:ring-2 focus:ring-brand-accent/20"
                >
                  <option value="">Select a role…</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {impactResult && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="size-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-medium text-brand-ink">
                      Newly granted ({impactResult.granted.length})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {impactResult.granted.length === 0 ? (
                      <p className="text-xs text-brand-muted-soft">
                        No new permissions
                      </p>
                    ) : (
                      impactResult.granted.map((p) => (
                        <code
                          key={p}
                          className="block text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded"
                        >
                          {p}
                        </code>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="size-2 rounded-full bg-red-500" />
                    <span className="text-xs font-medium text-brand-ink">
                      Removed ({impactResult.removed.length})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {impactResult.removed.length === 0 ? (
                      <p className="text-xs text-brand-muted-soft">
                        No permissions removed
                      </p>
                    ) : (
                      impactResult.removed.map((p) => (
                        <code
                          key={p}
                          className="block text-[10px] font-mono text-red-800 bg-red-50 px-1.5 py-0.5 rounded"
                        >
                          {p}
                        </code>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="size-2 rounded-full bg-brand-muted-soft/40" />
                    <span className="text-xs font-medium text-brand-ink">
                      Unchanged ({impactResult.same.length})
                    </span>
                  </div>
                  <p className="text-xs text-brand-muted-soft">
                    {impactResult.same.length} permissions stay the same.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Member permission inspector dialog ── */}
      <MemberPermissionDialog
        member={inspectedMember}
        roles={roles}
        resources={resources}
        onClose={() => setInspectedMember(null)}
        formatDate={formatDate}
      />

      {/* ── Create custom role dialog ── */}
      <CreateRoleDialog
        open={showCreateRole}
        onClose={() => setShowCreateRole(false)}
        resources={resources}
        onCreated={onRoleCreated}
      />
    </div>
  )
}
// ─── "What this role does" tab ─────────────────────────────────────

const MODULE_LABELS: Record<string, { label: string; outcome: (n: number) => string }> = {
  workspace: {
    label: "Workspace",
    outcome: (n) => `Edit ${n} workspace field${n === 1 ? "" : "s"} (name, address, billing, etc.)`,
  },
  member: {
    label: "Team members",
    outcome: () => "Invite, change role, suspend, and remove teammates",
  },
  invitation: {
    label: "Invitations",
    outcome: () => "Send, resend, and cancel pending invites",
  },
  load: {
    label: "Loads",
    outcome: (n) => `See, create, edit, dispatch ${n} load action${n === 1 ? "" : "s"}`,
  },
  trip: {
    label: "Trips",
    outcome: (n) => `Manage trip planning, dispatch, and updates (${n} action${n === 1 ? "" : "s"})`,
  },
  driver: {
    label: "Drivers",
    outcome: (n) => `Read and update driver records (${n} action${n === 1 ? "" : "s"})`,
  },
  truck: {
    label: "Fleet (trucks & trailers)",
    outcome: (n) => `Read and update fleet records (${n} action${n === 1 ? "" : "s"})`,
  },
  invoice: {
    label: "Invoices & finance",
    outcome: (n) => `Read, create, edit, and void invoices (${n} action${n === 1 ? "" : "s"})`,
  },
  payroll: {
    label: "Payroll",
    outcome: (n) => `Read and edit pay stubs and payroll (${n} action${n === 1 ? "" : "s"})`,
  },
  ac: {
    label: "Custom roles (BA)",
    outcome: () => "Create and edit custom role definitions",
  },
  team: {
    label: "Teams (BA)",
    outcome: (n) => `Manage team definitions (${n} action${n === 1 ? "" : "s"})`,
  },
  organization: {
    label: "Organization",
    outcome: (n) => `Update or delete the workspace (${n} action${n === 1 ? "" : "s"})`,
  },
}

function RoleOverview({
  roles,
  selectedRoleForMembers,
}: {
  roles: RoleEntry[]
  selectedRoleForMembers: string
}) {
  const [pickedId, setPickedId] = React.useState<string>(
    selectedRoleForMembers || roles[0]?.id || ""
  )
  const role = roles.find((r) => r.id === pickedId) ?? roles[0]
  if (!role) return null

  const granted = permissionsToSet(role)
  const moduleEntries = Object.entries(role.permissions)
    .filter(([, actions]) => actions.length > 0)
    .map(([res, actions]) => {
      const meta = MODULE_LABELS[res] ?? {
        label: res,
        outcome: (n: number) => `${n} action${n === 1 ? "" : "s"} on ${res}`,
      }
      return { res, label: meta.label, actions, outcome: meta.outcome(actions.length) }
    })
    .sort((a, b) => a.label.localeCompare(b.label))

  const hiddenModules = Object.keys(MODULE_LABELS).filter(
    (m) => !(role.permissions[m]?.length ?? 0)
  )

  return (
    <div className="space-y-4">
      {/* Role picker (when more than one role exists) */}
      <div className="flex flex-wrap items-center gap-2">
        {roles.map((r) => (
          <button
            key={r.id}
            onClick={() => setPickedId(r.id)}
            className={
              r.id === pickedId
                ? "h-8 px-3 rounded-full bg-brand-ink text-brand-cream text-[12px] font-medium"
                : "h-8 px-3 rounded-full border border-brand-rule bg-brand-card text-[12px] text-brand-ink hover:bg-brand-cream"
            }
          >
            {r.label}
            {r.isCustom && (
              <span className="ml-1.5 text-[10px] font-mono uppercase opacity-70">
                custom
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-brand-rule bg-brand-card p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-serif text-2xl text-brand-ink">{role.label}</h2>
            <p className="mt-1 text-[13px] text-brand-ink/80 max-w-prose">
              {role.description}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] font-mono uppercase tracking-[0.06em] text-brand-muted-soft">
              Grants
            </p>
            <p className="mt-1 font-serif text-2xl text-brand-ink">
              {Array.from(granted).length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* What they CAN do */}
        <div className="rounded-xl border border-brand-rule bg-brand-card p-5 space-y-3">
          <p className="text-[11px] font-mono uppercase tracking-[0.06em] text-brand-muted-soft">
            Modules this role can access
          </p>
          {moduleEntries.length === 0 ? (
            <p className="text-[13px] text-brand-muted-soft">
              No modules granted yet.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {moduleEntries.map((m) => (
                <li key={m.res} className="flex items-start gap-2">
                  <Check className="size-3.5 text-emerald-700 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[13px] text-brand-ink font-medium">
                      {m.label}
                    </p>
                    <p className="text-[12px] text-brand-ink/80">{m.outcome}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* What they CANNOT do */}
        <div className="rounded-xl border border-brand-rule bg-brand-card p-5 space-y-3">
          <p className="text-[11px] font-mono uppercase tracking-[0.06em] text-brand-muted-soft">
            Hidden from this role
          </p>
          {hiddenModules.length === 0 ? (
            <p className="text-[13px] text-brand-muted-soft">
              Nothing is hidden — this role has every module.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {hiddenModules.map((m) => (
                <li
                  key={m}
                  className="flex items-center gap-2 text-[13px] text-brand-muted-soft"
                >
                  <X className="size-3.5 shrink-0" />
                  {MODULE_LABELS[m]?.label ?? m}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="text-[12px] text-brand-muted-soft">
        Need to compare with another role? Switch to the{" "}
        <span className="font-medium text-brand-ink">Impact preview</span> tab.
      </p>
    </div>
  )
}

// ─── Create custom role dialog ─────────────────────────────────────

function CreateRoleDialog({
  open,
  onClose,
  resources,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  resources: ResourceEntry[]
  onCreated: () => void
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const activeOrg = useAuthStore((s) => s.activeOrganization)

  const [name, setName] = useState("")
  const [label, setLabel] = useState("")
  // permission toggles keyed as "resource.action"
  const [perms, setPerms] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setName("")
      setLabel("")
      setPerms({})
      setSubmitting(false)
    }
  }, [open])

  const togglePerm = (key: string) =>
    setPerms((prev) => ({ ...prev, [key]: !prev[key] }))

  const permCount = Object.values(perms).filter(Boolean).length

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!activeOrg?.id) throw new Error("No active organization")
      // Build permission object: { resource: ["action1", "action2"] }
      const permission: Record<string, string[]> = {}
      for (const [key, enabled] of Object.entries(perms)) {
        if (!enabled) continue
        const [resource, action] = key.split(".")
        if (!permission[resource]) permission[resource] = []
        permission[resource].push(action)
      }
      return await authClient.organization.createRole({
        role: name.trim(),
        permission,
        organizationId: activeOrg.id,
      })
    },
    onSuccess: () => {
      toast.success(`Role "${name}" created`)
      queryClient.invalidateQueries({ queryKey: ["role-catalog"] })
      onCreated()
      onClose()
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create role")
      setSubmitting(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Role ID is required")
      return
    }
    if (!/^[a-z0-9_-]+$/.test(name.trim())) {
      toast.error("Role ID must be lowercase letters, numbers, hyphens, or underscores")
      return
    }
    if (permCount === 0) {
      toast.error("Select at least one permission")
      return
    }
    setSubmitting(true)
    createMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-brand-accent" />
            Create custom role
          </DialogTitle>
          <DialogDescription>
            Custom roles are scoped to this workspace. Members assigned this role
            will get exactly the permissions you enable below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Role ID + label */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="role-id">
                Role ID{" "}
                <span className="text-brand-muted-soft font-normal">(slug)</span>
              </Label>
              <Input
                id="role-id"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                placeholder="custom-dispatcher"
                className="h-9 font-mono text-xs"
              />
              <p className="text-[10px] text-brand-muted-soft">
                Lowercase letters, numbers, hyphens, underscores.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-label">Display name</Label>
              <Input
                id="role-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Custom Dispatcher"
                className="h-9"
              />
            </div>
          </div>

          {/* Permission grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Permissions</Label>
              <span className="text-xs text-brand-muted-soft">
                {permCount} selected
              </span>
            </div>
            <div className="border border-brand-rule rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-brand-cream">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-brand-ink w-8" />
                    <th className="text-left px-3 py-2 font-medium text-brand-ink">
                      Resource
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-brand-ink">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map((res) =>
                    res.actions.map((action, i) => {
                      const key = `${res.resource}.${action}`
                      return (
                        <tr
                          key={key}
                          className={i % 2 === 0 ? "bg-white" : "bg-brand-cream/30"}
                        >
                          <td className="px-3 py-2 text-center">
                            <Checkbox
                              checked={perms[key] ?? false}
                              onCheckedChange={() => togglePerm(key)}
                              className="text-brand-accent data-[state=checked]:bg-brand-accent"
                            />
                          </td>
                          <td className="px-3 py-2 font-mono text-brand-ink-soft">
                            {i === 0 ? res.resource : ""}
                          </td>
                          <td className="px-3 py-2 font-mono text-brand-ink/60">
                            {action}
                          </td>
                        </tr>
                      )
                    }),
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-brand-rule"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || permCount === 0 || !name.trim()}
              className="bg-brand-ink hover:bg-brand-ink-soft text-brand-cream"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Create role
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Permission matrix card per role ────────────────────────────────

function RoleMatrixCard({
  role,
  resources,
  onDeleteRole,
}: {
  role: RoleEntry
  resources: ResourceEntry[]
  onDeleteRole?: (roleId: string) => void
}) {
  const granted = permissionsToSet(role)
  const isCustom = role.isCustom === true

  return (
    <Card className="border-brand-rule bg-brand-card p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-brand-ink">{role.label}</h2>
          <p className="text-sm text-brand-ink/80 mt-1">{role.description}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge
            variant="outline"
            className="border-brand-rule text-brand-muted-soft"
          >
            {Array.from(granted).length} grants
          </Badge>
          <span className="text-[10px] font-mono text-brand-muted-soft">
            role = &quot;{role.id}&quot;
          </span>
          {isCustom && onDeleteRole && (
            <button
              onClick={() => onDeleteRole(role.id)}
              className="text-[10px] text-red-500 hover:text-red-700 mt-1"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="border border-brand-rule rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-cream">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-brand-ink">
                Resource
              </th>
              <th className="text-left px-3 py-2 font-medium text-brand-ink">
                Permission
              </th>
              <th className="text-left px-3 py-2 font-medium text-brand-ink">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {resources.map((r, i) => {
              const actions = allActionStrings(r.resource, resources)
              return actions.map((action, j) => {
                const permKey = `${r.resource}.${action}`
                const isGranted = granted.has(permKey)
                const rowIdx = i * 10 + j // for zebra striping
                return (
                  <tr
                    key={permKey}
                    className={
                      rowIdx % 2 === 0
                        ? "bg-white"
                        : "bg-brand-cream/40"
                    }
                  >
                    <td className="px-3 py-2 align-top font-mono text-xs text-brand-ink-soft">
                      {r.resource}
                    </td>
                    <td className="px-3 py-2 align-top font-mono text-xs text-brand-ink/60">
                      {action}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {isGranted ? (
                        <Badge
                          variant="default"
                          className="bg-emerald-100 text-emerald-800 border-0 text-[10px] font-mono"
                        >
                          granted
                        </Badge>
                      ) : (
                        <span className="text-xs text-brand-muted-soft">
                          — denied
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-brand-muted-soft">
        This role grants {Array.from(granted).length} specific resource:action
        pairs. Denied actions fall back to default-deny.
      </p>
    </Card>
  )
}

// ─── Members tab ───────────────────────────────────────────────────

function MembersTabContent({
  roles,
  resources,
  members,
  membersLoading,
  formatDate,
  selectedRoleForMembers,
  setSelectedRoleForMembers,
  onInspect,
}: {
  roles: RoleEntry[]
  resources: ResourceEntry[]
  members: MemberEntry[]
  membersLoading: boolean
  formatDate: (d: Date | string) => string
  selectedRoleForMembers: string
  setSelectedRoleForMembers: (v: string) => void
  onInspect: (m: MemberEntry) => void
}) {
  return (
    <div className="space-y-4">
      {/* Role filter */}
      <div className="flex items-end gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-brand-ink">
            Filter by role
          </label>
          <select
            value={selectedRoleForMembers}
            onChange={(e) => setSelectedRoleForMembers(e.target.value)}
            className="h-9 w-48 rounded-lg border border-brand-rule bg-white px-3 text-sm text-brand-ink focus:ring-2 focus:ring-brand-accent/20"
          >
            <option value="">All roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Member list */}
      <Card className="border-brand-rule bg-brand-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-rule bg-brand-cream">
                <th className="text-left px-3 py-2 font-medium text-brand-ink">
                  Member
                </th>
                <th className="text-left px-3 py-2 font-medium text-brand-ink">
                  Role
                </th>
                <th className="text-left px-3 py-2 font-medium text-brand-ink">
                  Permissions
                </th>
                <th className="text-left px-3 py-2 font-medium text-brand-ink">
                  Last active
                </th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {membersLoading ? (
                <tr>
                  <td colSpan={5} className="p-4">
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-xs text-brand-muted-soft">
                    No members found.
                  </td>
                </tr>
              ) : (
                members
                  .filter(
                    (m) => !selectedRoleForMembers || m.role === selectedRoleForMembers,
                  )
                  .map((m) => {
                    const roleEntry = roles.find((r) => r.id === m.role)
                    const permCount = roleEntry
                      ? permissionsToSet(roleEntry).size
                      : 0
                    return (
                      <tr key={m.memberId} className="border-b border-brand-rule/40">
                        <td className="px-3 py-2 align-top">
                          <div className="flex items-center gap-2">
                            <div className="size-7 rounded-full bg-brand-cream flex items-center justify-center overflow-hidden">
                              {m.image ? (
                                <img
                                  src={m.image}
                                  alt={m.name || m.email}
                                  className="size-full object-cover"
                                />
                              ) : (
                                <span className="text-xs font-mono text-brand-muted-soft">
                                  {m.email?.[0]?.toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-brand-ink">
                                {m.name || m.email}
                              </p>
                              <p className="text-xs text-brand-muted-soft">
                                {m.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono"
                          >
                            {m.role}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-brand-muted-soft">
                          {permCount} permissions
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-brand-muted-soft">
                          {m.lastActiveAt
                            ? formatDate(m.lastActiveAt)
                            : "Never"}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onInspect(m)}
                            className="h-6 w-6 p-0"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ─── Member permission inspector dialog ─────────────────────────────

function MemberPermissionDialog({
  member,
  roles,
  resources,
  onClose,
  formatDate,
}: {
  member: MemberEntry | null
  roles: RoleEntry[]
  resources: ResourceEntry[]
  onClose: () => void
  formatDate: (d: Date | string) => string
}) {
  if (!member) return null
  const roleEntry = roles.find((r) => r.id === member.role)
  const granted = roleEntry ? permissionsToSet(roleEntry) : new Set<string>()

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Member details</span>
          </DialogTitle>
          <DialogDescription>
            <div className="flex items-center gap-2 mt-1">
              <div className="size-8 rounded-full bg-brand-cream flex items-center justify-center overflow-hidden">
                {member.image ? (
                  <img
                    src={member.image}
                    alt={member.name || member.email}
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-mono text-brand-muted-soft">
                    {member.email?.[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <span className="font-medium text-brand-ink">
                {member.name || member.email}
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <h3 className="font-medium text-sm text-brand-ink">
              Role: {roleEntry?.label ?? member.role}
            </h3>
            <p className="text-xs text-brand-muted-soft mt-1">
              {roleEntry?.description ?? "Unknown role"}
            </p>
          </div>

          <div>
            <h3 className="font-medium text-sm text-brand-ink mb-2">
              Effective permissions ({granted.size})
            </h3>
            <div className="border border-brand-rule rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-brand-cream">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-brand-ink">
                      Resource
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-brand-ink">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(granted)
                    .sort()
                    .map((perm, i) => {
                      const [res, action] = perm.split(".")
                      return (
                        <tr
                          key={perm}
                          className={
                            i % 2 === 0 ? "bg-white" : "bg-brand-cream/40"
                          }
                        >
                          <td className="px-3 py-1.5 font-mono text-brand-ink-soft">
                            {res}
                          </td>
                          <td className="px-3 py-1.5 text-brand-ink/60">
                            {action}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
