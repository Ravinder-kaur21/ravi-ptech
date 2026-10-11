import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { featureFlag } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { requireAdmin } from "@/lib/dal"
import { recordAuditEvent } from "@/lib/audit"

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  defaultValue: z.string().max(500).optional(),
  rolloutPercent: z.number().int().min(0).max(100).optional(),
})

/** PATCH /api/admin/feature-flags/[key] — update rollout / default / meta. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }
  const { key } = await params
  const raw = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updatedBy: admin.userId }
  if (parsed.data.name !== undefined) updates.name = parsed.data.name
  if (parsed.data.description !== undefined)
    updates.description = parsed.data.description
  if (parsed.data.defaultValue !== undefined)
    updates.defaultValue = parsed.data.defaultValue
  if (parsed.data.rolloutPercent !== undefined)
    updates.rolloutPercent = String(parsed.data.rolloutPercent)

  const [row] = await db
    .update(featureFlag)
    .set(updates)
    .where(eq(featureFlag.key, key))
    .returning()

  if (!row) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
  }

  await recordAuditEvent({
    actor: { id: admin.userId, email: admin.userEmail },
    action: "feature-flag.update",
    target: { type: "feature-flag", id: row.key, label: row.name },
    metadata: { change: "update", ...parsed.data },
  })

  return NextResponse.json({ ok: true })
}

/** DELETE /api/admin/feature-flags/[key] — remove the flag and its overrides. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }
  const { key } = await params

  const [row] = await db
    .delete(featureFlag)
    .where(eq(featureFlag.key, key))
    .returning()
  if (!row) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })

  await recordAuditEvent({
    actor: { id: admin.userId, email: admin.userEmail },
    action: "feature-flag.update",
    target: { type: "feature-flag", id: key, label: row.name },
    metadata: { change: "delete" },
  })

  return NextResponse.json({ ok: true })
}
