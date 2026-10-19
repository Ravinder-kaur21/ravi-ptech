# Rules (strict)
## use rtk 
- for intance rtk git status, rtk bunx tsc --noemit
#### bun only for all work 
- for instance rtk bunx tsc --noemit; bunx or bun
## AWS Setup
- AWS Account: 061534656693
- AWS Region: ap-southeast-2 (primary)
- S3 Bucket: muvx-app-storage (created for project storage)
- Use default AWS profile for all operations

## Process
1. Never assume. Before writing ANY code, read the official docs/source via MCP and use the exact official code. No estimated or workaround code.
2. UI: use the shadcn MCP; match official docs exactly; use as many fitting components as possible in our design language.
3. Auth: use the Better Auth MCP only.
4. Check for relevant skills first; if none, research current best practices. Find gaps like a real engineer.
5. If I report an error, assume official-docs code wasn't used. Re-check the docs and rewrite with official code only.
6. Mention better new UI libraries when relevant.
8. A feature is DONE only when all of these hold: UI exists, server enforces it, DB is persisted and migrated, every entry point is gated (routes, layouts, API, actions), and failure states are handled. UI-only is NOT done.
9. NEVER ask "want me to fix this?" for anything within the scope of my request. If you find a gap while working (e.g. a missing guard), fix it in the same turn. Ask only when a product decision is truly needed, and give a recommended default.
10. Run verification yourself: typecheck, lint, tests, build, migration, and exercise the flow (script, test, or query). Paste real output. Never hand me a manual test list in place of running it.
11. Before the final response, do a self-review pass: re-read the diff against TODO.md, and search for leftover TODO/FIXME, stubs, unused props, and unhandled errors. Fix them.
12. Final response format: Done (verified, with evidence) / Not done (blocked, with reason and the one decision needed). Never mark partial work as done.
13. Keep chat replies short, but never skip checklist items to save tokens. Compact context only after updating TODO.md.