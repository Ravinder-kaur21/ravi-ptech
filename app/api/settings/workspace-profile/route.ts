import { NextResponse } from "next/server"
import { getWorkspaceProfile } from "@/lib/dal"
import { withTenant } from "@/lib/dal"

// [API/WORKSPACE-PROFILE] Phase 3 — WS-09.
// Returns the active workspace's full profile (name, slug, business
// type, regulatory IDs, contact, address, ops defaults). Gated by
// `workspace: ["read"]` (any signed-in member).

export const GET = withTenant(async (_req, { tenantId }) => {
  console.log("[API/WORKSPACE-PROFILE] tenantId=", tenantId)
  try {
    const profile = await getWorkspaceProfile(tenantId)
    console.log("[API/WORKSPACE-PROFILE] got profile:", profile ? "yes" : "null")
    if (!profile) {
      return NextResponse.json({ error: "WORKSPACE_NOT_FOUND" }, { status: 404 })
    }
    return NextResponse.json({ profile })
  } catch (err) {
    console.error("[API/WORKSPACE-PROFILE] threw:", err)
    return NextResponse.json(
      { error: "INTERNAL", message: (err as Error)?.message ?? "unknown" },
      { status: 500 },
    )
  }
})
