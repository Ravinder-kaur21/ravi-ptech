import { NextRequest, NextResponse } from "next/server"
import { tickOnce } from "@/lib/copilot/scheduled-runner"

export const runtime = "nodejs"

/**
 * GET /api/cron/copilot-tasks
 *
 * Vercel Cron target. Called every minute via `vercel.json`:
 *   { "crons": [{ "path": "/api/cron/copilot-tasks", "schedule": "* * * * *" }] }
 *
 * Returns the cron token to authorize Vercel (so external traffic can't spoof runs).
 */
const CRON_SECRET = process.env.CRON_SECRET ?? ""

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const summary = await tickOnce(10)
    return NextResponse.json({ success: true, ...summary })
  } catch (error: any) {
    console.error("[COPILOT-CRON] tick failed:", error)
    return NextResponse.json({ success: false, error: error?.message ?? String(error) }, { status: 500 })
  }
}

/** Allow Vercel to POST if needed for ad-hoc triggers / catch-up runs. */
export async function POST(req: NextRequest) {
  return GET(req)
}
