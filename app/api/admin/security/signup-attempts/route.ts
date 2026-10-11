import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { signupAttempt } from "@/lib/schema"
import { desc, eq, gte, sql, and } from "drizzle-orm"
import { requireAdmin } from "@/lib/dal"

/**
 * Brute-force dashboard data. Returns:
 *   - the 100 most recent signup attempts (success or failure)
 *   - top attacking IPs in the last 24h
 *   - failed count in the last hour / 24h
 */
export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [recent, topOffenders, failedLastHour, failedLastDay] = await Promise.all([
    db
      .select({
        id: signupAttempt.id,
        email: signupAttempt.email,
        ipAddress: signupAttempt.ipAddress,
        success: signupAttempt.success,
        reason: signupAttempt.reason,
        createdAt: signupAttempt.createdAt,
      })
      .from(signupAttempt)
      .orderBy(desc(signupAttempt.createdAt))
      .limit(100),
    db
      .select({
        ipAddress: signupAttempt.ipAddress,
        count: sql<number>`count(*)::int`,
      })
      .from(signupAttempt)
      .where(
        and(
          eq(signupAttempt.success, false),
          gte(signupAttempt.createdAt, oneDayAgo),
          sql`${signupAttempt.ipAddress} IS NOT NULL`
        )
      )
      .groupBy(signupAttempt.ipAddress)
      .orderBy(sql`count(*) desc`)
      .limit(10),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(signupAttempt)
      .where(
        and(
          eq(signupAttempt.success, false),
          gte(signupAttempt.createdAt, oneHourAgo)
        )
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(signupAttempt)
      .where(
        and(
          eq(signupAttempt.success, false),
          gte(signupAttempt.createdAt, oneDayAgo)
        )
      ),
  ])

  return NextResponse.json({
    recent: recent.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    topOffenders,
    failedLastHour: Number(failedLastHour[0]?.count ?? 0),
    failedLastDay: Number(failedLastDay[0]?.count ?? 0),
  })
}
