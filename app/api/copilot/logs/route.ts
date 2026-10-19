import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/dal"
import { getRecentCopilotLogs } from "@/lib/copilot/db-init"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tenantId = session.session.activeOrganizationId
    if (!tenantId) {
      return NextResponse.json({ error: "No active workspace" }, { status: 400 })
    }

    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get("limit") || "40", 10)

    const logs = await getRecentCopilotLogs(tenantId, limit)
    return NextResponse.json({ logs })
  } catch (error: any) {
    console.error("[COPILOT-LOGS-GET] Error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to fetch copilot logs" },
      { status: 500 }
    )
  }
}
