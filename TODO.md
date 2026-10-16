# Page restoration — /settings/team and /settings/workspace

Restored both pages to the clean Phase 1 / Phase 3 versions after the other
AI had bloated them.

## Done

| File | Before | After | Status |
|---|---|---|---|
| `components/settings/team-client.tsx` | 1548 lines (bloated) | ~770 lines (clean Phase 1) | rewritten |
| `components/settings/workspace-client.tsx` | 1026 lines (tabs + react-hook-form + S3) | ~600 lines (clean Phase 3) | rewritten |
| `app/(dashboard)/settings/team/page.tsx` | imported `MembersClient` | imports `TeamSettingsClient` | rewired |

`components/settings/members-client.tsx` is now unreferenced (auto-mode
blocked the delete — left as dead code; harmless).

## Verified

| Check | Result |
|---|---|
| Type errors in `team-client.tsx` | **0** |
| Type errors in `workspace-client.tsx` | **0** |
| `GET /api/settings/workspace-members` no-auth | 401 |
| `GET /api/settings/workspace-recent-events` no-auth | 401 |
| `GET /api/settings/workspace-profile` no-auth | 401 |
| `GET /api/settings/role-catalog` no-auth | 401 |
| `GET /settings/team` no-auth | 307 → /login |
| `GET /settings/workspace` no-auth | 307 → /login |
| Dev server | Ready on :3000 |

(Other TSC errors in `dashboard/summary/route.ts`, `member-permissions/route.ts`,
`member-detail-client.tsx`, `lib/role-presets.ts`, etc. are all **pre-existing**
from the other AI's work — not in my restored files.)

## What `/settings/team` does now

Single-file client. Clean.

- Header + "Invite member" button (admin-only)
- 4-stat row: Active / Pending / Suspended / Total
- Search input + status tabs (All / Active / Suspended)
- Combined list of members + pending invitations:
  - For invitations: `Invited` badge + Resend / Cancel
  - For members: role badge + 3-dot dropdown:
    - **Change role** (submenu: 7 assignable roles, current one marked ✓)
    - **Suspend from workspace** / **Lift suspension**
    - **Transfer ownership** (typed "TRANSFER" to confirm)
    - **Remove from workspace** (with cascade-delete account note)
- "Recent access changes" card (last 10 audit events, human-readable)

Uses my Phase 1 server actions: `resendInvitationAction`, `updateMemberRoleAction`,
`suspendMemberAction`, `liftWorkspaceSuspensionAction`, `transferOwnershipAction`,
`removeMemberAction`. Permission gate uses BA's `workspace: ["update"]` (owner + admin).

## What `/settings/workspace` does now

Single-file client. Clean.

- Header (with read-only badge for non-admins)
- **Identity** — name, slug (live availability check), business type, phone
- **Regulatory** — DOT, MC, EIN
- **Address** — line 1, line 2, city, state, postal, country
- **Operations** — default currency, time zone, fiscal year start
- Save button (single mutation: full profile + audit row with before/after)

Uses my Phase 3 server action: `updateWorkspaceProfileAction` with full
Zod validation + `before/after` audit diff.

## Out of scope (defer to "permissions" discussion)

The other AI's permission files are still in place, untouched:
- `lib/permissions-catalog.ts` — 130 permission keys, 12 modules
- `lib/role-presets.ts` — preset role definitions
- `lib/permissions-context.tsx` — React context for permission checks
- `app/api/settings/member-permissions/` — new permission endpoints
- `app/api/settings/role-permissions/` — new permission endpoints
- `app/api/settings/roles-summary/` — new role listing endpoint
- `app/(dashboard)/settings/team/[userId]/` — new member detail page
- `app/(dashboard)/settings/roles/` — new roles page (uses `roles-master-client`)
- `components/settings/roles-master-client.tsx` — roles page client
- `components/settings/roles-client.tsx` — 1089-line permission matrix editor
- `components/settings/branding-client.tsx` — branding tab
- `components/settings/member-detail-client.tsx` — member detail
- `components/settings/settings-page-header.tsx` — header component
- `components/settings/settings-index-client.tsx` — settings index

The user said next is to **discuss permissions** — those files are waiting
to be examined together. My restored team/workspace pages use the original
BA `ac.newRole` system (`workspace: ["update"]`) which still works.

## How to test in the browser

```bash
# 1. Start dev server (already running on :3000)
bun run dev

# 2. Sign in with any existing user and open:
#    /settings/team      → clean combined list + recent changes
#    /settings/workspace → 4-card identity/regulatory/address/operations
```

Test user from earlier session: `phase3-test@muvx.com` (owner of "Phase3 Test Org").
