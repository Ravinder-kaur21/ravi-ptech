/**
 * GET /api/settings/workspace-members — members of the user's active
 * workspace, with search + status + role filter (Phase 1: WS-22, WS-23, WS-26).
 *
 * Returns 401 if the user has no session, 409 if no active workspace.
 * Backed by `listWorkspaceMembers` in lib/dal.ts.
 *
 * Phase 3 (v2): also includes pending invitations in the same response
 * so the member list can show "Invited" rows alongside active members.
 */
import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { requireTenant, listWorkspaceMembers, TenantError } from "@/lib/dal"
import { db } from "@/lib/db"
import { invitation } from "@/lib/schema"

// `cacheComponents` doesn't prerender; mark non-prerenderable.
export const instant = false

export async function GET(req: NextRequest) {
  console.log("[API/WORKSPACE-MEMBERS] entry")
  try {
    const ctx = await requireTenant()
    const search = req.nextUrl.searchParams.get("search") ?? ""
    const statusRaw = req.nextUrl.searchParams.get("status") ?? "all"
    const roleFilter = req.nextUrl.searchParams.get("role") ?? "all"
    const status: "all" | "active" | "suspended" =
      statusRaw === "active" || statusRaw === "suspended" ? statusRaw : "all"

    console.log(
      `[API/WORKSPACE-MEMBERS] tenant=${ctx.tenantId} search=${search} status=${status} role=${roleFilter}`,
    )

    const [memberResult, invitations] = await Promise.all([
      listWorkspaceMembers(ctx.tenantId, { search, status }),
      db
        .select({
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          createdAt: invitation.createdAt,
        })
        .from(invitation)
        .where(
          and(
            eq(invitation.organizationId, ctx.tenantId),
            eq(invitation.status, "pending")
          )
        ),
    ])

    // Apply role filter at the response layer.
    let members = memberResult.members
    if (roleFilter !== "all") {
      members = members.filter((m) => (m.role ?? "member") === roleFilter)
    }

    // Apply search filter to invitations.
    let pendingInvitations = invitations
    if (search) {
      const needle = search.toLowerCase()
      pendingInvitations = pendingInvitations.filter((i) =>
        i.email.toLowerCase().includes(needle)
      )
    }
    if (roleFilter !== "all") {
      pendingInvitations = pendingInvitations.filter(
        (i) => (i.role ?? "member") === roleFilter
      )
    }

    // Merge invitations into the member list shape so the client
    // can render both in one pass.
    const memberIds = new Set(members.map((m) => m.userId))
    const invitationRows = pendingInvitations
      .filter((i) => !memberIds.has(i.email)) // safety: never show dup
      .map((i) => ({
        memberId: i.id,
        userId: i.id,
        email: i.email,
        name: null,
        image: null,
        role: i.role ?? "member",
        banned: false,
        memberSuspendedAt: null,
        joinedAt: i.createdAt as unknown as string,
        lastActiveAt: null,
        invitationPending: true,
        invitationEmail: i.email,
      }))

    const combined = [...invitationRows, ...members]
    return NextResponse.json({ members: combined, total: combined.length })
  } catch (err) {
    if (err instanceof TenantError) {
      const status =
        err.code === "UNAUTHORIZED"
          ? 401
          : err.code === "FORBIDDEN"
            ? 403
            : 409
      return NextResponse.json({ error: err.code }, { status })
    }
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error(`[API/WORKSPACE-MEMBERS] error: ${message}`)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}