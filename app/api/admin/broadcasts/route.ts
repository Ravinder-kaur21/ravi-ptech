import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { emailBroadcast, user } from "@/lib/schema"
import { desc, gte, eq, sql } from "drizzle-orm"
import { requireAdmin } from "@/lib/dal"
import { recordAuditEvent } from "@/lib/audit"
import { sendTransactionalEmail } from "@/lib/email"

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }
  const rows = await db
    .select({
      id: emailBroadcast.id,
      subject: emailBroadcast.subject,
      body: emailBroadcast.body,
      audience: emailBroadcast.audience,
      audienceSize: emailBroadcast.audienceSize,
      sentCount: emailBroadcast.sentCount,
      failedCount: emailBroadcast.failedCount,
      sentAt: emailBroadcast.sentAt,
      sentBy: emailBroadcast.sentBy,
    })
    .from(emailBroadcast)
    .orderBy(desc(emailBroadcast.sentAt))
    .limit(100)
  return NextResponse.json({
    broadcasts: rows.map((r) => ({
      id: r.id,
      subject: r.subject,
      body: r.body,
      audience: r.audience,
      audienceSize: Number(r.audienceSize),
      sentCount: Number(r.sentCount),
      failedCount: Number(r.failedCount),
      sentAt: r.sentAt.toISOString(),
      sentByEmail: r.sentBy, // raw id; we hydrate in the client
    })),
  })
}

const sendSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  audience: z.enum(["all", "active_30d", "admins"]),
})

/**
 * POST /api/admin/broadcasts
 *   Resolves the audience, sends one email per recipient, writes a
 *   single email_broadcast row with sent/failed counts. Per-recipient
 *   rows go to email_log via sendTransactionalEmail.
 *
 * Sends sequentially with a small concurrency cap (10 in-flight) to
 * avoid hitting Resend's rate limit on a big list. We don't await all
 * at once — we chunk and let the response return as soon as the first
 * chunk finishes so the admin UI doesn't time out on big lists.
 */
export async function POST(req: Request) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }
  const raw = await req.json().catch(() => null)
  const parsed = sendSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  // Resolve audience
  let recipients: { id: string; email: string; name: string | null }[]
  if (parsed.data.audience === "all") {
    recipients = await db
      .select({ id: user.id, email: user.email, name: user.name })
      .from(user)
      .orderBy(user.createdAt)
  } else if (parsed.data.audience === "active_30d") {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    recipients = await db
      .select({ id: user.id, email: user.email, name: user.name })
      .from(user)
      .where(gte(user.createdAt, since))
      .orderBy(user.createdAt)
  } else {
    recipients = await db
      .select({ id: user.id, email: user.email, name: user.name })
      .from(user)
      .where(eq(user.role, "admin"))
      .orderBy(user.createdAt)
  }

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "Audience is empty — nothing to send." },
      { status: 400 }
    )
  }

  // Build the row immediately so the admin sees the broadcast history
  const [broadcast] = await db
    .insert(emailBroadcast)
    .values({
      subject: parsed.data.subject,
      body: parsed.data.body,
      audience: parsed.data.audience,
      audienceSize: String(recipients.length),
      sentCount: "0",
      failedCount: "0",
      sentBy: admin.userId,
    })
    .returning()

  // Fire-and-forget send. We update sentCount / failedCount as we go.
  void runBroadcastSend(broadcast.id, recipients, parsed.data.subject, parsed.data.body).catch(
    (e) => console.error("[BROADCAST] send loop crashed:", e)
  )

  await recordAuditEvent({
    actor: { id: admin.userId, email: admin.userEmail },
    action: "system.announcement",
    target: { type: "system", id: broadcast.id, label: parsed.data.subject },
    metadata: { change: "broadcast.start", audience: parsed.data.audience, count: recipients.length },
  })

  return NextResponse.json({
    ok: true,
    id: broadcast.id,
    sent: 0,
    failed: 0,
    queued: recipients.length,
  })
}

async function runBroadcastSend(
  broadcastId: string,
  recipients: { id: string; email: string; name: string | null }[],
  subject: string,
  body: string
) {
  let sent = 0
  let failed = 0
  const html = renderBroadcastHtml(subject, body)
  const text = body
  const concurrency = 10
  for (let i = 0; i < recipients.length; i += concurrency) {
    const chunk = recipients.slice(i, i + concurrency)
    const results = await Promise.allSettled(
      chunk.map((r) =>
        sendTransactionalEmail({
          to: r.email,
          subject,
          html: html.replace(/{{\s*name\s*}}/g, r.name ?? ""),
          text,
          kind: "broadcast",
        }).then(() => "ok")
      )
    )
    for (const r of results) {
      if (r.status === "fulfilled") sent++
      else failed++
    }
    // Periodically persist progress so the admin sees live numbers
    if (i % 50 === 0) {
      await db
        .update(emailBroadcast)
        .set({ sentCount: String(sent), failedCount: String(failed) })
        .where(sql`id = ${broadcastId}`)
    }
  }
  await db
    .update(emailBroadcast)
    .set({ sentCount: String(sent), failedCount: String(failed) })
    .where(sql`id = ${broadcastId}`)
  console.log(`[BROADCAST] ✅ ${broadcastId} sent=${sent} failed=${failed}`)
}

function renderBroadcastHtml(subject: string, body: string): string {
  const safeBody = body
    .split(/\n\n+/)
    .map((p) => `<p style="margin:0 0 16px 0;line-height:1.6;color:#4a4e57;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("")
  return `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#f5f2ec;margin:0;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4ddd3;">
    <div style="background:#16181d;padding:20px 24px;">
      <h1 style="color:#f5f2ec;font-family:Georgia,serif;font-size:22px;margin:0;font-weight:normal;">${escapeHtml(subject)}</h1>
    </div>
    <div style="padding:28px 24px;">
      <p style="margin:0 0 16px 0;color:#4a4e57;font-size:14px;">Hi {{ name }},</p>
      ${safeBody}
      <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;">— The Muvx team</p>
    </div>
  </div>
</body></html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
