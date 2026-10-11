/**
 * GET /api/admin/workspaces/[id] — single org with member count + status.
 * DELETE /api/admin/workspaces/[id] — hard-delete an org.
 *
 * The DELETE requires a `{ confirm: orgName }` body that must
 * match the org name exactly — same typed-confirmation pattern as
 * the user remove endpoint. Cascade via lib/cascade.ts sweeps every
 * TMS table via the existing FK cascade.
 */
import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin, getEnrichedOrgById, getOrgStats } from "@/lib/dal"
import { cascadeDeleteOrganization } from "@/lib/cascade"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("[API/ADMIN/WORKSPACE-GET] entry")
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const [org, stats] = await Promise.all([
      getEnrichedOrgById(id),
      getOrgStats(id),
    ])
    if (!org) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    console.log(
      `[API/ADMIN/WORKSPACE-GET] actor=${admin.userEmail} org=${org.slug}`
    )
    return NextResponse.json({ org, stats })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error(`[API/ADMIN/WORKSPACE-GET] error: ${message}`)
    if ((err as any)?.code === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if ((err as any)?.code === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

const deleteSchema = z.object({
  confirm: z.string().min(1),
})

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("[API/ADMIN/WORKSPACE-DELETE] entry")
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const org = await getEnrichedOrgById(id)
    if (!org) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    const body = await req.json().catch(() => null)
    const parsed = deleteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Body must be { confirm: <org-name> }" },
        { status: 400 }
      )
    }
    if (parsed.data.confirm !== org.name) {
      return NextResponse.json(
        { error: `Confirmation must match the org name exactly: "${org.name}"` },
        { status: 400 }
      )
    }
    console.log(
      `[API/ADMIN/WORKSPACE-DELETE] actor=${admin.userEmail} org=${org.slug} confirm="${parsed.data.confirm}"`
    )
    // Use Better Auth's server-side delete so the call goes through
    // any internal hooks it has, then sweep any FK-restricted cleanup
    // via the cascade library.
    const h = await headers()
    await auth.api.deleteOrganization({
      headers: h,
      body: { organizationId: id },
    })
    // The Better Auth call may have failed silently if the caller
    // isn't a member of the org. Use our cascade as the source of
    // truth and write the audit.
    const result = await cascadeDeleteOrganization(id, {
      id: admin.userId,
      email: admin.userEmail,
    })
    console.log(`[API/ADMIN/WORKSPACE-DELETE] ✅ deleted ${org.name}`, result)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error(`[API/ADMIN/WORKSPACE-DELETE] error: ${message}`)
    if ((err as any)?.code === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if ((err as any)?.code === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
