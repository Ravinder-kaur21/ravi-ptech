# Task — wide member table + dedicated invitations page + member detail redesign

## 1. Widen the member table
- [ ] Change the page wrapper from `max-w-4xl` to `max-w-6xl`
- [ ] Give the members Card `overflow-hidden` so the table can breathe
- [ ] Add a `TableCaption` or footer row showing the count

## 2. Dedicated invitations page — `/settings/team/invitations`
- [ ] `app/(dashboard)/settings/team/invitations/page.tsx` — server guard (session + active org) + `export const instant = false`
- [ ] `components/settings/invitations-client.tsx` — NEW client
  - [ ] Header: breadcrumb (Team / Invitations), title, "Invite member" button
  - [ ] Status Tabs: Pending / Accepted / Rejected / Canceled / All — with counts
  - [ ] Search by email
  - [ ] `Table` (shadcn): Email · Role · Status · Invited by · Expires · Actions
  - [ ] Row actions: Re-send (calls `resendInvitationAction`), Cancel (calls `authClient.organization.cancelInvitation`)
  - [ ] Empty state per status
  - [ ] Loading / error states
- [ ] Add an "Invitations" card to `/settings/team` that links to the new page (shows pending count + View all)
- [ ] Remove the inline invitations list from `team-client.tsx` (keep the invite *dialog* there? No — move it to the new page and keep a compact "Invite" button on /settings/team that links)
- [ ] Add a link from `/settings/team` → `/settings/team/invitations` and back

## 3. Redesign `/settings/team/[userId]` — the admin control surface
**Aim:** an admin can manage everything about a member from one page.

- [ ] Copy the **admin detail page pattern** (`app/(admin)/admin/users/[id]/page.tsx`):
      breadcrumb · hero (avatar, badges, action menu) · status Alerts · 4-card KPI strip · Item/Field/Section grid · danger zone
- [ ] Breadcrumb: `Team / <member name>`
- [ ] Hero: Avatar + name + email + role Badge + status Badges + overflow action menu (Suspend / Lift / Transfer / Remove)
- [ ] **KPI strip (4 cards)**: Keys ON · Overrides · Modules accessible · Last active
- [ ] **Danger zone card** at the bottom: Suspend / Transfer ownership / Remove from workspace — each with typed confirmation
- [ ] **Actions card** (left column): Change role Select · Suspend · Lift · Transfer · Remove — the "manage from profile" surface
- [ ] **Permissions card** (right column): the "Extra grants on top of role" + "+ Grant a key" button + compact effective-access list
- [ ] Keep the 130-key matrix but move it into a **Sheet** opened by "Edit all permissions" so the page isn't a wall of toggles
- [ ] Remove the Activity / Sessions tabs (stubs that say "next phase") — replace with real content or drop
- [ ] Link back to `/settings/team` and to `/settings/team/invitations`

## Verification

- [ ] `rtk bunx tsc --noEmit` → 0 errors
- [ ] `rtk bun run lint` → no new errors in touched files
- [ ] `GET /settings/team` → 307 unauth
- [ ] `GET /settings/team/invitations` → 307 unauth
- [ ] `GET /settings/team/<id>` → 307 unauth
- [ ] Dev server boots
- [ ] Members query + invitations query + member-permissions query all return 200 with a real session

## Out of scope

- Teams / terminals
- Field-level redaction (R-02)
- Driver-scoped loads (R-03)
- The 12 negative-test scenarios (Phase 8)