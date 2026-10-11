"use client"

/**
 * ChangeRoleSheet — the single, comprehensive "change role" UI.
 *
 * Replaces the old binary "Promote to admin" / "Demote to user"
 * button. Muvx has TWO role systems that need to be kept distinct:
 *
 *   Platform role (System A) — `user.role` on the user table.
 *     Values: "user" | "admin". Set by Better Auth's admin plugin.
 *     Gated by /admin/* (requireAdmin). ONE per user, global.
 *
 *   Workspace role (System B) — `member.role` on the member table.
 *     Values: "owner" | "admin" | "member" | "operations_manager" |
 *     "dispatcher" | "accounting" | "driver" | "safety".
 *     Set by Better Auth's organization plugin. PER workspace.
 *
 * This sheet shows both. It writes both via /api/admin/users/[id]/action
 * (one call covers both when both are present) and audits each side
 * separately so the audit log distinguishes them.
 */
import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { authClient } from "@/lib/auth-client"
import {
  Crown,
  ShieldCheck,
  Briefcase,
  TruckIcon,
  Calculator,
  HardHat,
  ClipboardList,
  User as UserIcon,
  ChevronRight,
  Loader2,
  Building2,
  type LucideIcon,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────

type WorkspaceRole =
  | "owner"
  | "admin"
  | "member"
  | "operations_manager"
  | "dispatcher"
  | "accounting"
  | "driver"
  | "safety"

type PlatformRole = "user" | "admin"

type TargetUser = {
  id: string
  email: string
  name: string
  image: string | null
  platformRole: PlatformRole | null
  workspaceMemberships: {
    organizationId: string
    organizationName: string
    organizationSlug: string
    role: WorkspaceRole
  }[]
}

// ─── Role metadata (icon + label + description) ─────────────────────────

const PLATFORM_ROLE_META: Record<PlatformRole, { label: string; icon: LucideIcon; description: string }> = {
  user: {
    label: "Standard user",
    icon: UserIcon,
    description:
      "Default. Cannot access /admin, cannot impersonate, cannot manage users or workspaces.",
  },
  admin: {
    label: "Platform admin",
    icon: ShieldCheck,
    description:
      "Full access to /admin — users, workspaces, appeals, security, feature flags, communications, audit. Can impersonate any user. Use with care.",
  },
}

const WORKSPACE_ROLE_META: Record<
  WorkspaceRole,
  { label: string; icon: LucideIcon; description: string; tone: "default" | "info" | "warn" }
> = {
  owner: {
    label: "Owner",
    icon: Crown,
    tone: "warn",
    description: "Full control of the workspace. Can delete it, transfer ownership, manage billing.",
  },
  admin: {
    label: "Workspace admin",
    icon: ShieldCheck,
    tone: "warn",
    description: "Manage members, invites, settings. Cannot delete the workspace or transfer ownership.",
  },
  operations_manager: {
    label: "Operations manager",
    icon: Briefcase,
    tone: "info",
    description: "Full CRUD on loads, trips, drivers, trucks. No invoice / payroll access.",
  },
  dispatcher: {
    label: "Dispatcher",
    icon: ClipboardList,
    tone: "info",
    description: "Create + update loads and trips. Read drivers and trucks. Assign work.",
  },
  accounting: {
    label: "Accounting",
    icon: Calculator,
    tone: "info",
    description: "Full CRUD on invoices and payroll. Read-only loads. No access to trips / drivers / trucks.",
  },
  safety: {
    label: "Safety",
    icon: HardHat,
    tone: "info",
    description: "Read + update drivers (CDL, certifications). Read loads and trucks. Compliance focus.",
  },
  driver: {
    label: "Driver",
    icon: TruckIcon,
    tone: "default",
    description: "Read-only access to their own loads and trips. Mobile-first surface.",
  },
  member: {
    label: "Member",
    icon: UserIcon,
    tone: "default",
    description: "Read-only access. Useful for read-mostly stakeholders (e.g. customer success).",
  },
}

const ALL_WORKSPACE_ROLES = Object.keys(WORKSPACE_ROLE_META) as WorkspaceRole[]

// ─── Component ────────────────────────────────────────────────────────────

export function ChangeRoleSheet({
  userId,
  open,
  onOpenChange,
  onMutated,
}: {
  userId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onMutated?: () => void
}) {
  const [user, setUser] = React.useState<TargetUser | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [platformRole, setPlatformRole] = React.useState<PlatformRole>("user")
  const [workspaceRoles, setWorkspaceRoles] = React.useState<
    Record<string, WorkspaceRole>
  >({})
  const [dirtyPlatform, setDirtyPlatform] = React.useState(false)
  const [dirtyWorkspaces, setDirtyWorkspaces] = React.useState<
    Record<string, boolean>
  >({})
  const [saving, setSaving] = React.useState(false)

  // Load user + roles when the sheet opens
  React.useEffect(() => {
    if (!open || !userId) {
      setUser(null)
      setError(null)
      setWorkspaceRoles({})
      setDirtyPlatform(false)
      setDirtyWorkspaces({})
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    console.log(`[CHANGE-ROLE] loading user ${userId}`)
    fetch(`/api/admin/users/${userId}/roles`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        if (cancelled) return
        console.log(`[CHANGE-ROLE] loaded`, d)
        setUser(d)
        setPlatformRole((d.platformRole as PlatformRole) ?? "user")
        const ws: Record<string, WorkspaceRole> = {}
        for (const m of d.workspaceMemberships ?? []) {
          ws[m.organizationId] = m.role as WorkspaceRole
        }
        setWorkspaceRoles(ws)
      })
      .catch((e) => {
        if (!cancelled) {
          console.error(`[CHANGE-ROLE] load failed:`, e)
          setError(e instanceof Error ? e.message : "Failed to load user")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, userId])

  // Detect dirty state
  React.useEffect(() => {
    if (!user) return
    setDirtyPlatform(platformRole !== (user.platformRole ?? "user"))
  }, [platformRole, user])

  const onWorkspaceRoleChange = (orgId: string, role: WorkspaceRole) => {
    setWorkspaceRoles((s) => ({ ...s, [orgId]: role }))
    setDirtyWorkspaces((s) => ({ ...s, [orgId]: true }))
  }

  const dirtyWorkspaceIds = Object.entries(dirtyWorkspaces)
    .filter(([, dirty]) => dirty)
    .map(([id]) => id)
  const hasChanges = dirtyPlatform || dirtyWorkspaceIds.length > 0

  async function save() {
    if (!userId || !user) return
    setSaving(true)
    console.log(`[CHANGE-ROLE] save: platform=${platformRole} workspaces=${dirtyWorkspaceIds.length}`)
    try {
      // Save platform role if dirty
      if (dirtyPlatform) {
        const r = await fetch(`/api/admin/users/${userId}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "set-role", role: platformRole }),
        })
        if (!r.ok) {
          const body = await r.json().catch(() => ({}))
          throw new Error(body.error || "Failed to update platform role")
        }
        console.log(`[CHANGE-ROLE] platform role saved`)
      }
      // Save each dirty workspace role sequentially so the audit
      // log timestamps stay ordered
      for (const orgId of dirtyWorkspaceIds) {
        const role = workspaceRoles[orgId]
        if (!role) continue
        const r = await fetch(`/api/admin/users/${userId}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "set-role",
            role: user.platformRole ?? "user",
            memberRole: { organizationId: orgId, role },
          }),
        })
        if (!r.ok) {
          const body = await r.json().catch(() => ({}))
          throw new Error(
            body.error || `Failed to update role in ${orgId}`
          )
        }
        console.log(`[CHANGE-ROLE] workspace ${orgId} → ${role} saved`)
      }
      toast.success(
        dirtyWorkspaceIds.length > 0
          ? `Role updated in ${dirtyWorkspaceIds.length} workspace${dirtyWorkspaceIds.length === 1 ? "" : "s"}`
          : `Platform role updated to ${platformRole}`
      )
      onMutated?.()
      onOpenChange(false)
    } catch (e) {
      console.error(`[CHANGE-ROLE] save failed:`, e)
      toast.error(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-brand-rule bg-brand-card p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b border-brand-rule px-6 py-4">
          <SheetTitle className="font-serif text-lg tracking-tight text-brand-ink">
            Change role
          </SheetTitle>
          <SheetDescription>
            Platform role is global; workspace roles are per-workspace. Both
            are independent — you can change one without touching the other.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-4 px-6 py-4">
            {loading ? (
              <SkeletonRows />
            ) : error ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <UserIcon className="size-5" />
                  </EmptyMedia>
                  <EmptyTitle>Couldn&apos;t load user</EmptyTitle>
                  <EmptyDescription>{error}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : user ? (
              <>
                <UserHeader user={user} />
                <Accordion
                  defaultValue={["platform", "workspaces"]}
                  className="w-full"
                >
                  <PlatformSection
                    user={user}
                    value={platformRole}
                    onChange={setPlatformRole}
                  />
                  <WorkspacesSection
                    user={user}
                    roles={workspaceRoles}
                    onChange={onWorkspaceRoleChange}
                  />
                </Accordion>
              </>
            ) : null}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between border-t border-brand-rule bg-brand-cream-soft/50 px-6 py-3">
          <div className="text-[12px] text-brand-muted-soft">
            {hasChanges
              ? `${dirtyPlatform ? "1 platform" : ""}${dirtyPlatform && dirtyWorkspaceIds.length > 0 ? " + " : ""}${dirtyWorkspaceIds.length > 0 ? `${dirtyWorkspaceIds.length} workspace` : ""} change${dirtyPlatform && dirtyWorkspaceIds.length === 1 ? "" : "s"}`
              : "No changes yet"}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={save}
              disabled={!hasChanges || saving}
              className="bg-brand-ink text-brand-cream hover:bg-brand-ink-hover"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────

function UserHeader({ user }: { user: TargetUser }) {
  const initials = (user.name || user.email)
    .split(/[\s@]/g)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
  return (
    <div className="flex items-center gap-3 rounded-lg border border-brand-rule bg-brand-cream p-3">
      <Avatar className="size-10 rounded-lg">
        <AvatarImage src={user.image ?? undefined} alt={user.name} />
        <AvatarFallback className="rounded-lg bg-brand-ink text-brand-cream text-xs font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-brand-ink">
          {user.name || user.email}
        </p>
        <p className="truncate font-mono text-[11px] text-brand-muted-soft">
          {user.email}
        </p>
      </div>
    </div>
  )
}

function PlatformSection({
  user,
  value,
  onChange,
}: {
  user: TargetUser
  value: PlatformRole
  onChange: (v: PlatformRole) => void
}) {
  const current = (user.platformRole ?? "user") as PlatformRole
  return (
    <AccordionItem
      value="platform"
      className="rounded-lg border border-brand-rule bg-brand-card"
    >
      <AccordionTrigger className="px-4 py-3 hover:no-underline">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="size-4 text-brand-accent" />
          <div className="text-left">
            <p className="font-serif text-[15px] tracking-tight text-brand-ink">
              Platform role
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
              Currently: {PLATFORM_ROLE_META[current].label}
            </p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="border-t border-brand-rule px-4 pb-4 pt-3">
        <FieldGroup>
          <RadioGroup
            value={value}
            onValueChange={(v) => onChange(v as PlatformRole)}
            className="gap-2"
          >
            {(Object.keys(PLATFORM_ROLE_META) as PlatformRole[]).map((role) => {
              const meta = PLATFORM_ROLE_META[role]
              const Icon = meta.icon
              return (
                <label
                  key={role}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border border-brand-rule p-3 transition-colors",
                    value === role
                      ? "border-brand-ink bg-brand-cream-soft"
                      : "hover:border-brand-ink/30 hover:bg-brand-cream-soft/50"
                  )}
                >
                  <RadioGroupItem
                    value={role}
                    id={`platform-${role}`}
                    className="mt-0.5"
                  />
                  <Icon className="mt-0.5 size-4 text-brand-muted-soft" />
                  <div className="min-w-0 flex-1">
                    <FieldLabel
                      htmlFor={`platform-${role}`}
                      className="cursor-pointer text-sm font-medium text-brand-ink"
                    >
                      {meta.label}
                    </FieldLabel>
                    <FieldDescription className="text-[12px]">
                      {meta.description}
                    </FieldDescription>
                  </div>
                </label>
              )
            })}
          </RadioGroup>
        </FieldGroup>
      </AccordionContent>
    </AccordionItem>
  )
}

function WorkspacesSection({
  user,
  roles,
  onChange,
}: {
  user: TargetUser
  roles: Record<string, WorkspaceRole>
  onChange: (orgId: string, role: WorkspaceRole) => void
}) {
  return (
    <AccordionItem
      value="workspaces"
      className="rounded-lg border border-brand-rule bg-brand-card"
    >
      <AccordionTrigger className="px-4 py-3 hover:no-underline">
        <div className="flex items-center gap-2.5">
          <Building2 className="size-4 text-brand-accent" />
          <div className="text-left">
            <p className="font-serif text-[15px] tracking-tight text-brand-ink">
              Workspace roles
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
              {user.workspaceMemberships.length}{" "}
              {user.workspaceMemberships.length === 1 ? "membership" : "memberships"}
            </p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="border-t border-brand-rule px-4 pb-4 pt-3">
        {user.workspaceMemberships.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Building2 className="size-5" />
              </EmptyMedia>
              <EmptyTitle>No workspaces</EmptyTitle>
              <EmptyDescription>
                This user is not a member of any workspace yet.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <FieldGroup className="gap-3">
            {user.workspaceMemberships.map((m) => {
              const meta = WORKSPACE_ROLE_META[m.role as WorkspaceRole] ?? WORKSPACE_ROLE_META.member
              const Icon = meta.icon
              const current = roles[m.organizationId] ?? (m.role as WorkspaceRole)
              return (
                <div
                  key={m.organizationId}
                  className="rounded-lg border border-brand-rule bg-brand-cream p-3"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="size-3.5 text-brand-muted-soft" />
                    <Link
                      href={`/admin/workspaces?search=${encodeURIComponent(m.organizationSlug)}`}
                      className="font-mono text-[11px] text-brand-ink hover:underline"
                    >
                      {m.organizationName}
                    </Link>
                    <Badge
                      variant="outline"
                      className={cn(
                        "ml-auto font-mono text-[9px] uppercase tracking-[0.04em]",
                        meta.tone === "warn" && "border-amber-300 bg-amber-50 text-amber-900",
                        meta.tone === "info" && "border-blue-300 bg-blue-50 text-blue-900"
                      )}
                    >
                      {meta.label}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-1 text-[11px] text-brand-muted-soft">
                    {meta.description}
                  </p>
                  <Select
                    value={current}
                    onValueChange={(v: string | null) => {
                      if (v) onChange(m.organizationId, v as WorkspaceRole)
                    }}
                  >
                    <SelectTrigger className="mt-2 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_WORKSPACE_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {WORKSPACE_ROLE_META[r].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            })}
          </FieldGroup>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  )
}
