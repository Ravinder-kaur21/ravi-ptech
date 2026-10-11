import { NextResponse } from "next/server"
import { z } from "zod"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { requireAdmin } from "@/lib/dal"
import { recordAuditEvent } from "@/lib/audit"

/**
 * POST /api/admin/view-as-workspace
 *   Body: { organizationId: string }
 *   Sets the platform admin's `activeOrganizationId` on their
 *   session, so they can switch into a workspace context without
 *   losing the platform-admin flag. Inverse of impersonation.
 */
const bodySchema = z.object({
  organizationId: z.string().min(1),
})

export async function POST(req: Request) {
  console.log("[API/ADMIN-VIEW-AS-WORKSPACE] POST")
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
  try {
    await auth.api.setActiveOrganization({
      body: { organizationId: parsed.data.organizationId },
      headers: await headers(),
    })
    await recordAuditEvent({
      actor: { id: admin.userId, email: admin.userEmail },
      action: "user.set-role",
      target: {
        type: "org",
        id: parsed.data.organizationId,
        label: "view_as_workspace",
      },
      metadata: { change: "view_as_workspace" },
    })
    console.log(
      `[API/ADMIN-VIEW-AS-WORKSPACE] ✅ ${admin.userEmail} → ${parsed.data.organizationId}`
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(
      "[API/ADMIN-VIEW-AS-WORKSPACE] setActiveOrganization failed:",
      err
    )
    return NextResponse.json(
      { error: "Failed to switch active organization" },
      { status: 500 }
    )
  }
}
