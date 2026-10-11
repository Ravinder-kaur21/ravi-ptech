import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { user } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/dal"

const bodySchema = z.object({
  message: z.string().min(20).max(2000),
})

/**
 * Submit an appeal against suspension. User must be signed in AND currently
 * suspended. Resets appeal state and stamps the submission.
 */
export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }
  const raw = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 }
    )
  }
  const rows = await db
    .select({
      id: user.id,
      suspendedAt: user.suspendedAt,
      suspendedUntil: user.suspendedUntil,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)
  const row = rows[0]
  if (!row?.suspendedAt) {
    return NextResponse.json(
      { error: "NOT_SUSPENDED" },
      { status: 400 }
    )
  }
  const suspendedUntil: Date | null = (row.suspendedUntil as Date | null) ?? null
  const stillSuspended =
    suspendedUntil === null || suspendedUntil > new Date()
  if (!stillSuspended) {
    return NextResponse.json(
      { error: "SUSPENSION_EXPIRED" },
      { status: 400 }
    )
  }

  console.log(
    "[API/ME-APPEAL] submitting appeal for",
    session.user.email
  )
  await db
    .update(user)
    .set({
      appealMessage: parsed.data.message,
      appealSubmittedAt: new Date(),
      appealStatus: "open",
      appealResolvedBy: null,
    })
    .where(eq(user.id, session.user.id))

  console.log("[API/ME-APPEAL] ✅ appeal submitted")
  return NextResponse.json({ ok: true })
}