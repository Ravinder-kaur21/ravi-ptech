/**
 * POST /api/admin/users/[id]/remove — hard-delete a user.
 *
 * The destructive endpoint. Body: `{ confirm: "DELETE" }`. The
 * confirmation string prevents accidental deletion from a stray
 * Enter press.
 *
 * The cascade library (lib/cascade.ts) does all the work:
 *   - owned orgs (and their TMS data via FK cascade) are deleted
 *   - audit_log and email_broadcast FK references are anonymized
 *   - driver profiles are detached
 *   - then Better Auth's removeUser sweeps session+account+user
 *     (and the FK cascade on member/invitation/user_feature_flag)
 */
import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/dal"
import { cascadeDeleteUser } from "@/lib/cascade"

const removeSchema = z.object({
  confirm: z.literal("DELETE"),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("[API/ADMIN/USER-REMOVE] entry")
  try {
    const admin = await requireAdmin()
    const { id } = await params

    // [API/ADMIN/USER-REMOVE] Self-delete protection (mirrors Better Auth's)
    if (id === admin.userId) {
      console.warn(
        `[API/ADMIN/USER-REMOVE] admin ${admin.userEmail} tried to remove themselves`
      )
      return NextResponse.json(
        { error: "You cannot remove your own account." },
        { status: 400 }
      )
    }

    const body = await req.json().catch(() => null)
    const parsed = removeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Body must be { "confirm": "DELETE" }' },
        { status: 400 }
      )
    }

    console.log(
      `[API/ADMIN/USER-REMOVE] actor=${admin.userEmail} target=${id} confirm=DELETE`
    )
    const result = await cascadeDeleteUser({
      userId: id,
      actor: { id: admin.userId, email: admin.userEmail },
    })
    console.log(`[API/ADMIN/USER-REMOVE] ✅ done`, result)
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error(`[API/ADMIN/USER-REMOVE] error: ${message}`)
    if ((err as any)?.code === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if ((err as any)?.code === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
