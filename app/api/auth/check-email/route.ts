import { NextResponse } from "next/server"
import { z } from "zod"
import { isEmailAllowed } from "@/lib/request-gate"

const bodySchema = z.object({
  email: z.string().email().max(254),
})

/**
 * POST /api/auth/check-email
 *   Body: { email }
 *   Returns: { ok: boolean, reason: string | null }
 *
 * Called by the signup form before sending the verification OTP, so
 * the user gets a friendly error instead of a Better Auth 400.
 */
export async function POST(req: Request) {
  const raw = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, reason: "invalid_email" },
      { status: 400 }
    )
  }
  const result = await isEmailAllowed(parsed.data.email)
  return NextResponse.json({ ok: result.ok, reason: result.reason })
}
