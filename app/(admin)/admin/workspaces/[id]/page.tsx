/**
 * /admin/workspaces/[id] — dedicated full page for one workspace.
 *
 * Replaces the previous tiny Sheet drawer in the WorkspacesTable with
 * a real page that has: overview, TMS stats, members, activity,
 * settings, an actions toolbar, and a danger zone.
 */
import { notFound } from "next/navigation"
import { getEnrichedOrgById, getOrgStats, requireAdmin } from "@/lib/dal"
import { WorkspaceDetailPage } from "./workspace-detail-page"

// Detail pages run data fetches at render time, so they must not be
// prerendered (the (admin) layout already calls `getSession` which
// is also non-prerenderable).
export const instant = false

export default async function AdminWorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  console.log(`[ADMIN-WORKSPACE-DETAIL-PAGE] rendering`)
  const { id } = await params
  await requireAdmin()
  const [org, stats] = await Promise.all([
    getEnrichedOrgById(id),
    getOrgStats(id),
  ])
  if (!org) {
    console.log(`[ADMIN-WORKSPACE-DETAIL-PAGE] 404 org ${id} not found`)
    notFound()
  }

  return (
    <WorkspaceDetailPage
      org={{
        ...org,
        createdAt: new Date(org.createdAt).toISOString(),
        suspendedAt: org.suspendedAt
          ? new Date(org.suspendedAt).toISOString()
          : null,
        logo: org.logo ?? null,
        metadata: org.metadata ?? null,
        suspendedReason: org.suspendedReason ?? null,
        suspendedBy: org.suspendedBy ?? null,
      }}
      initialStats={{
        ...stats,
        lastActivityAt: stats.lastActivityAt
          ? new Date(stats.lastActivityAt as any).toISOString()
          : null,
      }}
    />
  )
}
