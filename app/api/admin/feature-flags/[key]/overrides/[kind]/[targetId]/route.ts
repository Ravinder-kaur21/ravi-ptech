import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { userFeatureFlag, orgFeatureFlag, featureFlag } from "@/lib/schema"
import { and, eq } from "drizzle-orm"
import { requireAdmin } from "@/lib/dal"
import { recordAuditEvent } from "@/lib/audit"

/**
 * DELETE /api/admin/feature-flags/[key]/overrides/[kind]?targetId=...
 *   Removes the override row.
 */
export async function DELETE(
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
  const url = new URL(req.url)
  const targetId = url.searchParams.get("targetId")
  if (!targetId) {
    return NextResponse.json({ error: "targetId required" }, { status: 400 })
  }
  if (kind !== "user" && kind !== "org") {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 })
  }

  const [flag] = await db
    .select()
    .from(featureFlag)
    .where(eq(featureFlag.key, key))
    .limit(1)
  if (!flag) return NextResponse.json({ error: "Flag not found" }, { status: 404 })

  if (kind === "user") {
    await db
      .delete(userFeatureFlag)
      .where(
        and(
          eq(userFeatureFlag.featureFlagKey, key),
          eq(userFeatureFlag.userId, targetId)
        )
      )
  } else {
    await db
      .delete(orgFeatureFlag)
      .where(
        and(
          eq(orgFeatureFlag.featureFlagKey, key),
          eq(orgFeatureFlag.organizationId, targetId)
        )
      )
  }

  await recordAuditEvent({
    actor: { id: admin.userId, email: admin.userEmail },
    action: "feature-flag.update",
    target: { type: "feature-flag", id: key, label: flag.name },
    metadata: { change: `${kind}_override.remove`, targetId },
  })
  return NextResponse.json({ ok: true })
}
