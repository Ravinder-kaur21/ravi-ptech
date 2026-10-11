import { betterAuth } from "better-auth/minimal"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import { db } from "./db"
import * as schema from "./schema"
import {
  emailOTP,
  username,
  organization,
  admin,
  lastLoginMethod,
  multiSession,
} from "better-auth/plugins"
import { sendOtpEmail } from "./email"
import {
  ac,
  owner,
  administrator,
  member,
  opsManager,
  dispatcher,
  accounting,
  driverRole,
  safety,
} from "./auth-roles"
import { anonymizeUserReferences } from "./cascade"

console.log("[AUTH] Initializing Better Auth...")
console.log("[AUTH] Database URL exists:", !!process.env.DATABASE_URL)
console.log("[AUTH] Better Auth URL:", process.env.BETTER_AUTH_URL)
console.log("[AUTH] Google Client ID exists:", !!process.env.GOOGLE_CLIENT_ID)
console.log("[AUTH] Resend API Key exists:", !!process.env.RESEND_API_KEY)

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,

  plugins: [
    username(),
    organization({
      ac,
      roles: {
        owner,
        admin: administrator,
        member,
        operations_manager: opsManager,
        dispatcher,
        accounting,
        driver: driverRole,
        safety,
      },
      creatorRole: "owner",
      allowUserToCreateOrganization: true,
      // Allow up to 3 orgs per user - prevents accidental "hit limit" errors
      // while still encouraging single-org usage for TMS
      organizationLimit: 3,
      teams: { enabled: false },
      // Hook fires on every removeMember call from any client. We use it
      // for observability only — the actual workspace-scoped cascade
      // (driver detachment, session cleanup, hard-delete-if-last-workspace)
      // is owned by `app/actions/remove-member.ts` → `lib/cascade.ts`. That
      // path has proper audit + transaction guarantees; this hook does
      // not run inside a transaction we control.
      hooks: {
        before: {
          removeMember: async (data: any) => {
            console.log(
              `[AUTH] organizationHooks.before.removeMember memberId=${data?.member?.id} orgId=${data?.organization?.id}`
            )
          },
        },
      },
    }),
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
      // Safer defaults for production usage
      impersonationSessionDuration: 60 * 30, // 30 minutes
      defaultBanReason: "Policy violation",
      defaultBanExpiresIn: 60 * 60 * 24 * 30, // 30 days
      bannedUserMessage:
        "Your account has been suspended. Contact support@muvx.com if you believe this is a mistake.",
    }),
    lastLoginMethod(),
    multiSession(),
    emailOTP({
      otpLength: 6,
      expiresIn: 600,
      // Sign-up is owned by /signup — keep emailOTP strictly for sign-in
      // so we don't leak account existence via email-enumeration.
      disableSignUp: true,
      async sendVerificationOTP({ email, otp, type }) {
        console.log("[AUTH] === emailOTP.sendVerificationOTP called ===")
        console.log("[AUTH] emailOTP type:", type)
        try {
          await sendOtpEmail({ email, otp, type })
          console.log("[AUTH] ✅ emailOTP email sent successfully")
        } catch (err) {
          console.error("[AUTH] ❌ emailOTP email send failed:", err)
          throw err
        }
      },
    }),
    // MUST be the last plugin — it wraps cookie writes so Server Actions
    // and Route Handlers actually persist the session cookie.
    nextCookies(),
  ],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },

  // ─── Cascade hooks ──────────────────────────────────────────────────
  // `databaseHooks.user.delete.before` anonymizes audit_log and
  // email_broadcast references to the user before Better Auth's
  // internal delete fires. This is belt-and-braces: the cascade
  // library (`lib/cascade.ts`) also calls this from the server-side
  // transaction, but external scripts that call removeUser directly
  // get the same protection.
  //
  // `organizationHooks.beforeRemoveMember` does NOT cascade — the
  // cascade library is the only place that does workspace-scoped
  // cleanup, and it runs from a server action with proper audit.
  // This hook just logs the intent for debugging.
  databaseHooks: {
    user: {
      delete: {
        before: async (user) => {
          console.log(`[AUTH] databaseHooks.user.delete.before ${user.id}`)
          try {
            await anonymizeUserReferences(user.id, db as any)
          } catch (err) {
            console.error(
              `[AUTH] anonymizeUserReferences failed in user.delete.before:`,
              err
            )
            // Don't rethrow — Better Auth will still try the delete,
            // and the FK is now nullable+SET NULL, so it'll succeed
            // even if our anonymization had a partial failure.
          }
          return true
        },
      },
    },
  },

  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },

  user: {
    additionalFields: {
      phone: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },
})

console.log("[AUTH] ✅ Better Auth initialized")
