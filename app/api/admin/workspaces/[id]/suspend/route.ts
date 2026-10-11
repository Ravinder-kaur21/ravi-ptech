/**
 * POST /api/admin/workspaces/[id]/suspend — platform admin suspends
 * or unsuspends a workspace. When suspended=true, every member of
 * the workspace sees the "workspace suspended" screen on their next
 * (dashboard) request.
 *
 * Body: `{ suspended: boolean, reason?: string }`
 */
import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin, getEnrichedOrgById } from "@/lib/dal"
import { setOrganizationSuspended } from "@/lib/cascade"

const suspendSchema = z.object({
  suspended: z.boolean(),
  reason: z.string().min(1).max(500).optional(),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("[API/ADMIN/WORKSPACE-SUSPEND] entry")
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const org = await getEnrichedOrgById(id)
    if (!org) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    const body = await req.json().catch(() => null)
    const parsed = suspendSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "Body must be { suspended: boolean, reason?: string (required when suspending) }",
        },
        { status: 400 }
      )
    }
    if (parsed.data.suspended && !parsed.data.reason) {
      return NextResponse.json(
        { error: "A reason is required when suspending a workspace." },
        { status: 400 }
      )
    }
    console.log(
      `[API/ADMIN/WORKSPACE-SUSPEND] actor=${admin.userEmail} org=${org.slug} suspended=${parsed.data.suspended} reason=${parsed.data.reason ?? "(none)"}`
    )
    await setOrganizationSuspended({
      organizationId: id,
      suspended: parsed.data.suspended,
      reason: parsed.data.reason,
      actor: { id: admin.userId, email: admin.userEmail },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error(`[API/ADMIN/WORKSPACE-SUSPEND] error: ${message}`)
    if ((err as any)?.code === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if ((err as any)?.code === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
