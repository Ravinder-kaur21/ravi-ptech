import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { announcement } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { requireAdmin } from "@/lib/dal"
import { recordAuditEvent } from "@/lib/audit"

const patchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  body: z.string().min(1).max(500).optional(),
  kind: z.enum(["info", "warn", "success", "maintenance"]).optional(),
  scope: z.enum(["global", "admins_only"]).optional(),
  dismissible: z.boolean().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }
  const { id } = await params
  const raw = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }
  const updates: Record<string, unknown> = {}
  if (parsed.data.title !== undefined) updates.title = parsed.data.title
  if (parsed.data.body !== undefined) updates.body = parsed.data.body
  if (parsed.data.kind !== undefined) updates.kind = parsed.data.kind
  if (parsed.data.scope !== undefined) updates.scope = parsed.data.scope
  if (parsed.data.dismissible !== undefined) updates.dismissible = parsed.data.dismissible
  if (parsed.data.startsAt !== undefined)
    updates.startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : null
  if (parsed.data.endsAt !== undefined)
    updates.endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null

  const [row] = await db
    .update(announcement)
    .set(updates)
    .where(eq(announcement.id, id))
    .returning()
  if (!row) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })

  await recordAuditEvent({
    actor: { id: admin.userId, email: admin.userEmail },
    action: "system.announcement",
    target: { type: "system", id, label: row.title },
    metadata: { change: "update", ...parsed.data },
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }
  const { id } = await params
  const [row] = await db
    .delete(announcement)
    .where(eq(announcement.id, id))
    .returning()
  if (!row) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
  await recordAuditEvent({
    actor: { id: admin.userId, email: admin.userEmail },
    action: "system.announcement",
    target: { type: "system", id, label: row.title },
    metadata: { change: "delete" },
  })
  return NextResponse.json({ ok: true })
}
