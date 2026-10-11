import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { and, eq } from "drizzle-orm"
import { user, member } from "@/lib/schema"
import { getSession, requireAdmin } from "@/lib/dal"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { invalidateCache } from "@/lib/cache-tags"
import { recordAuditEvent } from "@/lib/audit"

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
  // "set-role" handles BOTH the platform role (System A) and the
  // workspace role (System B) in a single call. Pass `memberRole`
  // to also change the user's role in a specific workspace.
  z.object({
    action: z.literal("set-role"),
    role: z.enum(["user", "admin"]),
    memberRole: z
      .object({
        organizationId: z.string().min(1),
        role: z.enum([
          "owner",
          "admin",
          "member",
          "operations_manager",
          "dispatcher",
          "accounting",
          "driver",
          "safety",
        ]),
      })
      .optional(),
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
      await recordAuditEvent({
        actor: { id: admin.userId, email: admin.userEmail },
        action: "user.suspend",
        target: { type: "user", id: targetUserId, label: target[0].email },
        metadata: { reason: body.reason, durationDays: body.durationDays },
      })
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
      await recordAuditEvent({
        actor: { id: admin.userId, email: admin.userEmail },
        action: "user.lift-suspension",
        target: { type: "user", id: targetUserId, label: target[0].email },
        metadata: { note: body.note ?? null },
      })
      invalidateCache(["admin:users", "admin:stats", "admin:appeals"])
      console.log(`[API/ADMIN-USER-ACTION] ✅ lifted suspension for ${target[0].email}`)
      return NextResponse.json({ ok: true })
    }

    case "set-role": {
      // Workspace role change (System B) — optional, runs alongside
      // the platform role change. Better Auth's
      // organization.updateMemberRole takes a memberId, not a userId;
      // resolve the membership row first.
      if (body.memberRole) {
        try {
          const [m] = await db
            .select({ id: member.id, role: member.role })
            .from(member)
            .where(
              and(
                eq(member.userId, targetUserId),
                eq(member.organizationId, body.memberRole.organizationId)
              )
            )
            .limit(1)
          if (!m) {
            return NextResponse.json(
              { error: "USER_NOT_IN_ORG" },
              { status: 404 }
            )
          }
          const upd = await auth.api.updateMemberRole({
            body: {
              memberId: m.id,
              role: body.memberRole.role as any,
            },
            headers: await headers(),
          })
          const updErr = (upd as any).error
          if (updErr) {
            return NextResponse.json(
              {
                error:
                  updErr.code || updErr.message || "Failed to update workspace role",
              },
              { status: 400 }
            )
          }
          await recordAuditEvent({
            actor: { id: admin.userId, email: admin.userEmail },
            action: "user.set-member-role",
            target: {
              type: "user",
              id: targetUserId,
              label: target[0].email,
            },
            metadata: {
              organizationId: body.memberRole.organizationId,
              fromRole: m.role,
              toRole: body.memberRole.role,
            },
          })
          console.log(
            `[API/ADMIN-USER-ACTION] ✅ set member role ${m.role}→${body.memberRole.role} for ${target[0].email} in ${body.memberRole.organizationId}`
          )
        } catch (err) {
          console.error(
            "[API/ADMIN-USER-ACTION] updateMemberRole failed:",
            err
          )
          return NextResponse.json(
            { error: "Failed to update workspace role" },
            { status: 500 }
          )
        }
      }

      // Platform role change (System A) — only if role is "user" or
      // "admin" (the schema is the same, the action handler is
      // identical regardless of memberRole).
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
      await recordAuditEvent({
        actor: { id: admin.userId, email: admin.userEmail },
        action: "user.set-role",
        target: { type: "user", id: targetUserId, label: target[0].email },
        metadata: { fromRole: target[0].role, toRole: body.role },
      })
      invalidateCache(["admin:users", "session:role"])
      console.log(
        `[API/ADMIN-USER-ACTION] ✅ set platform role ${target[0].role}→${body.role} for ${target[0].email}`
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
      await recordAuditEvent({
        actor: { id: admin.userId, email: admin.userEmail },
        action: "user.reset-password",
        target: { type: "user", id: targetUserId, label: target[0].email },
      })
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
      await recordAuditEvent({
        actor: { id: admin.userId, email: admin.userEmail },
        action: "user.force-verify-email",
        target: { type: "user", id: targetUserId, label: target[0].email },
      })
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
      await recordAuditEvent({
        actor: { id: admin.userId, email: admin.userEmail },
        action: "appeal.resolve",
        target: { type: "appeal", id: targetUserId, label: target[0].email },
        metadata: { decision: body.decision, note: body.note ?? null },
      })
      invalidateCache(["admin:users", "admin:stats", "admin:appeals"])
      console.log(
        `[API/ADMIN-USER-ACTION] ✅ appeal ${body.decision} for ${target[0].email}`
      )
      return NextResponse.json({ ok: true })
    }
  }

  return NextResponse.json({ error: "UNHANDLED_ACTION" }, { status: 400 })
}