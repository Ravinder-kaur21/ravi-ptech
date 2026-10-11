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
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
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
    }),
    adminClient(),
    lastLoginMethodClient(),
    multiSessionClient(),
  ],
})

// Server-side auth (for use in Server Components, Server Actions, Route Handlers)
export const { signIn, signUp, signOut, useSession } = authClient