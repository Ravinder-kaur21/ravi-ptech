import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { and, eq, desc } from "drizzle-orm"
import { systemSetting, user } from "@/lib/schema"
import { requireAdmin } from "@/lib/dal"
import { recordAuditEvent } from "@/lib/audit"

const MAINTENANCE_KEY = "maintenance"
const MAINTENANCE_DEFAULT = { enabled: false, message: null as string | null }

/** GET /api/admin/security/maintenance — current maintenance state. */
export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }
  const [row] = await db
    .select()
    .from(systemSetting)
    .where(eq(systemSetting.key, MAINTENANCE_KEY))
    .orderBy(desc(systemSetting.updatedAt))
    .limit(1)

  const value = (row?.value as any) ?? MAINTENANCE_DEFAULT
  return NextResponse.json({
    enabled: !!value?.enabled,
    message: value?.message ?? null,
    startedAt: value?.startedAt ?? null,
    startedByEmail: value?.startedByEmail ?? null,
    endsAt: value?.endsAt ?? null,
  })
}

const bodySchema = z.object({
  enabled: z.boolean(),
  message: z.string().max(500).optional(),
})

/** POST /api/admin/security/maintenance — flip the toggle. */
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
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const value = parsed.data.enabled
    ? {
        enabled: true,
        message: parsed.data.message ?? null,
        startedAt: new Date().toISOString(),
        startedByEmail: admin.userEmail,
        endsAt: null,
      }
    : { enabled: false, message: null, startedAt: null, startedByEmail: null, endsAt: null }

  await db.insert(systemSetting).values({
    key: MAINTENANCE_KEY,
    value,
    updatedBy: admin.userId,
  })

  await recordAuditEvent({
    actor: { id: admin.userId, email: admin.userEmail },
    action: "system.maintenance",
    target: { type: "system", id: null, label: "maintenance_mode" },
    metadata: { enabled: parsed.data.enabled, message: parsed.data.message ?? null },
  })

  return NextResponse.json({ ok: true, ...value })
}
