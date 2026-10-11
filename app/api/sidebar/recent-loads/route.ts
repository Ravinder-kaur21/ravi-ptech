import { NextResponse } from "next/server"
import { withTenant, getLoadsForOrg } from "@/lib/dal"

// [API/SIDEBAR-RECENT] Top 10 loads for the sidebar pinned + recent list.
// The org is derived from the session by withTenant(), never from a query
// param — a client-supplied orgId would let one tenant read another's loads.
export const GET = withTenant(async (_req: Request, { tenantId }) => {
  try {
    const recent = await getLoadsForOrg(tenantId)
    return NextResponse.json(
      recent.slice(0, 10).map((l) => ({
        id: l.id,
        loadNumber: l.loadNumber,
        originCity: l.originCity,
        originState: l.originState,
        destCity: l.destCity,
        destState: l.destState,
        status: l.status,
        isStarred: l.isStarred ?? false,
        updatedAt: l.updatedAt,
      }))
    )
  } catch (err) {
    console.error("[API/SIDEBAR-RECENT] query failed:", err)
    return NextResponse.json({ error: "Failed to load recent loads" }, { status: 500 })
  }
})