# Onboarding Select components — professional-only fix

## Done

| Step | Field | Change |
|------|-------|--------|
| 03 | Fleet size | `w-full` + placeholder "Select fleet size…" |
| 03 | Team size | `w-full` + placeholder "Select team size…" |
| 03 | Geographic scope | `w-full` + placeholder "Select geographic scope…" |
| 04 | Freight tool | `w-full` + placeholder "Select an option…" |
| 05 | Team role | `w-full` (team role SelectItem already shows label + description) |

## Verified
- `bunx tsc --noEmit` → EXIT 0
- No layout changes — only SelectTrigger `className` and `placeholder` text changed
