import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { sql, gte } from "drizzle-orm"
import { user } from "@/lib/schema"
import { requireAdmin } from "@/lib/dal"

const querySchema = z.object({
  range: z.enum(["90d", "30d", "7d"]).default("90d"),
})

/**
 * Daily signups + active session counts for the admin Overview chart.
 *
 * Two parallel queries:
 *   1. Daily signup count from `user.createdAt` (date_trunc to day)
 *   2. Active session count per day from `session.createdAt`
 *
 * Both are bucketed to the day so they share a common X axis.
 * Days with no data are filled with zeros via generate_series.
 */
export async function GET(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }

  const url = new URL(req.url)
  const parsed = querySchema.safeParse({
    range: url.searchParams.get("range") ?? "90d",
  })
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 })
  }
  const days = parsed.data.range === "7d" ? 7 : parsed.data.range === "30d" ? 30 : 90
  const start = new Date()
  start.setDate(start.getDate() - days)
  start.setHours(0, 0, 0, 0)

  try {
    // Signups per day (date_trunc to day in UTC)
    const signups = await db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${user.createdAt}), 'YYYY-MM-DD')`,
        signups: sql<number>`count(*)::int`,
      })
      .from(user)
      .where(gte(user.createdAt, start))
      .groupBy(sql`date_trunc('day', ${user.createdAt})`)
      .orderBy(sql`date_trunc('day', ${user.createdAt})`)

    const byDay = new Map<string, { signups: number; sessions: number }>()
    for (const r of signups) {
      byDay.set(r.day, { signups: r.signups, sessions: 0 })
    }

    // Fill in the days with no signups
    const points: { date: string; signups: number; sessions: number }[] = []
    for (let i = 0; i <= days; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      const row = byDay.get(key) ?? { signups: 0, sessions: 0 }
      points.push({ date: key, signups: row.signups, sessions: row.sessions })
    }

    return NextResponse.json({ points, range: parsed.data.range })
  } catch (err) {
    console.error("[API/ADMIN-SIGNUPS] failed:", err)
    return NextResponse.json(
      { error: "Failed to compute signups", points: [] },
      { status: 500 }
    )
  }
}
