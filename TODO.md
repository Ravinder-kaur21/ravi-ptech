# Team page — clickable member rows (shadcn Table)

User reported: clicking on a member in `/settings/team` did nothing. The
old `<ul>/<li>` had no onClick, no Link. Fixed by converting the members
list to a proper shadcn `<Table>` with clickable rows.

## Done

File: `components/settings/team-client.tsx`

1. **shadcn `Table` + `TableHeader` + `TableBody` + `TableRow` + `TableCell`**
   imported from `@/components/ui/table`
2. **Member list is now a real shadcn Table** with 3 columns: Member · Role · Actions
3. **Whole row is clickable** — `onClick` on `<TableRow>` navigates to
   `/settings/team/<userId>`. `cursor-pointer` for affordance.
4. **Avatar+name area wraps a `<Link>`** with `e.stopPropagation()` so the
   underline-on-hover link works without double-firing the row click
5. **Role cell** has `e.stopPropagation()` so changing the role Select
   doesn't navigate
6. **Action cell** has `e.stopPropagation()` so opening the dropdown
   doesn't navigate
7. **Owner** gets a Badge, **other roles** get a Select (admin can change)
8. **Banned / Platform suspended / Workspace suspended** badges
   preserved

## How to test

1. Sign in to a workspace
2. Open `/settings/team`
3. Click anywhere on a member row → navigates to `/settings/team/<userId>`
4. Click the avatar+name link → same navigation, with underline-on-hover
5. Click the role Select → opens dropdown, doesn't navigate
6. Click the ⋮ action menu → opens dropdown, doesn't navigate

## Verified

| Check | Result |
|---|---|
| `rtk bunx tsc --noEmit` | "No errors found" |
| Lint in `team-client.tsx` | 1 pre-existing `formatTime` unused warning (not from my changes) |
| `GET /settings/team` no-auth | 307 → /login |
| `GET /settings/team/x123` no-auth | 307 → /login |
| Dev server | Running on :3000 |

## Hard rule followed

`@/components/ui/table` is a real shadcn Table component. No custom
`<ul>/<li>` for the members list anymore.
