# Restore f978966 + fix other-AI errors

## Done

Restored `/settings/team` and `/settings/workspace` to the f978966 versions
(the clean design I built in Phase 1 / Phase 3), and fixed every TypeScript
error that the other AI's work had left behind.

## Pages restored (from f978966 commit)

| File | Lines | Source |
|---|---|---|
| `components/settings/team-client.tsx` | 1509 | f978966 — full Phase 1 design (search, status tabs, dropdown menu, suspend/lift/transfer/remove dialogs, recent-changes card) |
| `components/settings/workspace-client.tsx` | 821 | f978966 — full Phase 3 design (identity, regulatory, address, operations) |
| `app/(dashboard)/settings/team/page.tsx` | 16 | imports `TeamSettingsClient` |
| `app/(dashboard)/settings/workspace/page.tsx` | 17 | imports `WorkspaceSettingsClient` |
| `app/(dashboard)/settings/page.tsx` | 107 | landing with 5 cards (Workspace, Team, Roles, Billing, Integrations) |

## Other-AI errors fixed (6 files, 40 → 0 errors)

| File | Errors | Fix |
|---|---|---|
| `components/dashboard/dashboard-sections.tsx` | 2 | `asChild={false}` + `<Link>` child → `render={<Link ... />}` (Base UI pattern) |
| `lib/role-presets.ts` | 2 | `OWNER_KEYS as unknown as readonly string[]` cast for the `"__ALL__"` wildcard |
| `lib/audit.ts` | 0 net | Added 5 new `AuditAction` values: `member.role_change`, `member.permissions.reset`, `member.permission.grant`, `member.permission.revoke`, `member.remove`. Added optional `summary` field on `RecordAuditEvent` that folds into metadata. |
| `app/api/settings/workspace-members/[userId]/route.ts` | 1 | New `member.remove` audit action now in union |
| `app/api/settings/member-permissions/route.ts` | 3 | New `member.role_change` / `member.permissions.reset` / `member.permission.{grant,revoke}` audit actions + `summary` field |
| `components/settings/member-detail-client.tsx` | 3 | `useQueryClient()` inside component (was a `null` module-scope reference) |
| `app/api/dashboard/summary/route.ts` | 27 | Rewrote the route to use the **actual** schema columns. Mapping: `organizationId` → `tenantId`, `total` → `amount::numeric`, `amountPaid` → 0 (no column), `daysOverdue` → derived from `dueDate - NOW()`, `referenceNumber` → `loadNumber`, `assignedDriverId` → `status='available'`. Also removed `export const dynamic = "force-dynamic"` (incompatible with `cacheComponents` — replaced with `export const instant = false` which is the cacheComponents-friendly equivalent) |

## Verified

| Check | Result |
|---|---|
| `bunx tsc --noEmit` | **EXIT 0 — 0 errors** |
| `GET /api/settings/workspace-profile` no-auth | 401 |
| `GET /api/settings/workspace-members` no-auth | 401 |
| `GET /api/settings/workspace-recent-events` no-auth | 401 |
| `GET /api/settings/role-catalog` no-auth | 401 |
| `GET /api/dashboard/summary` no-auth | 401 |
| `GET /api/settings/member-permissions` no-auth | 401 |
| `GET /settings/team` no-auth | 307 → /login |
| `GET /settings/workspace` no-auth | 307 → /login |
| `GET /dashboard` no-auth | 307 → /login |
| Dev server | Running on :3000 |

## What stayed untouched (intentional)

- `components/settings/roles-client.tsx` — the other AI's 1089-line permission-matrix editor (their `roles/[roleId]` page uses it). Not asked to change.
- `components/settings/roles-master-client.tsx` — the other AI's roles page client. Not asked to change.
- `lib/permissions-catalog.ts`, `lib/role-presets.ts`, `lib/permissions-context.tsx` — the new permission system files. The 2 type errors in `role-presets.ts` were fixed; the files themselves are still in place for the next "permissions" discussion.
- `app/api/settings/role-permissions/`, `roles-summary/`, `member-permissions/`, `workspace-members/[userId]/` — endpoint stubs the other AI built. Errors fixed; endpoints still callable.
- `app/(dashboard)/settings/roles/[roleId]/`, `settings/team/[userId]/`, `settings/workspace/branding/` — pages the other AI built. Untouched.

## How to test

```bash
# Dev server already running on :3000
bun run dev
```

Then in a browser:
- `/settings/team` — search, status tabs, member dropdown (Change role / Suspend / Lift / Transfer / Remove), invite resend/cancel, recent changes
- `/settings/workspace` — identity / regulatory / address / operations sections, single save, read-only badge for non-admins
- `/dashboard` — 6-tile KPI grid + AR aging (now uses the real `tenantId` / `amount` / `dueDate` schema columns)
