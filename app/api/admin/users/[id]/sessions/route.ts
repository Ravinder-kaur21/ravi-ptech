import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { and, eq, gte, desc } from "drizzle-orm"
import { session, user } from "@/lib/schema"
import { requireAdmin } from "@/lib/dal"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { recordAuditEvent } from "@/lib/audit"

/**
 * GET /api/admin/users/[id]/sessions
 *   Returns every non-expired session for the target user. Marks the
 *   session whose token matches the requesting admin's cookie as
 *   `isCurrent` so the UI can disable revoking yourself.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }
  const { id: targetId } = await params

  const rows = await db
    .select({
      id: session.id,
      token: session.token,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    })
    .from(session)
    .where(and(eq(session.userId, targetId), gte(session.expiresAt, new Date())))
    .orderBy(desc(session.createdAt))

  // The requesting admin's current session id (from Better Auth headers).
  // We mark anything matching as isCurrent so the UI can show "this session".
  let currentSessionId: string | null = null
  try {
    const h = await headers()
    const current = await auth.api.getSession({ headers: h })
    currentSessionId = current?.session?.id ?? null
  } catch {
    // ignore
  }

  return NextResponse.json({
    sessions: rows.map((r) => ({
      id: r.id,
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      isCurrent: r.id === currentSessionId && admin.userId === targetId,
    })),
  })
}

const deleteSchema = z.union([
  z.object({ sessionId: z.string().min(1) }),
  z.object({ all: z.literal(true) }),
])

/**
 * DELETE /api/admin/users/[id]/sessions
 *   Body: { sessionId: string } OR { all: true }
 *   Revokes a single session or every active session for the user.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }
  const { id: targetId } = await params

  const raw = await req.json().catch(() => null)
  const parsed = deleteSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const target = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, targetId))
    .limit(1)
  const targetEmail = target[0]?.email ?? null

  if ("all" in parsed.data) {
    try {
      await auth.api.revokeUserSessions({
        body: { userId: targetId },
        headers: await headers(),
      })
    } catch (err) {
      console.warn("[API/ADMIN-USER-SESSIONS] revoke all failed:", err)
    }
    await recordAuditEvent({
      actor: { id: admin.userId, email: admin.userEmail },
      action: "session.revoke-all",
      target: { type: "user", id: targetId, label: targetEmail },
    })
    return NextResponse.json({ ok: true, revoked: "all" })
  }

  try {
    await auth.api.revokeSession({
      body: { token: parsed.data.sessionId },
      headers: await headers(),
    })
  } catch (err) {
    console.warn("[API/ADMIN-USER-SESSIONS] revoke one failed:", err)
  }
  await recordAuditEvent({
    actor: { id: admin.userId, email: admin.userEmail },
    action: "session.revoke",
    target: { type: "user", id: targetId, label: targetEmail },
    metadata: { sessionId: parsed.data.sessionId },
  })
  return NextResponse.json({ ok: true, revoked: parsed.data.sessionId })
}
