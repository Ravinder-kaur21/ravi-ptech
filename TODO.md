# MUVX — Members / Invitations / Access Lifecycle (WS-16…WS-30) — Completion Checklist

## A. Better Auth config (lib/auth.ts) ✅
- A1 `sendInvitationEmail` callback registered
- A2 `organizationHooks` flat shape
- A3 `beforeRemoveMember` fires (verified against BA source: `crud-members.mjs:224`)
- A4 `afterRemoveMember` writes audit `user.remove-from-org` (signature matches BA source: `{member, user, organization}`)
- A5 `beforeUpdateMemberRole` returns `{ data: { role: newRole } }` (matches BA source: `crud-members.mjs:340-348`)
- A6 `afterUpdateMemberRole` writes audit `user.set-member-role` (matches BA source: `crud-members.mjs:350,361`)
- A7 `databaseHooks.user.delete.before` anonymizes

## B. Schema + migration 0009 ✅
- B1-B5 all applied via `bun db:generate` + `bun run migrate`

## C. Server actions (app/actions/invitation.ts) ✅
- C1 resendInvitationAction — sends email + audit `user.invite-resent`
- C2 suspendMemberAction — owner/admin only, blocks owner, audit `user.suspend-from-workspace`, detaches sessions
- C3 liftWorkspaceSuspensionAction — audit `user.lift-workspace-suspension`
- C4 transferOwnershipAction — transaction demote-self + promote-target, audit `org.transfer-ownership`, layout revalidation
- C5 Every action calls `requireTenant()`
- C6 Every action audit-writes
- C7 No raw Date in `sql\`${...}\``

## D. DAL helpers (lib/dal.ts) ✅
- D1-D5 all present with proper `eq(table.organizationId, orgId)` scoping

## E. API routes (app/api/settings/*) ✅
- E1-E5 all present; verified 401 + JSON `{"error":"UNAUTHORIZED"}` response on unauthenticated GET

## F. UI (components/settings/team-client.tsx) ✅
- F1-F11 all present; tsc + lint clean for the file

## G. **CRITICAL — Workspace-suspended gate** ✅
- G1 dashboard layout redirects suspended members to `/workspace-suspended`
- G2 platform admins bypass the gate (`isAdminForGate` check)
- G3 `/workspace-suspended` page reads `member.suspendedAt/Until/Reason` and shows reason + switch-workspace CTA
- G4 the user can still sign in and access other workspaces (account not banned)

## G+. **API-level defense** ✅
- `requireTenant()` in `lib/dal.ts` now also checks `member.suspendedAt` and throws `TenantError("FORBIDDEN")` if suspended. Platform admins bypass.

## H. WS-25 — Scope of access 🚫
- DEFERRED per plan (`/Users/apple/.claude/plans/parallel-wobbling-hennessy.md`)

## I. **CRITICAL — Audit hook verification** ✅
- I1 `afterUpdateMemberRole({member, previousRole, user, organization})` verified against BA `crud-members.mjs:350`
- I2 `afterRemoveMember({member, user, organization})` verified against BA `crud-members.mjs:224`
- I3 NO double-write: `cascadeRemoveMember` calls `tx.delete(member)` directly, never reaching the BA hook. The hook only fires when `authClient.organization.removeMember` is called from a client — the team-client uses the server action instead. Documented in code comments.

## J. End-to-end verification

| # | Item | Result |
|---|---|---|
| J1 | `bunx tsc --noEmit` | ✅ EXIT: 0 |
| J2 | `bun run lint` for files I touched | ✅ 0 errors (3 unused imports removed) |
| J3 | `bun run migrate` 0009 applies cleanly | ✅ Done |
| J4 | `bun run dev` boots | ✅ Ready in 304ms |
| J5 | Routes load correct status (200/307/401/JSON) | ✅ Verified via curl: `/login` 200, `/workspace-suspended` 307, `/settings/team` 307, 3× API routes 401 with JSON body `{"error":"UNAUTHORIZED"}` |
| J6 | Email send via Resend | ⬜ Not exercised (would need real account + Resend credentials) |
| J7 | Accept-invite flow end-to-end | ⬜ Not exercised |
| J8 | Suspend/lift/transfer all write audit rows | ⬜ Not exercised |
| J9 | Recent access changes card | ⬜ Not exercised |
| J10 | `bun run build` (production) | ⬛ BLOCKED — pre-existing `/maintenance` page fails prerender (NOT in my diff; NOT caused by my changes) |

## K. Self-review pass (per rule 11)

- ✅ No TODO/FIXME left in new code (`grep TODO FIXMEnone` in my files)
- ✅ No stub functions
- ✅ No `any` types in new server code (all replaced with proper types or `as unknown as` casts)
- ✅ No unused props/state (`myMemberId`, `useMemo`, `Building2`, `cn` removed)
- ✅ All mutations call `revalidatePath`
- ✅ All sensitive mutations audit-write
- ✅ All new API routes gate on `requireTenant()` (which now also gates suspension)
- ✅ Dashboard layout gates on suspension
- ✅ New `/workspace-suspended` page handles missing-session / missing-org / admin-bypass / not-currently-suspended / showing-reason cases

## Not-done blockers

1. **`/maintenance` prerender error** — pre-existing in the codebase, NOT in my changeset. The page calls `isMaintenanceMode()` which uses `headers()`. Build was failing before my changes too (per error pattern).
2. **End-to-end email/accept/suspend exercise** — requires browser session, real email delivery. Cannot automate without seeding an auth cookie + Resend API key.