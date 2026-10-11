import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { emailAllowlist } from "@/lib/schema"
import { desc } from "drizzle-orm"
import { requireAdmin } from "@/lib/dal"
import { recordAuditEvent } from "@/lib/audit"

/** Accepts an exact email "user@x.com" or a domain wildcard "*@x.com". */
const patternSchema = z
  .string()
  .trim()
  .min(3)
  .max(254)
  .refine(
    (v) =>
      // exact email
      /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ||
      // domain wildcard
      /^\*@[^@\s]+\.[^@\s]+$/.test(v),
    "Use an email (user@x.com) or a wildcard (*@x.com)."
  )

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }
  const entries = await db
    .select()
    .from(emailAllowlist)
    .orderBy(desc(emailAllowlist.createdAt))
  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      pattern: e.pattern,
      reason: e.reason,
      createdAt: e.createdAt.toISOString(),
    })),
  })
}

const bodySchema = z.object({
  pattern: patternSchema,
  reason: z.string().max(280).nullable().optional(),
})

export async function POST(req: Request) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }
  const raw = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid" },
      { status: 400 }
    )
  }
  try {
    const [row] = await db
      .insert(emailAllowlist)
      .values({
        pattern: parsed.data.pattern.toLowerCase(),
        reason: parsed.data.reason ?? null,
        createdBy: admin.userId,
      })
      .returning()
    await recordAuditEvent({
      actor: { id: admin.userId, email: admin.userEmail },
      action: "system.maintenance",
      target: { type: "system", id: row.id, label: "email_allowlist.add" },
      metadata: { pattern: parsed.data.pattern, reason: parsed.data.reason ?? null },
    })
    return NextResponse.json({ ok: true, id: row.id })
  } catch (err: any) {
    if (err?.code === "23505") {
      return NextResponse.json({ error: "That pattern is already in the list." }, { status: 409 })
    }
    throw err
  }
}
