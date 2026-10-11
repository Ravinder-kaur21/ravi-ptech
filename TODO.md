# MUVX — Invite Deep-Link Bug (Phase 2 Bug 1)

## Context
User reported: invite link → /login → signup → onboarding (creates workspace)
→ user goes back to email → invite link works on second try.

Root cause: `?next=/invite/[id]` is NOT preserved through the signup flow. Three pages hardcode their post-auth destination:
- `app/signup/page.tsx` (after OTP sent) — no `?next=` capture
- `app/signup/verify/page.tsx` (after account created) — hardcodes `/onboarding`
- `app/login/page.tsx` "Create one" link — does not pass `?next=`

The login form (`components/login-form.tsx:105-109`) already honors `?next=` correctly.

## Checklist

### A. Capture `?next=` and forward through signup

| # | Item | Evidence needed |
|---|------|-----------------|
| A1 | `/signup/page.tsx` captures `?next=` from URL on mount, stores in state | |
| A2 | `/signup/page.tsx` "Create one" link on login page passes `?next=` | |
| A3 | `/signup/page.tsx` passes `?next=` to `/signup/verify` via localStorage alongside `signup_data` | |
| A4 | `/signup/verify/page.tsx` reads `signup_next` from localStorage on mount | |
| A5 | `/signup/verify/page.tsx` on success: if `signup_next` is set, redirect there; else `/onboarding` | |
| A6 | `/signup/verify/page.tsx` clears `signup_next` from localStorage after use | |
| A7 | `/auth-redirect/page.tsx` already honors `?next=` (verified line 30) | ✅ |

### B. InviteClient polish (enterprise UX)

| # | Item | Evidence needed |
|---|------|-----------------|
| B1 | Wrong-email screen has a real "Sign out" button that calls `authClient.signOut()` + redirects to current `/invite/[id]` so the user can re-authenticate | |
| B2 | When wrong-email, also include "Sign up with this email instead" link to `/signup?email=inviteEmail&next=/invite/[id]` | |

### C. Verification

| # | Item | Evidence needed |
|---|------|-----------------|
| C1 | `bunx tsc --noEmit` exits 0 | |
| C2 | `bun run lint` for changed files clean | |
| C3 | Dev server boots | |
| C4 | Trace: invite link → /login?next=/invite/X → user clicks "Create one" → /signup?next=/invite/X → submits → /signup/verify → after OTP → /invite/X (NOT /onboarding) | |

### D. Self-review

| # | Item | Evidence needed |
|---|------|-----------------|
| D1 | No new TODOs left | |
| D3 | All sensitive paths gated | |
| D4 | localStorage cleanup on all branches | |

## Out of scope for this fix

- Phase 2 (TMS permission enforcement) — separate plan
- Field-level redaction — separate plan
- Approval workflows — separate plan