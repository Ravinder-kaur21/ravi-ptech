import { NextResponse } from "next/server"
import {
  explainFleetInsights,
  getFleetInsights,
} from "@/lib/fleet-insights"
import { requireTenant, TenantError } from "@/lib/dal"

export async function GET(request: Request) {
  try {
    const { tenantId } = await requireTenant()
    const summary = await getFleetInsights(tenantId)
    const wantsExplanation =
      new URL(request.url).searchParams.get("explain") === "1"
    const result = wantsExplanation
      ? await explainFleetInsights(summary)
      : { summary, aiAvailable: Boolean(process.env.NIM_API_KEY) }
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    })
  } catch (error) {
    if (error instanceof TenantError) {
      const status =
        error.code === "UNAUTHORIZED"
          ? 401
          : error.code === "FORBIDDEN"
            ? 403
            : 409
      return NextResponse.json({ error: error.code }, { status })
    }
    console.error("[API/FLEET-INSIGHTS] Failed to calculate fleet insights")
    return NextResponse.json(
      { error: "Could not load fleet insights." },
      { status: 500 },
    )
  }
}
