import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { ipAllowlist } from "@/lib/schema"
import { desc } from "drizzle-orm"
import { requireAdmin } from "@/lib/dal"
import { recordAuditEvent } from "@/lib/audit"

/** Simple CIDR/IP validator. We accept either a single v4 IP or a
 *  v4 CIDR. We don't try to be exhaustive — the server-side check
 *  (lib/security.ts) does the actual range match. */
const cidrSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine(
    (v) =>
      /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(v) &&
      v.split("/")[0]!.split(".").every((o) => {
        const n = Number(o)
        return n >= 0 && n <= 255
      }) &&
      (() => {
        const m = v.match(/\/(\d{1,2})$/)
        return !m || (Number(m[1]) >= 0 && Number(m[1]) <= 32)
      })(),
    "Must be a valid IPv4 or CIDR (e.g. 203.0.113.5 or 203.0.113.0/24)"
  )

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }
  const entries = await db
    .select()
    .from(ipAllowlist)
    .orderBy(desc(ipAllowlist.createdAt))
  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      cidr: e.cidr,
      label: e.label,
      expiresAt: e.expiresAt?.toISOString() ?? null,
      createdBy: e.createdBy,
      createdAt: e.createdAt.toISOString(),
    })),
    enabled: entries.length > 0,
  })
}

const bodySchema = z.object({
  cidr: cidrSchema,
  label: z.string().max(120).nullable().optional(),
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
      .insert(ipAllowlist)
      .values({
        cidr: parsed.data.cidr,
        label: parsed.data.label ?? null,
        createdBy: admin.userId,
      })
      .returning()
    await recordAuditEvent({
      actor: { id: admin.userId, email: admin.userEmail },
      action: "system.maintenance",
      target: { type: "system", id: row.id, label: "ip_allowlist.add" },
      metadata: { cidr: parsed.data.cidr, label: parsed.data.label ?? null },
    })
    return NextResponse.json({ ok: true, id: row.id })
  } catch (err: any) {
    if (err?.code === "23505") {
      return NextResponse.json(
        { error: "That CIDR is already in the list." },
        { status: 409 }
      )
    }
    throw err
  }
}
