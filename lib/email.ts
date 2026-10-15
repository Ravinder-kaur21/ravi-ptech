import { Resend } from "resend"
import { db } from "@/lib/db"
import { emailLog } from "@/lib/schema"
import { formatWorkspaceDate, DEFAULT_TIMEZONE } from "@/lib/timezone"

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  console.log("[EMAIL] Initializing Resend client, API key exists:", !!apiKey)
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set in environment variables")
  }
  return new Resend(apiKey)
}

const FROM_EMAIL = process.env.RESEND_FROM_ADDRESS || "team@punjabtech.online"

type OtpType = "sign-in" | "email-verification" | "forget-password" | "change-email"

interface SendOtpParams {
  email: string
  otp: string
  type: OtpType
}

function getOtpEmailContent(type: OtpType, otp: string): {
  subject: string
  html: string
  text: string
} {
  console.log("[EMAIL] Building email content for type:", type, "otp:", otp)
  if (type === "sign-in") {
    return {
      subject: "Your Muvx Login Code",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto;">
          <div style="background: #16181d; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: #f5f2ec; font-size: 24px; margin: 0;">Muvx</h1>
          </div>
          <div style="background: #ffffff; padding: 32px; text-align: center; border-radius: 0 0 12px 12px; border: 1px solid #e5e5e5;">
            <p style="color: #4a4e57; font-size: 16px; margin: 0 0 24px;">Your login code is:</p>
            <div style="background: #f5f2ec; padding: 20px 40px; border-radius: 8px; display: inline-block;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #16181d;">${otp}</span>
            </div>
            <p style="color: #73757a; font-size: 14px; margin: 24px 0 0;">This code expires in 10 minutes.</p>
            <p style="color: #94a3b8; font-size: 12px; margin: 16px 0 0;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        </div>
      `,
      text: `Your Muvx login code is: ${otp}. This code expires in 10 minutes.`,
    }
  }

  if (type === "email-verification") {
    return {
      subject: "Verify Your Muvx Account",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto;">
          <div style="background: #16181d; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: #f5f2ec; font-size: 24px; margin: 0;">Muvx</h1>
          </div>
          <div style="background: #ffffff; padding: 32px; text-align: center; border-radius: 0 0 12px 12px; border: 1px solid #e5e5e5;">
            <p style="color: #4a4e57; font-size: 16px; margin: 0 0 24px;">Verify your email to complete signup:</p>
            <div style="background: #f5f2ec; padding: 20px 40px; border-radius: 8px; display: inline-block;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #16181d;">${otp}</span>
            </div>
            <p style="color: #73757a; font-size: 14px; margin: 24px 0 0;">This code expires in 10 minutes.</p>
            <p style="color: #94a3b8; font-size: 12px; margin: 16px 0 0;">If you didn't create a Muvx account, ignore this email.</p>
          </div>
        </div>
      `,
      text: `Verify your Muvx account: ${otp}. This code expires in 10 minutes.`,
    }
  }

  if (type === "forget-password") {
    return {
      subject: "Reset Your Muvx Password",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto;">
          <div style="background: #16181d; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: #f5f2ec; font-size: 24px; margin: 0;">Muvx</h1>
          </div>
          <div style="background: #ffffff; padding: 32px; text-align: center; border-radius: 0 0 12px 12px; border: 1px solid #e5e5e5;">
            <p style="color: #4a4e57; font-size: 16px; margin: 0 0 24px;">Your password reset code is:</p>
            <div style="background: #f5f2ec; padding: 20px 40px; border-radius: 8px; display: inline-block;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #16181d;">${otp}</span>
            </div>
            <p style="color: #73757a; font-size: 14px; margin: 24px 0 0;">This code expires in 10 minutes.</p>
            <p style="color: #94a3b8; font-size: 12px; margin: 16px 0 0;">If you didn't request a password reset, ignore this email.</p>
          </div>
        </div>
      `,
      text: `Your Muvx password reset code is: ${otp}. This code expires in 10 minutes.`,
    }
  }

  return {
    subject: "Verify Your New Email",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto;">
        <div style="background: #16181d; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #f5f2ec; font-size: 24px; margin: 0;">Muvx</h1>
        </div>
        <div style="background: #ffffff; padding: 32px; text-align: center; border-radius: 0 0 12px 12px; border: 1px solid #e5e5e5;">
          <p style="color: #4a4e57; font-size: 16px; margin: 0 0 24px;">Your email change code is:</p>
          <div style="background: #f5f2ec; padding: 20px 40px; border-radius: 8px; display: inline-block;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #16181d;">${otp}</span>
          </div>
          <p style="color: #73757a; font-size: 14px; margin: 24px 0 0;">This code expires in 10 minutes.</p>
        </div>
      </div>
    `,
    text: `Your Muvx email change code is: ${otp}. This code expires in 10 minutes.`,
  }
}

export async function sendOtpEmail({ email, otp, type }: SendOtpParams) {
  console.log("[EMAIL] === sendOtpEmail called ===")
  console.log("[EMAIL] Params:", { email, otp, type })
  console.log("[EMAIL] FROM_EMAIL:", FROM_EMAIL)

  try {
    const resend = getResendClient()
    const { subject, html, text } = getOtpEmailContent(type, otp)

    console.log("[EMAIL] Sending email via Resend...")
    console.log("[EMAIL] Subject:", subject)
    console.log("[EMAIL] To:", email)

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html,
      text,
    })

    console.log("[EMAIL] Resend response:", JSON.stringify(result, null, 2))

    if (result.error) {
      console.error("[EMAIL] Resend returned error:", result.error)
      throw new Error(`Resend error: ${JSON.stringify(result.error)}`)
    }

    console.log("[EMAIL] ✅ Email sent successfully, ID:", result.data?.id)
    return result
  } catch (err) {
    console.error("[EMAIL] ❌ Failed to send email:", err)
    if (err instanceof Error) {
      console.error("[EMAIL] Error message:", err.message)
      console.error("[EMAIL] Error stack:", err.stack)
    }
    throw err
  }
}

// ─── Generic transactional email (used by broadcasts + admin comms) ─────

/**
 * sendTransactionalEmail — sends an arbitrary email via Resend and
 * writes a row to email_log so the admin console can answer
 * "did the user get the email?" without digging through Resend.
 *
 * Best-effort logging: if the log write fails we don't fail the send
 * (the user already got their email). The opposite — fail the send if
 * logging fails — would be worse.
 */
export async function sendTransactionalEmail(input: {
  to: string
  subject: string
  html: string
  text?: string
  kind?: "otp" | "broadcast" | "transactional" | "other"
}) {
  const resend = getResendClient()
  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text ?? input.html.replace(/<[^>]+>/g, ""),
    })
    if (result.error) {
      await db
        .insert(emailLog)
        .values({
          to: input.to,
          subject: input.subject,
          kind: input.kind ?? "transactional",
          providerId: null,
          success: false,
          error: JSON.stringify(result.error),
        })
        .catch((e) => console.warn("[EMAIL] log write failed:", e))
      throw new Error(`Resend error: ${JSON.stringify(result.error)}`)
    }
    await db
      .insert(emailLog)
      .values({
        to: input.to,
        subject: input.subject,
        kind: input.kind ?? "transactional",
        providerId: result.data?.id ?? null,
        success: true,
        error: null,
      })
      .catch((e) => console.warn("[EMAIL] log write failed:", e))
    return result
  } catch (err) {
    await db
      .insert(emailLog)
      .values({
        to: input.to,
        subject: input.subject,
        kind: input.kind ?? "transactional",
        success: false,
        error: err instanceof Error ? err.message : String(err),
      })
      .catch((e) => console.warn("[EMAIL] log write failed:", e))
    throw err
  }
}

// ─── Workspace invitation email (Phase 1 — WS-16, WS-18) ────────────────

/**
 * sendInvitationEmail — workspace invite email.
 *
 * Called by Better Auth's `organization({ sendInvitationEmail })` config
 * callback (registered in lib/auth.ts). Without this callback,
 * `authClient.organization.inviteMember()` silently inserts a row but
 * never sends mail — that was the root cause of WS-16/WS-18 being broken.
 *
 * Better Auth passes one `data` argument:
 *   - data.id                       invitation row id (used in accept URL)
 *   - data.email                    invitee
 *   - data.role                     "admin" | "dispatcher" | ...
 *   - data.inviter                  { id, name, email }  (the user who sent it)
 *   - data.organization             { id, name, slug, ... }
 *   - data.invitation.expiresAt     Date  (we read it from here)
 *
 * Build an accept link `${baseUrl}/invite/${data.id}` and send via
 * sendTransactionalEmail so the row lands in `email_log` (admin console
 * can answer "did the user get the invite?" without opening Resend).
 */
export async function sendInvitationEmail(data: {
  id: string
  email: string
  role: string
  inviter: { id: string; name: string; email: string }
  organization: {
    id: string
    name: string
    slug: string
    createdAt?: Date
    logo?: string | null
    metadata?: unknown
  }
  expiresAt: Date
}) {
  console.log("[EMAIL] === sendInvitationEmail called ===")
  console.log("[EMAIL] Params:", {
    id: data.id,
    email: data.email,
    role: data.role,
    org: data.organization?.name,
    inviter: data.inviter?.email,
  })

  const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000"
  const acceptUrl = `${baseUrl}/invite/${data.id}`
  const inviterName = data.inviter?.name || data.inviter?.email || "A teammate"
  const roleLabel = data.role || "member"
  const orgName = data.organization?.name || "a Muvx workspace"
  const expiresAtText = formatWorkspaceDate(new Date(data.expiresAt), DEFAULT_TIMEZONE)

  const subject = `Join ${orgName} on Muvx`

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="background: #16181d; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: #f5f2ec; font-size: 24px; margin: 0;">Muvx</h1>
      </div>
      <div style="background: #ffffff; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e5e5e5;">
        <p style="color: #4a4e57; font-size: 16px; margin: 0 0 8px;">
          <b>${escapeHtml(inviterName)}</b> invited you to join
        </p>
        <p style="color: #16181d; font-size: 20px; font-weight: 600; margin: 0 0 24px;">
          ${escapeHtml(orgName)}
        </p>
        <p style="color: #4a4e57; font-size: 14px; margin: 0 0 24px;">
          as a <b>${escapeHtml(roleLabel)}</b>.
        </p>
        <div style="text-align: center; margin: 0 0 24px;">
          <a href="${acceptUrl}" style="display: inline-block; background: #16181d; color: #f5f2ec; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Accept invitation
          </a>
        </div>
        <p style="color: #73757a; font-size: 14px; margin: 24px 0 0;">
          This link expires on <b>${expiresAtText}</b>.
        </p>
        <p style="color: #94a3b8; font-size: 12px; margin: 16px 0 0; word-break: break-all;">
          Or paste this URL:<br/>
          <code style="background: #f5f2ec; padding: 4px 6px; border-radius: 4px;">${acceptUrl}</code>
        </p>
      </div>
    </div>
  `

  const text =
    `${inviterName} invited you to join ${orgName} on Muvx as ${roleLabel}.\n` +
    `Accept: ${acceptUrl}\n` +
    `Expires ${expiresAtText}.`

  console.log("[EMAIL] Sending invitation email via sendTransactionalEmail…")
  return sendTransactionalEmail({
    to: data.email,
    subject,
    html,
    text,
    kind: "transactional",
  })
}

/**
 * Escape the few HTML-special chars so an untrusted inviter name or
 * workspace name can't inject markup. We don't expect either to
 * contain tags, but defense-in-depth is cheap.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
