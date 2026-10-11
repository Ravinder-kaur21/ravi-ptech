"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { authClient } from "@/lib/auth-client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { KeyRound, ShieldCheck, AlertCircle } from "lucide-react"

// ─── Phase 3 — WS-31/32/33: permission catalog ──────────────────────────────
// Read-only view of every predefined role + its effective permissions.
// Custom-role editor (P2) deferred.

type ResourceEntry = { resource: string; actions: string[] }
type RoleEntry = {
  id: string
  label: string
  description: string
  order: number
  permissions: Record<string, string[]>
}

export function RolesClient() {
  const router = useRouter()

  // Guard
  useEffect(() => {
    ;(async () => {
      const { data } = await authClient.getSession()
      if (!data?.user) router.replace("/login")
    })()
  }, [router])

  const q = useQuery({
    queryKey: ["role-catalog"],
    queryFn: async () => {
      const r = await fetch("/api/settings/role-catalog", {
        credentials: "include",
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return (await r.json()) as { roles: RoleEntry[]; resources: ResourceEntry[] }
    },
    staleTime: 60_000,
  })

  if (q.isLoading) {
    return (
      <div className="p-4 lg:p-8 space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }
  if (q.isError) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load role catalog: {(q.error as Error).message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const { roles, resources } = q.data!
  const sortedResources = [...resources].sort((a, b) =>
    a.resource.localeCompare(b.resource),
  )

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-5xl mx-auto">
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
          The {roles.length} predefined roles in MUVX and the exact resource ×
          action permissions each one grants. Custom roles (P2) are not yet
          editable from this surface.
        </p>
      </div>

      <Card className="border-brand-rule bg-brand-card p-4">
        <div className="flex items-start gap-3 text-xs text-brand-muted-soft">
          <KeyRound className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="mb-1">
              <span className="text-brand-ink font-medium">Permission resolution:</span>{" "}
              Default-deny. A user can only perform an action if an applicable
              role grants the matching <code className="font-mono text-[11px] bg-brand-cream px-1 rounded">resource:action</code> pair.
            </p>
            <p>
              Critical administrative actions (e.g. role delegation, ownership
              transfer) are additionally guarded by Better Auth and by
              last-owner checks in the workspace server actions.
            </p>
          </div>
        </div>
      </Card>

      <Tabs defaultValue={roles[0]?.id} className="w-full">
        <TabsList className="bg-brand-cream border border-brand-rule flex-wrap h-auto">
          {roles.map((r) => (
            <TabsTrigger key={r.id} value={r.id} className="text-xs">
              {r.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {roles.map((r) => (
          <TabsContent key={r.id} value={r.id} className="mt-4 space-y-4">
            <RolePermissionGrid role={r} resources={sortedResources} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

function RolePermissionGrid({
  role,
  resources,
}: {
  role: RoleEntry
  resources: ResourceEntry[]
}) {
  const granted = new Set<string>()
  for (const [res, actions] of Object.entries(role.permissions)) {
    for (const a of actions) granted.add(`${res}.${a}`)
  }

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
            {Object.values(role.permissions).reduce(
              (n, arr) => n + arr.length,
              0,
            )}{" "}
            grants
          </Badge>
          <span className="text-[10px] font-mono text-brand-muted-soft">
            role = &quot;{role.id}&quot;
          </span>
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
                Granted actions
              </th>
            </tr>
          </thead>
          <tbody>
            {resources.map((r, i) => {
              const grantedActions = (role.permissions[r.resource] ?? []).slice().sort()
              return (
                <tr
                  key={r.resource}
                  className={
                    i % 2 === 0
                      ? "bg-white"
                      : "bg-brand-cream/40"
                  }
                >
                  <td className="px-3 py-2 align-top font-mono text-xs text-brand-ink-soft">
                    {r.resource}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {grantedActions.length === 0 ? (
                      <span className="text-xs text-brand-muted-soft">
                        — none
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {grantedActions.map((a) => (
                          <Badge
                            key={a}
                            className="bg-brand-accent-tint text-brand-accent border-0 text-[10px] font-mono"
                          >
                            {a}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-brand-muted-soft">
        Effective access for this role. The role is assigned to a workspace
        member via <code className="font-mono text-[10px] bg-brand-cream px-1 rounded">organization.updateMemberRole</code>{" "}
        and is enforced by the server on every protected action.
      </p>
    </Card>
  )
}
