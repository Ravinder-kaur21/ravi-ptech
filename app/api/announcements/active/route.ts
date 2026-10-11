import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { announcement } from "@/lib/schema"
import { and, eq, isNull, or, lte, gte, sql } from "drizzle-orm"
import { getSession } from "@/lib/dal"
import { cache } from "react"

/**
 * GET /api/announcements/active
 *   Returns the currently-visible in-app banners for the requesting
 *   user. Visible = scope matches AND (no startsAt OR startsAt <= now)
 *   AND (no endsAt OR endsAt >= now).
 *
 * - scope="global"   → returned to everyone
 * - scope="org"      → only returned if the user is a member of the org
 * - scope="admins_only" → only returned if user.role === 'admin'
 *
 * This endpoint is public (no admin gate) so the (dashboard) layout
 * can poll it. The DAL still runs getSession() so we know the user.
 */
export const GET = cache(async () => {
  const session = await getSession()
  const userId = session?.user?.id
  const isAdmin = userId
    ? (await db
        .select({ role: sql<string>`role` })
        .from((await import("@/lib/schema")).user)
        .where(eq((await import("@/lib/schema")).user.id, userId))
        .limit(1))[0]?.role === "admin"
    : false

  const now = new Date()

  // For non-admins we filter admins_only out at the SQL level so we
  // don't leak their existence.
  const visibilityOr = [
    eq(announcement.scope, "global"),
  ]
  if (isAdmin) {
    visibilityOr.push(eq(announcement.scope, "admins_only"))
  }

  // For org-scoped, we need the user's orgs. We can get that via
  // member.organizationId where member.userId = userId.
  if (userId) {
    const { member } = await import("@/lib/schema")
    const memberships = await db
      .select({ orgId: member.organizationId })
      .from(member)
      .where(eq(member.userId, userId))
    for (const m of memberships) {
      visibilityOr.push(
        and(eq(announcement.scope, "org"), eq(announcement.organizationId, m.orgId))!
      )
    }
  }

  const rows = await db
    .select({
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      kind: announcement.kind,
      scope: announcement.scope,
      dismissible: announcement.dismissible,
    })
    .from(announcement)
    .where(
      and(
        or(...visibilityOr)!,
        or(isNull(announcement.startsAt), lte(announcement.startsAt, now))!,
        or(isNull(announcement.endsAt), gte(announcement.endsAt, now))!
      )
    )
    .orderBy(announcement.createdAt)

  return NextResponse.json({
    announcements: rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      kind: r.kind,
      dismissible: r.dismissible,
      link: null,
      linkLabel: null,
    })),
  })
})
