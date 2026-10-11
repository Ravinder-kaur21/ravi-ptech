# MUVX Admin Console plan and tracking of admin penal building — Complete Implementation Checklist

Use the following as your execution roadmap for your AI coding agent. It consolidates the existing research and plan into sequential, testable implementation phases.

The objective is to build a production-grade, multi-tenant TMS administration console inspired by GitHub Enterprise, Vercel, Stripe, Linear, Okta, Auth0, Atlassian, and Better Auth, using shadcn/ui components.

## 1. Establish the implementation rules

Before the agent writes code, give it these constraints.

**MUVX Admin Console — Agent Instructions**

Work in small, sequential phases. Do not implement the entire admin console in one pass.

1. Inspect the existing codebase, current implementation plan, database schema, authentication configuration, organization plugin, routes, and reusable components before modifying anything.
2. Preserve existing working functionality. Do not replace the current architecture or authentication system without explicit justification.
3. Treat system administrators and organization users as separate authorization scopes. An administrator must not receive organization permissions merely because their system role is `admin`.
4. Remove the “Back to app” link from the admin sidebar. Use the shadcn `sidebar-07` design pattern and `dashboard-01` dashboard layout, adapted to the existing MUVX design system.
5. Reuse existing shadcn components and existing server-side query functions. Avoid duplicate implementations.
6. Research the actual Better Auth, Drizzle ORM, and installed shadcn APIs before using them. Never invent functions, database columns, or endpoints.
7. For every feature, implement the UI, server-side authorization, validation, database/API logic, loading states, empty states, errors, and success feedback.
8. Use Drizzle schema changes and the existing migration workflow. Never modify the database manually to bypass migrations.
9. Every privileged mutation must be authorized server-side and recorded in an append-only audit log. Require explicit confirmation for destructive or security-sensitive actions.
10. Never expose secrets, credentials, sensitive session tokens, or unrestricted personal data in the admin UI or logs.
11. Add automated tests for permissions, cross-tenant isolation, successful operations, failure cases, and destructive actions.
12. After each phase, run the relevant type checks, lint, tests, and build. Report changed files, migrations, test results, known limitations, and the exact next step.
13. Do not start the next phase until the current phase passes its acceptance criteria and I approve continuation.
14. Do not claim a feature is complete until its underlying operation works end to end. A mock UI or placeholder API is not a completed feature.

First produce a codebase assessment and identify dependencies or blockers. Do not begin implementation until I approve the assessment.

## 2. Complete feature inventory

The initial plan already identifies 82 features across the core administration system. The categories below organize them into buildable modules, including the advanced enterprise capabilities found in the additional research.

### A. Admin interface and navigation

| ID | Task                                          | Acceptance criteria                                                                                |
| -- | --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| A1 | Replace admin shell with `sidebar-07` pattern | Responsive sidebar, collapse-to-icon, proper active states                                         |
| A2 | Rebuild overview using `dashboard-01`         | Consistent KPI cards, charts, recent activity                                                      |
| A3 | Remove “Back to app”                          | No confusing navigation into organization UI                                                       |
| A4 | Add admin-specific user dropdown              | Account, sign out, and authorized impersonation actions                                            |
| A5 | Add breadcrumbs and page headers              | Consistent navigation across all admin routes                                                      |
| A6 | Add global command palette                    | Search users, organizations, appeals, and other supported resources                                |
| A7 | Add reusable admin UI components              | Standard data tables, detail sheets, status badges, confirmation dialogs, charts, and empty states |
| A8 | Apply MUVX design tokens                      | Preserve the existing cream/orange visual identity and responsive behavior                         |

### B. User and identity management

| ID  | Task                                                                   | Tier |
| --- | ---------------------------------------------------------------------- | ---- |
| B1  | Search, filter, sort, paginate users                                   | 1    |
| B2  | User detail drawer with profile, membership, activity and history tabs | 1    |
| B3  | Ban, unban, suspend, lift suspension                                   | 1    |
| B4  | Assign and revoke system administrator role                            | 1    |
| B5  | Force email verification and initiate password reset                   | 1    |
| B6  | Impersonate a user and safely stop impersonation                       | 1    |
| B7  | Remove users with explicit confirmation                                | 1    |
| B8  | Bulk user actions with permission checks                               | 1    |
| B9  | Export user records to CSV                                             | 1    |
| B10 | View active sessions and revoke one or all sessions                    | 2    |
| B11 | Show device/browser information and suspicious-session indicators      | 2    |
| B12 | Enforce MFA enrollment and session policies                            | 2    |
| B13 | Export personal data and process deletion requests                     | 2    |
| B14 | Merge duplicate accounts safely                                        | 3    |
| B15 | Detect suspicious logins, brute force and anomalous location changes   | 3    |
| B16 | Support enterprise identity provisioning and deprovisioning            | 3    |

### C. Organization and tenant management

| ID  | Task                                                                      | Tier |
| --- | ------------------------------------------------------------------------- | ---- |
| C1  | Search organizations and display membership counts                        | 1    |
| C2  | Organization detail sheet with members, invitations, activity and billing | 1    |
| C3  | View and manage organization members and roles                            | 1    |
| C4  | Delete an organization safely                                             | 1    |
| C5  | Create an organization on behalf of a customer                            | 2    |
| C6  | Transfer organization ownership                                           | 2    |
| C7  | Suspend and reactivate an organization                                    | 2    |
| C8  | Manage invitations: resend, revoke and inspect expiry                     | 2    |
| C9  | Display organization usage, plan and feature entitlements                 | 2    |
| C10 | Override plans and features for selected organizations                    | 3    |
| C11 | Enter a controlled organization support context                           | 3    |
| C12 | Provide delegated organization administration with scoped permissions     | 3    |

Authorization requirement: system role, organization membership role, and TMS operational role must remain separate. A platform administrator must not automatically become an organization owner or dispatcher.

### D. Appeals, abuse and moderation

| ID | Task                                                | Tier |
| -- | --------------------------------------------------- | ---- |
| D1 | Appeals inbox with status filters                   | 1    |
| D2 | Approve or deny appeals with recorded reasons       | 1    |
| D3 | Appeals history and administrative notes            | 1    |
| D4 | Abuse report submission and review queue            | 2    |
| D5 | Investigate reported accounts and related activity  | 2    |
| D6 | Track moderation decisions, evidence and escalation | 2    |
| D7 | Add appeal and abuse-report retention rules         | 3    |

### E. Audit, compliance and activity

| ID | Task                                                                | Tier |
| -- | ------------------------------------------------------------------- | ---- |
| E1 | Append-only audit log for privileged actions                        | 1    |
| E2 | Filter by actor, action, resource, category and date                | 1    |
| E3 | Record before/after changes where appropriate                       | 1    |
| E4 | Display recent administrative activity on the overview              | 1    |
| E5 | Export audit events as CSV or JSON                                  | 2    |
| E6 | Configure audit retention and archival                              | 2    |
| E7 | Stream audit events to external security systems                    | 3    |
| E8 | Track authentication, permission changes, exports and impersonation | 2    |
| E9 | Add tamper-evident integrity checks and restricted audit access     | 3    |

### F. Security and access policies

| ID  | Task                                                                     | Tier |
| --- | ------------------------------------------------------------------------ | ---- |
| F1  | Central security settings page                                           | 2    |
| F2  | Global and organization-specific MFA enforcement                         | 2    |
| F3  | Password policy and breached-password checks                             | 2    |
| F4  | Signup email allowlist and blocklist                                     | 2    |
| F5  | Admin-route IP/CIDR allowlist                                            | 3    |
| F6  | IP blocking, login throttling and brute-force detection                  | 2    |
| F7  | Maintenance mode and global incident banner                              | 2    |
| F8  | Organization-specific security notices                                   | 2    |
| F9  | SSO/SAML and enterprise identity provider configuration                  | 3    |
| F10 | SCIM provisioning and deprovisioning                                     | 3    |
| F11 | Suspicious-login events and anomaly investigation                        | 3    |
| F12 | Recovery procedures, session revocation and privileged-action safeguards | 2    |

### G. Feature flags and rollout controls

| ID | Task                                          | Tier |
| -- | --------------------------------------------- | ---- |
| G1 | Create, edit and disable global feature flags | 2    |
| G2 | Override flags for a user                     | 2    |
| G3 | Override flags for an organization            | 2    |
| G4 | Percentage-based rollout                      | 2    |
| G5 | Plan-based feature entitlements               | 2    |
| G6 | Emergency kill switches for critical features | 2    |
| G7 | Audit flag changes and expose rollout history | 2    |

### H. Communications

| ID | Task                                                | Tier |
| -- | --------------------------------------------------- | ---- |
| H1 | Global in-app announcements                         | 2    |
| H2 | Targeted organization announcements                 | 3    |
| H3 | Broadcast email with recipient filters              | 2    |
| H4 | Email delivery log and suppression management       | 2    |
| H5 | Announcement scheduling, expiry and dismissal rules | 3    |
| H6 | Maintenance and incident communications             | 2    |

### I. API keys, webhooks and integrations

| ID | Task                                                        | Tier |
| -- | ----------------------------------------------------------- | ---- |
| I1 | Create, list, scope and revoke API keys                     | 2    |
| I2 | Configure outbound webhooks                                 | 2    |
| I3 | View webhook deliveries and retry failed deliveries         | 2    |
| I4 | Inspect delivery response codes, latency and failure rate   | 2    |
| I5 | Manage connected integrations and revoke access             | 2    |
| I6 | Review OAuth application access requests                    | 3    |
| I7 | Configure rate limits and approved exceptions               | 3    |
| I8 | Rotate webhook signing secrets and audit credential changes | 2    |

### J. System health and operations

| ID | Task                                              | Tier |
| -- | ------------------------------------------------- | ---- |
| J1 | Overview KPIs and growth charts                   | 1    |
| J2 | Database and dependency health indicators         | 2    |
| J3 | Recent server errors with safe diagnostic details | 2    |
| J4 | Background job queue and retry controls           | 3    |
| J5 | Scheduled-job/cron execution history              | 3    |
| J6 | Latency, error rate and storage monitoring        | 2    |
| J7 | Maintenance mode and operational kill switches    | 2    |
| J8 | Backup and migration status visibility            | 2    |
| J9 | Alerting for failed jobs and degraded services    | 3    |

### K. Billing and revenue administration

| ID  | Task                                                  | Tier |
| --- | ----------------------------------------------------- | ---- |
| K1  | Subscription list by organization                     | 2    |
| K2  | Plans and feature entitlements                        | 3    |
| K3  | MRR, subscription changes and revenue trends          | 2    |
| K4  | Invoice viewing and download                          | 2    |
| K5  | Refunds through the configured payment provider       | 2    |
| K6  | Manual credits with amount, reason and audit record   | 2    |
| K7  | Upgrade/downgrade plans                               | 2    |
| K8  | Discounts and promotional codes                       | 3    |
| K9  | Usage limits and spend monitoring                     | 3    |
| K10 | Payment failures, overdue accounts and billing alerts | 2    |

Do not create a second billing ledger if Stripe or another payment provider already owns the authoritative payment records. The admin console should use the provider's supported APIs and preserve reconciliation.

### L. Data operations

| ID | Task                                                        | Tier |
| -- | ----------------------------------------------------------- | ---- |
| L1 | CSV export for supported administrative tables              | 1    |
| L2 | Personal-data export jobs                                   | 2    |
| L3 | Data deletion requests and status tracking                  | 2    |
| L4 | Retention policy management                                 | 2    |
| L5 | Saved filters and reusable table views                      | 2    |
| L6 | Bulk operations with progress and partial-failure reporting | 2    |
| L7 | Export history and expiring download links                  | 2    |
| L8 | Import/restore workflows with validation and authorization  | 3    |

### M. Enterprise administration — advanced capabilities

These are inspired by GitHub Enterprise, Okta and Vercel. They should be treated as optional enterprise modules, not prerequisites for launching the TMS.

| ID  | Capability                          | What to implement                                                                |
| --- | ----------------------------------- | -------------------------------------------------------------------------------- |
| M1  | Enterprise roles                    | Owner, billing, security and application-manager roles                           |
| M2  | Custom roles                        | Define granular permissions and preview their effective abilities                |
| M3  | Permission matrix                   | Display which roles can perform which actions                                    |
| M4  | IP allowlist management             | CIDR entries, descriptions, validation and access testing                        |
| M5  | Audit log streaming                 | Destination configuration, connection health, test delivery and failure handling |
| M6  | SCIM directory sync                 | Provision/deprovision users and synchronize groups                               |
| M7  | SAML SSO                            | Identity-provider setup, metadata, certificate expiry and sign-in testing        |
| M8  | Custom organization properties      | Typed metadata, schema definitions and organization assignments                  |
| M9  | GitHub-style application governance | Integration registry, access approvals and revocation                            |
| M10 | Security integrations               | External SIEM destinations, alerts and event export                              |
| M11 | Delegated administration            | Restrict operators to selected organizations or resource groups                  |
| M12 | Enterprise seat and license usage   | Purchased versus assigned seats and usage-based cost tracking                    |
| M13 | Compliance reporting                | Audit exports, retention evidence and policy status                              |
| M14 | Insider-risk review                 | Dormant accounts, stale credentials and unusual privileged activity              |
| M15 | Enterprise danger zone              | Organization transfers, deletion safeguards and recovery procedures              |
| M16 | Policy inheritance                  | Global defaults with explicit organization-level overrides                       |

Important distinction: GitHub Advanced Security (GHAS), Copilot seat management, repository governance and GitHub Stafftools are GitHub-specific capabilities. MUVX should borrow their governance patterns where useful, not reproduce GitHub's code-hosting functionality as if it belonged in a TMS.

### N. TMS-specific platform oversight

The general SaaS admin console is not enough for a transportation management system. Add operational visibility into customer organizations and their business activity without turning platform administrators into unrestricted dispatchers.

| ID  | Capability                      | Purpose                                                                                      |
| --- | ------------------------------- | -------------------------------------------------------------------------------------------- |
| N1  | Carrier oversight               | Review carrier accounts, onboarding status and verification                                  |
| N2  | Load oversight                  | Search loads across organizations with strict authorization and privacy controls             |
| N3  | Driver oversight                | Review driver onboarding, account status and organization association                        |
| N4  | Compliance review               | Surface expiring documents, missing requirements and unresolved flags                        |
| N5  | Settlement oversight            | Inspect settlement processing states and failed reconciliation                               |
| N6  | Fraud and abuse signals         | Flag suspicious account, load or transaction activity for review                             |
| N7  | Organization operational health | Show relevant activity, usage and onboarding blockers                                        |
| N8  | Support escalation              | Link customer-reported problems to the relevant organization and audit history               |
| N9  | Integration health              | Monitor connected TMS services and synchronization failures                                  |
| N10 | Data access controls            | Restrict access to sensitive customer and driver information; audit every exceptional access |

These screens should be read-only by default. Operational changes must go through dedicated, authorized actions with explicit audit records.

## 3. Exact implementation sequence

Use these phases in order. Each phase produces a working, testable result rather than a collection of unfinished screens.

Phase 0 — Codebase audit and implementation plan

Required first

Inspect routes, authentication, organization plugin, schema, existing admin APIs, current feature status, migrations and installed shadcn components. Identify authorization gaps and blockers. Produce a dependency map without changing code.

Phase 1 — Admin shell and design system

Implement `sidebar-07`, `dashboard-01`, navigation, breadcrumbs, responsive behavior, admin-specific user menu, shared table wrappers, detail sheets, confirmation dialogs and consistent status components. Remove “Back to app.”

Phase 2 — Core administration

Overview dashboard, user management, organization management, appeals, global search, bulk actions and CSV export. Reuse existing working features instead of rebuilding them.

Phase 3 — Audit and access security

Append-only audit logging, actor/resource filters, user sessions, revocation, impersonation audit trails, authorization tests and essential security controls. Establish audit coverage before adding more privileged operations.

Phase 4 — Production operations

Security policy configuration, feature flags, announcements, API keys, webhooks, integrations, error visibility, export jobs and data retention.

Phase 5 — Billing and customer support

Subscriptions, invoices, payment-provider operations, refunds, account credits, plan changes, usage visibility and support escalation.

Phase 6 — TMS-specific oversight

Carrier, load, driver, compliance, settlement and integration-health views, with explicit limits on customer data access.

Phase 7 — Enterprise capabilities

Custom roles, SSO/SAML, SCIM, audit streaming, delegated administration, enterprise policies and advanced anomaly detection. Implement only after validating demand and required infrastructure.

Phase 8 — Production hardening

Cross-tenant isolation tests, security review, migration verification, accessibility, responsive layouts, observability, backup/recovery checks and end-to-end regression testing.

## 4. shadcn/ui component implementation map

Use existing components wherever possible. shadcn provides UI primitives and patterns; it does not provide the business logic, authorization, data tables or backend operations automatically.

| Component or pattern       | Use in MUVX                                                |
| -------------------------- | ---------------------------------------------------------- |
| `sidebar-07`               | Admin navigation and user menu                             |
| `dashboard-01`             | Dashboard layout and responsive KPI structure              |
| `Card`                     | KPI cards, health indicators and billing summaries         |
| `Chart`                    | Growth, subscription, usage and security trends            |
| `Table` + TanStack Table   | Users, organizations, audit records, sessions and invoices |
| `Sheet` + `Tabs`           | User and organization detail panels                        |
| `Dialog` + `AlertDialog`   | Editing, destructive actions and confirmations             |
| `Command` + `Kbd`          | Global search and keyboard shortcuts                       |
| `DropdownMenu`             | Row actions, account menus and navigation actions          |
| `Select` + `Combobox`      | Filters, role assignment and organization selection        |
| `Form` + `Field` + `Input` | Validated settings and configuration forms                 |
| `Calendar` + `Popover`     | Date filters, suspension expiry and audit ranges           |
| `Badge` + `Avatar`         | Status, identity and role indicators                       |
| `Switch` + `Slider`        | Policy toggles and rollout percentages                     |
| `Checkbox` + `Progress`    | Bulk selection and long-running operations                 |
| `Skeleton` + `Empty`       | Loading and empty states                                   |
| `Alert` + `Sonner`         | Warnings, impersonation banners and operation feedback     |
| `Accordion` + `Separator`  | Expandable audit details and grouped settings              |
| `Tooltip` + `Breadcrumb`   | Navigation guidance and page hierarchy                     |

For the visual patterns, inspect the official [shadcn dashboard blocks](https://ui.shadcn.com/blocks/dashboard), [sidebar blocks](https://ui.shadcn.com/blocks/sidebar) and [charts](https://ui.shadcn.com/charts).

## 5. Database and API implementation checklist

Do not create every proposed table immediately. First compare the existing Drizzle schema against the requirements and add only missing structures.

| Data area           | Candidate tables or existing entities                               |
| ------------------- | ------------------------------------------------------------------- |
| Authentication      | Better Auth `user`, `session`, `account`, `verification`            |
| Organizations       | `organization`, `member`, `invitation`                              |
| Auditing            | `audit_log`                                                         |
| Security            | `security_event`, `ip_block`, `ip_allowlist`, `anomaly_event`       |
| Feature management  | `feature_flag`, user and organization overrides                     |
| Communications      | `announcement`, email delivery records                              |
| API integrations    | `api_key`, `webhook`, `webhook_delivery`, integration records       |
| Data requests       | `export_job`, `dsar_request`, `retention_policy`                    |
| Operations          | Error events, job execution records, scheduled-task history         |
| Billing             | Provider-backed customer, subscription and invoice references       |
| Enterprise identity | SSO configuration, provisioning mappings and synchronization status |

### Required backend rules

- Use the existing Better Auth admin and organization plugins for supported functionality rather than duplicating them.
- Keep system-wide permissions separate from organization-level membership and operational permissions.
- Enforce authorization in server-side handlers and data-access functions, not merely by hiding buttons.
- Validate ownership and organization scope in every tenant-specific query.
- Use transactions for multi-record changes and account operations where supported.
- Treat audit history as append-only, with restricted access and tamper-evident protections appropriate to the threat model.
- Use provider APIs for payments and subscription operations.
- Use the established Drizzle migration workflow and verify migrations against a local database before deployment.

## 6. How to make the AI work step by step

Send the following message after providing the master instructions above.

Start with **Phase 0 only**.

Inspect the MUVX codebase and compare the current implementation against the complete admin-console checklist. Verify the actual routes, authentication and authorization boundaries, organization isolation, Drizzle schema, migration commands, shadcn components, and existing working admin features.

Deliver:

1. A checklist marking every feature as implemented and verified, partially implemented, UI-only, missing, or blocked.
2. A list of authorization and cross-tenant isolation issues.
3. A dependency map showing which features must precede others.
4. The exact files that will need changes in Phase 1.
5. The implementation and testing plan for Phase 1, including acceptance criteria.

Do not modify files, generate migrations, install packages, or start implementation yet. Wait for my approval of the assessment.

After Phase 0, approve one phase at a time. Within each approved phase, have the agent implement one small slice, test it, report the result, and then continue to the next slice only when the previous one passes.

The critical priority is not the number of admin screens. It is correct authorization, tenant isolation, reliable privileged actions, and an audit trail. A polished admin console that lets an administrator cross tenant boundaries accidentally is not production-ready.