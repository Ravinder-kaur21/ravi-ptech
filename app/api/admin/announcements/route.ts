import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { announcement, organization } from "@/lib/schema"
import { desc, eq } from "drizzle-orm"
import { requireAdmin } from "@/lib/dal"
import { recordAuditEvent } from "@/lib/audit"

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }
  const rows = await db
    .select({
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      kind: announcement.kind,
      scope: announcement.scope,
      organizationId: announcement.organizationId,
      dismissible: announcement.dismissible,
      startsAt: announcement.startsAt,
      endsAt: announcement.endsAt,
      createdAt: announcement.createdAt,
    })
    .from(announcement)
    .orderBy(desc(announcement.createdAt))
    .limit(200)

  // Attach org names for org-scoped rows
  const orgIds = rows.map((r) => r.organizationId).filter(Boolean) as string[]
  let orgNameById: Record<string, string> = {}
  if (orgIds.length > 0) {
    const orgs = await db
      .select({ id: organization.id, name: organization.name })
      .from(organization)
      .where(eq(organization.id, orgIds[0]!))
    orgNameById = Object.fromEntries(orgs.map((o) => [o.id, o.name]))
  }

  const now = new Date()
  return NextResponse.json({
    announcements: rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      kind: r.kind,
      scope: r.scope,
      organizationId: r.organizationId,
      organizationName: r.organizationId ? orgNameById[r.organizationId] ?? null : null,
      dismissible: r.dismissible,
      startsAt: r.startsAt?.toISOString() ?? null,
      endsAt: r.endsAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      active:
        (!r.startsAt || r.startsAt <= now) && (!r.endsAt || r.endsAt >= now),
    })),
  })
}

const createSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(500),
  kind: z.enum(["info", "warn", "success", "maintenance"]),
  scope: z.enum(["global", "admins_only"]),
  dismissible: z.boolean().default(true),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
})

export async function POST(req: Request) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }
  const raw = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const [row] = await db
    .insert(announcement)
    .values({
      title: parsed.data.title,
      body: parsed.data.body,
      kind: parsed.data.kind,
      scope: parsed.data.scope,
      dismissible: parsed.data.dismissible,
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      createdBy: admin.userId,
    })
    .returning()

  await recordAuditEvent({
    actor: { id: admin.userId, email: admin.userEmail },
    action: "system.announcement",
    target: { type: "system", id: row.id, label: row.title },
    metadata: { change: "create", kind: row.kind, scope: row.scope },
  })
  return NextResponse.json({ ok: true, id: row.id })
}
