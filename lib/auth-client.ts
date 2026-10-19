import { createAuthClient } from "better-auth/react"
import {
  emailOTPClient,
  usernameClient,
  organizationClient,
  adminClient,
  lastLoginMethodClient,
  multiSessionClient,
  inferAdditionalFields,
} from "better-auth/client/plugins"
// The client must be told about the same access control + roles the server
// declares, otherwise organization.inviteMember() rejects our TMS roles.
// `ac` and the role objects are inert on the client — Better Auth only uses
// them to typecheck role names.
import { ac, owner, administrator, member, opsManager, dispatcher, accounting, driverRole, safety } from "./auth-roles"

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || ""),
  plugins: [
    // Mirror the server's user.additionalFields so session.user is fully
    // typed on the client (otherwise phone is missing from session.user).
    inferAdditionalFields<{ user: { phone: string } }>(),
    emailOTPClient(),
    usernameClient(),
    organizationClient({
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
      // ─── Dynamic Access Control (Phase 3 — WS-31/32/33) ────────────
      // Must match the server-side setting. Dynamic roles are checked
      // via hasPermission() on the client — NOT checkRolePermission().
      dynamicAccessControl: {
        enabled: true,
      },
    }),
    adminClient(),
    lastLoginMethodClient(),
    multiSessionClient(),
  ],
})

// Server-side auth (for use in Server Components, Server Actions, Route Handlers)
export const { signIn, signUp, signOut, useSession } = authClient