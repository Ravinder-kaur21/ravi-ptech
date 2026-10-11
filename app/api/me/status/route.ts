import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { user } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/dal"

/**
 * Returns the current user's status for the login flow to decide where to
 * redirect. Shape:
 *   { suspended: boolean, banned: boolean, suspendedReason?: string,
 *     suspendedUntil?: string, role: string }
 */
export async function GET() {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
  const rows = await db
    .select({
      id: user.id,
      role: user.role,
      banned: user.banned,
      suspendedAt: user.suspendedAt,
      suspendedUntil: user.suspendedUntil,
      suspendedReason: user.suspendedReason,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)
  const row = rows[0]
  if (!row) return NextResponse.json({ authenticated: false }, { status: 404 })

  const now = new Date()
  const suspendedUntil: Date | null = row.suspendedUntil ?? null
  const isSuspended =
    row.suspendedAt !== null &&
    (suspendedUntil === null || suspendedUntil > now)

  return NextResponse.json({
    authenticated: true,
    userId: row.id,
    role: row.role,
    banned: !!row.banned,
    suspended: isSuspended,
    suspendedReason: isSuspended ? row.suspendedReason : null,
    suspendedUntil: isSuspended
      ? suspendedUntil
        ? (suspendedUntil as Date).toISOString()
        : null
      : null,
  })
}