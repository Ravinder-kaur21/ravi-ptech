# Phase 2 — TMS Permission Enforcement — SHIPPED

## Verified

| Check | Result |
|---|---|
| `bunx tsc --noEmit` | EXIT 0 |
| Migration 0008 (Phase 1) | Applied |
| Lint errors | 114 → 113 (no new errors from Phase 2) |
| POST /api/loads (no auth) | 401 + `{"error":"UNAUTHORIZED"}` |
| PATCH /api/loads/[id]/star (no auth) | 401 + `{"error":"UNAUTHORIZED"}` |
| Dev server boots | Ready |

## Shipped

### A. Permission helper — `lib/dal.ts`

```ts
export async function requirePermission(opts: { resource: string; action: string }) {
  const headersList = await headers()
  try {
    const result = await auth.api.hasPermission({
      headers: headersList,
      body: { permissions: { [opts.resource]: [opts.action] } },
    })
    if (!result?.success) throw new TenantError("FORBIDDEN")
  } catch (err) {
    if (err instanceof TenantError) throw err
    throw new TenantError("FORBIDDEN")
  }
}
```

Wraps BA's official `auth.api.hasPermission`. Reads the active-org member role from the
session. Throws `TenantError("FORBIDDEN")` which `withTenant` maps to HTTP 403.

### B. Applied gates

| Route | Resource.Action | Why |
|---|---|---|
| `/api/loads` POST | `load.create` | Driver role has `load: ["read"]` only — denied |
| `/api/loads/[id]/star` PATCH | `load.update` | Same |

### C. Audit hook — `lib/audit.ts` + `/api/loads/route.ts`

- Extended `AuditAction` union with `load.create/update/delete`, `invoice.create/update/delete`, `trip.create/update/delete`, `driver.create/update/delete`, `truck.create/update/delete`
- Extended `AuditTargetType` union with `load`, `invoice`, `trip`, `driver`, `truck`
- `/api/loads` POST writes `load.create` audit row after successful insert

### Risk R-01 from audit: closed.

Driver role can no longer create loads even if a future UI change exposes the button — the
server denies via `requirePermission` → 403.

### Risk R-07 partial: closed for loads.

Load mutations now audit-write. Invoice/trip/driver/truck mutations don't exist yet (no
mutation API routes); audit hooks are pre-wired for them when they land.

## Skipped (deferred)

- Field-level redaction (R-02) — separate phase
- Driver-scoped loads (R-03) — needs `trip.driver_id` join
- Bulk export authz
- Approval workflows
- Custom roles

## Not done — blocked

Cannot execute the negative test `driver POST /api/loads → 403 with auth cookie` because
no headless browser session in this environment. The 401 path is verified; the 403 path
requires a signed-in driver session cookie.

## What ships next

Phase 3 — workspace profile fields, member management polish, teams/terminals.
Phase 4 — driver-scoped loads (R-03) + field-level redaction (R-02).
Phase 8 — automated negative tests for the 12 mandatory scenarios.