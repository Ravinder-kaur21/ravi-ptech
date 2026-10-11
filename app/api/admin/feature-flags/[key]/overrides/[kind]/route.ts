import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import {
  featureFlag,
  userFeatureFlag,
  orgFeatureFlag,
} from "@/lib/schema"
import { and, eq } from "drizzle-orm"
import { requireAdmin } from "@/lib/dal"
import { recordAuditEvent } from "@/lib/audit"

const bodySchema = z.object({
  targetId: z.string().min(1),
  value: z.string().max(500),
})

/**
 * POST /api/admin/feature-flags/[key]/overrides/[kind]
 *   kind: "user" | "org"
 *   body: { targetId, value }
 *   Creates (or updates) a per-user / per-org override.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ key: string; kind: string }> }
) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }
  const { key, kind } = await params
  if (kind !== "user" && kind !== "org") {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 })
  }

  const raw = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  // Make sure the flag exists
  const [flag] = await db
    .select()
    .from(featureFlag)
    .where(eq(featureFlag.key, key))
    .limit(1)
  if (!flag) return NextResponse.json({ error: "Flag not found" }, { status: 404 })

  try {
    if (kind === "user") {
      await db
        .insert(userFeatureFlag)
        .values({
          featureFlagKey: key,
          userId: parsed.data.targetId,
          value: parsed.data.value,
          createdBy: admin.userId,
        })
        .onConflictDoUpdate({
          target: [userFeatureFlag.featureFlagKey, userFeatureFlag.userId],
          set: { value: parsed.data.value },
        })
    } else {
      await db
        .insert(orgFeatureFlag)
        .values({
          featureFlagKey: key,
          organizationId: parsed.data.targetId,
          value: parsed.data.value,
          createdBy: admin.userId,
        })
        .onConflictDoUpdate({
          target: [orgFeatureFlag.featureFlagKey, orgFeatureFlag.organizationId],
          set: { value: parsed.data.value },
        })
    }

    await recordAuditEvent({
      actor: { id: admin.userId, email: admin.userEmail },
      action: "feature-flag.update",
      target: { type: "feature-flag", id: key, label: flag.name },
      metadata: {
        change: `${kind}_override.${parsed.data.value}`,
        targetId: parsed.data.targetId,
      },
    })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    if (err?.code === "23503") {
      return NextResponse.json(
        { error: `That ${kind} doesn't exist.` },
        { status: 404 }
      )
    }
    throw err
  }
}
