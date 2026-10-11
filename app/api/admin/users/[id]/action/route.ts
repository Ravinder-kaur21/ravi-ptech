import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"
import { user } from "@/lib/schema"
import { getSession, requireAdmin } from "@/lib/dal"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { invalidateCache } from "@/lib/cache-tags"

/**
 * Admin action endpoint for a single user.
 *
 * Body: { action: "suspend" | "lift-suspension" | "set-role" | "reset-password" | "force-verify-email", ...args }
 *
 * Suspend / Lift Suspension / Force Verify Email are Muvx-specific actions
 * stored in our custom schema columns. Set Role / Reset Password delegate to
 * Better Auth's admin plugin endpoints so we get the canonical behaviour.
 */

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("suspend"),
    reason: z.string().min(1).max(1000),
    durationDays: z.number().int().positive().nullable(), // null = indefinite
  }),
  z.object({
    action: z.literal("lift-suspension"),
    note: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal("set-role"),
    role: z.enum(["user", "admin"]),
  }),
  z.object({
    action: z.literal("reset-password"),
    newPassword: z.string().min(8).max(128),
  }),
  z.object({
    action: z.literal("force-verify-email"),
  }),
  z.object({
    action: z.literal("resolve-appeal"),
    decision: z.enum(["approved", "denied"]),
    note: z.string().max(500).optional(),
  }),
])

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetUserId } = await params

  // [API/ADMIN-USER-ACTION] Gate: must be signed-in admin
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }

  const raw = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    console.warn("[API/ADMIN-USER-ACTION] invalid body:", parsed.error.issues)
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const target = await db
    .select({
      id: user.id,
      email: user.email,
      role: user.role,
      banned: user.banned,
      suspendedAt: user.suspendedAt,
      appealStatus: user.appealStatus,
    })
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1)

  if (!target[0]) {
    return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 })
  }

  const body = parsed.data
  console.log(
    `[API/ADMIN-USER-ACTION] admin=${admin.userEmail} action=${body.action} target=${target[0].email}`
  )

  switch (body.action) {
    case "suspend": {
      const suspendedUntil = body.durationDays
        ? new Date(Date.now() + body.durationDays * 24 * 60 * 60 * 1000)
        : null
      await db
        .update(user)
        .set({
          suspendedAt: new Date(),
          suspendedUntil,
          suspendedReason: body.reason,
          suspendedBy: admin.userId,
          // Clear any pending appeal — suspension supersedes it
          appealStatus: null,
          appealResolvedBy: admin.userId,
        })
        .where(eq(user.id, targetUserId))
      // Also revoke active sessions via Better Auth so the user is signed out now
      try {
        await auth.api.revokeUserSessions({
          body: { userId: targetUserId },
          headers: await headers(),
        })
      } catch (err) {
        console.warn("[API/ADMIN-USER-ACTION] revoke sessions failed:", err)
      }
      invalidateCache(["admin:users", "admin:stats", "admin:appeals"])
      console.log(`[API/ADMIN-USER-ACTION] ✅ suspended ${target[0].email}`)
      return NextResponse.json({ ok: true })
    }

    case "lift-suspension": {
      await db
        .update(user)
        .set({
          suspendedAt: null,
          suspendedUntil: null,
          suspendedReason: null,
          suspendedBy: null,
          appealStatus: body.note ? "approved" : null,
          appealResolvedBy: admin.userId,
        })
        .where(eq(user.id, targetUserId))
      invalidateCache(["admin:users", "admin:stats", "admin:appeals"])
      console.log(`[API/ADMIN-USER-ACTION] ✅ lifted suspension for ${target[0].email}`)
      return NextResponse.json({ ok: true })
    }

    case "set-role": {
      // Delegate to Better Auth so the session signal fires
      const setRoleRes = await auth.api.setRole({
        body: { userId: targetUserId, role: body.role },
        headers: await headers(),
      })
      const setRoleErr = (setRoleRes as any).error
      if (setRoleErr) {
        return NextResponse.json(
          { error: setRoleErr.code || setRoleErr.message || "Failed to set role" },
          { status: 400 }
        )
      }
      invalidateCache(["admin:users"])
      console.log(
        `[API/ADMIN-USER-ACTION] ✅ set role ${body.role} for ${target[0].email}`
      )
      return NextResponse.json({ ok: true })
    }

    case "reset-password": {
      const pwdRes = await auth.api.setUserPassword({
        body: { userId: targetUserId, newPassword: body.newPassword },
        headers: await headers(),
      })
      const pwdErr = (pwdRes as any).error
      if (pwdErr) {
        return NextResponse.json(
          { error: pwdErr.code || pwdErr.message || "Failed to reset password" },
          { status: 400 }
        )
      }
      console.log(
        `[API/ADMIN-USER-ACTION] ✅ password reset for ${target[0].email}`
      )
      return NextResponse.json({ ok: true })
    }

    case "force-verify-email": {
      await db
        .update(user)
        .set({ emailVerified: true })
        .where(eq(user.id, targetUserId))
      invalidateCache(["admin:users"])
      console.log(
        `[API/ADMIN-USER-ACTION] ✅ force-verified email for ${target[0].email}`
      )
      return NextResponse.json({ ok: true })
    }

    case "resolve-appeal": {
      await db
        .update(user)
        .set({
          appealStatus: body.decision,
          appealResolvedBy: admin.userId,
          // If approved, lift suspension immediately
          ...(body.decision === "approved"
            ? {
                suspendedAt: null,
                suspendedUntil: null,
                suspendedReason: null,
                suspendedBy: null,
              }
            : {}),
        })
        .where(eq(user.id, targetUserId))
      invalidateCache(["admin:users", "admin:stats", "admin:appeals"])
      console.log(
        `[API/ADMIN-USER-ACTION] ✅ appeal ${body.decision} for ${target[0].email}`
      )
      return NextResponse.json({ ok: true })
    }
  }

  return NextResponse.json({ error: "UNHANDLED_ACTION" }, { status: 400 })
}