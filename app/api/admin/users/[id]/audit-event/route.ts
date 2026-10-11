import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"
import { user } from "@/lib/schema"
import { requireAdmin } from "@/lib/dal"
import { recordAuditEvent, type AuditAction } from "@/lib/audit"

/**
 * Companion endpoint for client-driven Better Auth admin calls.
 *
 * Some actions (ban, unban, impersonate, remove user) are dispatched
 * through authClient.admin.* which calls Better Auth's REST endpoints
 * directly. To capture them in the audit log, the client fires this
 * endpoint right after the Better Auth call succeeds.
 *
 * The endpoint is fail-soft: if the user row is missing or the audit
 * write fails, we still 200 — the admin action has already happened.
 */
const bodySchema = z.object({
  action: z.enum([
    "user.ban",
    "user.unban",
    "user.impersonate",
    "user.remove",
    "org.delete",
  ]),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetId } = await params
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }

  const raw = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  const target = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, targetId))
    .limit(1)
  const targetEmail = target[0]?.email ?? null

  await recordAuditEvent({
    actor: { id: admin.userId, email: admin.userEmail },
    action: parsed.data.action as AuditAction,
    target: {
      type:
        parsed.data.action === "org.delete"
          ? "org"
          : parsed.data.action === "user.impersonate"
            ? "user"
            : "user",
      id: targetId,
      label: targetEmail,
    },
    metadata: parsed.data.metadata,
  })

  return NextResponse.json({ ok: true })
}
