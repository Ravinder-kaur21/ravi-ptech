import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { emailLog } from "@/lib/schema"
import { desc } from "drizzle-orm"
import { requireAdmin } from "@/lib/dal"

export async function GET(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }
  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "100"), 500)
  const rows = await db
    .select()
    .from(emailLog)
    .orderBy(desc(emailLog.sentAt))
    .limit(limit)
  return NextResponse.json({
    entries: rows.map((r) => ({
      id: r.id,
      to: r.to,
      subject: r.subject,
      kind: r.kind,
      success: r.success,
      error: r.error,
      sentAt: r.sentAt.toISOString(),
    })),
  })
}
