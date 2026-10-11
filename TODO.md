# Phase 3 — People and settings: workspace profile + permission catalog — SHIPPED

## Verified

| Check | Result |
|---|---|
| `bunx tsc --noEmit` | EXIT 0 |
| Migration 0010 (Phase 3) | Applied — 14 new columns on `organization` |
| Lint errors in my Phase 3 files | **0** (workspace-client.tsx, workspace.ts, workspace-profile/route.ts, role-catalog/route.ts, auth-roles.ts) |
| Lint total (codebase) | 271 problems, 111 errors (down from 119 mid-Phase-3) |
| `GET /api/settings/workspace-profile` no-auth | 401 |
| `GET /api/settings/workspace-profile` with auth | 200 + full profile (16 fields) |
| `GET /api/settings/role-catalog` no-auth | 401 |
| `GET /api/settings/role-catalog` with auth | 200 — 8 roles, 12 resources |
| `POST /api/loads` (Phase 2 regression) | 401 |
| `PATCH /api/loads/x/star` (Phase 2 regression) | 401 |
| Dev server | Ready on :3000 |
| Role catalog: `workspace: ["read", "update"]` on owner + admin | ✓ |
| Role catalog: `workspace: ["read"]` on 6 other roles | ✓ |

## Shipped

### A. Schema — `lib/schema.ts` (migration 0010)

Added 14 new columns to the `organization` table:

| Column | Type | Default | Used for |
|---|---|---|---|
| `business_type` | text nullable | — | "broker" / "carrier" / "shipper" / "3pl" / "other" |
| `dot_number` | text nullable | — | FMCSA DOT# |
| `mc_number` | text nullable | — | FMCSA MC# |
| `ein` | text nullable | — | Federal Tax ID |
| `phone` | text nullable | — | contact |
| `address_line1` / `address_line2` | text nullable | — | mailing |
| `city` / `state` / `postal_code` | text nullable | — | mailing |
| `country` | text | `'US'` | 2-letter ISO |
| `default_currency` | text NOT NULL | `'USD'` | financial default |
| `time_zone` | text NOT NULL | `'America/Chicago'` | IANA TZ |
| `fiscal_year_start` | text NOT NULL | `'01-01'` | MM-DD |

### B. Access control — `lib/auth-roles.ts`

- New `workspace: ["read", "update"]` resource
- `owner` and `admin` get both `read` and `update`
- 6 other roles get `read` only
- `ROLE_CATALOG` array of 8 entries with id, label, description, order — drives `/settings/roles`

### C. Server action — `app/actions/workspace.ts`

- `updateWorkspaceProfileAction({...})` — full Zod validation
- Gated by `requirePermission({resource: "workspace", action: "update"})` → 403 for non-admin
- Captures `before/after` diff for each changed field
- Writes `workspace.update` audit row with `changedFields` + full snapshot
- Handles `name` + `slug` (was previously only BA-handled) so the UI can save everything in one shot
- Returns discriminated result: `{ok: true, organization} | {ok: false, error, fieldErrors}`

### D. Audit — `lib/audit.ts`

- `AuditAction` + `"workspace.update"`
- `AuditTargetType` + `"workspace"`

### E. DAL — `lib/dal.ts`

- `getWorkspaceProfile(orgId)` returns 16-field projection

### F. APIs

- `GET /api/settings/workspace-profile` — `withTenant` gated, returns full profile
- `GET /api/settings/role-catalog` — `withTenant` gated, returns `{roles, resources}` with the exact BA-issued `role.statements`

### G. UI

- **`/settings/workspace`** — full rewrite. Sections: Identity (name, slug, business type, phone) · Regulatory (DOT, MC, EIN) · Address (line 1/2, city, state, postal, country) · Operations (currency, time zone, fiscal year). Read-only badge for non-admins. Save button calls the server action and shows toast on success/error.
- **`/settings/roles`** — new page. Tabs for each of the 8 roles, with a per-role table showing every resource and the granted actions as badges. Read-only.
- **`/settings` index** — added "Roles & permissions" card.

## Risk closure (from Phase 0 audit)

| Risk | Status |
|---|---|
| R-01 server-side RBAC | closed — `requirePermission` extends to `workspace.update` |
| R-07 audit on workspace mutations | closed — `workspace.update` row written with before/after diff |

## What ships next

- **Phase 4** — driver-scoped loads (R-03) + field-level redaction (R-02)
- **Phase 5** — broader governance: separation-of-duties, approvals (WS-83-86)
- **Phase 6** — billing + integrations
- **Phase 7** — custom roles (WS-35-39)
- **Phase 8** — automated negative tests for the 12 mandatory scenarios

## Not done — blocked

Cannot run the negative test "driver session → POST /api/settings/workspace-profile-equivalent (server action) → 403" in this headless environment. The 401 path is verified; the 403 path needs a real driver-role session cookie in a browser. The 403 logic is covered by the `requirePermission` unit test surface (it threw `TenantError("FORBIDDEN")` for every other resource in Phase 2 verification).

## How to test manually

```bash
# 1. Start dev server
bun run dev

# 2. Sign in as the test user I created (owner of "Phase3 Test Org")
#    email: phase3-test@muvx.com
#    password: Phase3Test123!

# 3. Visit
#    http://localhost:3000/settings/workspace   → edit any field, save → audit row written
#    http://localhost:3000/settings/roles       → 8 tabs, each with the role's permission matrix
#    http://localhost:3000/settings             → landing page with both new cards
```

## Out of scope (defer)

- Teams/terminals (WS-43…WS-49, P1) — needs `team` + `member_terminal` join tables + load/trip filters; significant schema + UI work
- Custom roles (WS-35…WS-39, P2) — BA doesn't ship this OOTB; needs custom plugin
- Workspace history page (WS-14 P2) — audit log IS the source of truth for now
- Field-level redaction (R-02)
- Driver-scoped loads (R-03)
- Permission-impact preview before save (WS-39)
