import { NextResponse } from "next/server"
import { getRoutingPayload } from "@/lib/role-paths"

/**
 * GET /api/me/routing
 *   Returns the post-auth destination for the current user plus
 *   their full role context (platform + workspace). The login form
 *   calls this on mount to decide where to redirect after a
 *   successful sign-in.
 */
export async function GET() {
  console.log("[API/ME-ROUTING] GET")
  const payload = await getRoutingPayload()
  console.log("[API/ME-ROUTING] result", payload)
  return NextResponse.json(payload)
}
