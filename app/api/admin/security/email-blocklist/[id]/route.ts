import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { emailBlocklist } from "@/lib/schema"
import { requireAdmin } from "@/lib/dal"
import { recordAuditEvent } from "@/lib/audit"

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
  const [existing] = await db
    .select()
    .from(emailBlocklist)
    .where(eq(emailBlocklist.id, id))
    .limit(1)
  if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
  await db.delete(emailBlocklist).where(eq(emailBlocklist.id, id))
  await recordAuditEvent({
    actor: { id: admin.userId, email: admin.userEmail },
    action: "system.maintenance",
    target: { type: "system", id, label: "email_blocklist.remove" },
    metadata: { pattern: existing.pattern },
  })
  return NextResponse.json({ ok: true })
}
