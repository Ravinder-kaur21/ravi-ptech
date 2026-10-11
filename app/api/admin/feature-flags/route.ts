import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { featureFlag, userFeatureFlag, orgFeatureFlag, user, organization } from "@/lib/schema"
import { eq, inArray, asc } from "drizzle-orm"
import { requireAdmin } from "@/lib/dal"
import { recordAuditEvent } from "@/lib/audit"

/** GET /api/admin/feature-flags — list all flags with their overrides. */
export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }

  const flags = await db
    .select()
    .from(featureFlag)
    .orderBy(asc(featureFlag.key))

  if (flags.length === 0) return NextResponse.json({ flags: [] })

  const keys = flags.map((f) => f.key)

  const [userOverrides, orgOverrides] = await Promise.all([
    db
      .select({
        featureFlagKey: userFeatureFlag.featureFlagKey,
        userId: userFeatureFlag.userId,
        value: userFeatureFlag.value,
        email: user.email,
      })
      .from(userFeatureFlag)
      .innerJoin(user, eq(user.id, userFeatureFlag.userId))
      .where(inArray(userFeatureFlag.featureFlagKey, keys)),
    db
      .select({
        featureFlagKey: orgFeatureFlag.featureFlagKey,
        organizationId: orgFeatureFlag.organizationId,
        value: orgFeatureFlag.value,
        name: organization.name,
      })
      .from(orgFeatureFlag)
      .innerJoin(organization, eq(organization.id, orgFeatureFlag.organizationId))
      .where(inArray(orgFeatureFlag.featureFlagKey, keys)),
  ])

  return NextResponse.json({
    flags: flags.map((f) => ({
      key: f.key,
      name: f.name,
      description: f.description,
      kind: f.kind,
      defaultValue: f.defaultValue,
      rolloutPercent: Number(f.rolloutPercent),
      userOverrides: userOverrides
        .filter((u) => u.featureFlagKey === f.key)
        .map((u) => ({ userId: u.userId, userEmail: u.email, value: u.value })),
      orgOverrides: orgOverrides
        .filter((o) => o.featureFlagKey === f.key)
        .map((o) => ({ orgId: o.organizationId, orgName: o.name, value: o.value })),
      updatedAt: f.updatedAt.toISOString(),
    })),
  })
}

const createSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_]+$/, "snake_case only (a-z, 0-9, _)"),
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
  kind: z.enum(["boolean", "string", "number"]),
  defaultValue: z.string().max(500),
  rolloutPercent: z.number().int().min(0).max(100),
})

/** POST /api/admin/feature-flags — create a new flag. */
export async function POST(req: Request) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }
  const raw = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid" },
      { status: 400 }
    )
  }
  try {
    const [row] = await db
      .insert(featureFlag)
      .values({
        key: parsed.data.key,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        kind: parsed.data.kind,
        defaultValue: parsed.data.defaultValue,
        rolloutPercent: String(parsed.data.rolloutPercent),
        updatedBy: admin.userId,
      })
      .returning()
    await recordAuditEvent({
      actor: { id: admin.userId, email: admin.userEmail },
      action: "feature-flag.update",
      target: { type: "feature-flag", id: row.key, label: row.name },
      metadata: { change: "create", ...parsed.data },
    })
    return NextResponse.json({ ok: true, key: row.key })
  } catch (err: any) {
    if (err?.code === "23505") {
      return NextResponse.json(
        { error: "A flag with that key already exists." },
        { status: 409 }
      )
    }
    throw err
  }
}
