# MUVX TMS — Enterprise Company Workspace: Complete Requirements and Implementation Prompt

# 1. Workspace Architecture

The product has two separate administrative areas.

| Area | Purpose | Examples |
|---|---|---|
| MUVX Platform Administration | Manage the MUVX service | Platform accounts, workspace oversight, service administration, controlled support access |
| Company Workspace | Manage an individual transportation business | Members, roles, loads, dispatch, fleet, finance, compliance, settings |
| Company Dashboard | Support daily business operations | Loads, dispatch activity, tracking, exceptions, operational reports |
| Company Settings | Manage company configuration | Company profile, people, access, security, teams, billing, integrations |

### Mandatory architecture rules

- Each company has a private workspace.
- Company membership determines whether a user can access that workspace.
- Company roles determine permitted actions.
- Data scope determines which records a user may access.
- Business rules determine whether an action is allowed in the current situation.
- Platform-wide administration and company administration must remain separate.
- Platform privileges must not automatically grant unrestricted access to company data.
- Hiding a button or page does not constitute authorization enforcement.

---

# 2. Complete Workspace Feature Inventory

Use this inventory as the baseline for the audit and implementation plan.

**Priority definitions:** P0 = foundation and essential security; P1 = core company operations; P2 = advanced governance; P3 = enterprise capabilities.

## A. Company Identity and Workspace Lifecycle

| ID | Feature | Priority |
|---|---|---|
| WS-01 | Create a company workspace | P0 |
| WS-02 | Set company name, logo, and contact information | P0 |
| WS-03 | Set business type: carrier, broker, or both | P0 |
| WS-04 | Configure headquarters and operating address | P0 |
| WS-05 | Configure time zone, date format, and measurement units | P0 |
| WS-06 | Set company registration and business identifiers | P1 |
| WS-07 | Set default currency and financial preferences | P1 |
| WS-08 | Configure company operating hours | P1 |
| WS-09 | View company profile and workspace status | P0 |
| WS-10 | Edit company details according to permissions | P0 |
| WS-11 | Suspend or reactivate a workspace under defined rules | P2 |
| WS-12 | Close or deactivate a company workspace | P2 |
| WS-13 | Export company data before closure | P2 |
| WS-14 | Maintain a history of company profile changes | P2 |
| WS-15 | Support multiple operating locations under one company | P1 |

## B. Members, Invitations, and Access Lifecycle

| ID | Feature | Priority |
|---|---|---|
| WS-16 | Invite employees by email | P0 |
| WS-17 | Assign a role during invitation | P0 |
| WS-18 | Assign team or terminal access during invitation | P1 |
| WS-19 | Track pending, accepted, expired, and cancelled invitations | P0 |
| WS-20 | Resend or cancel invitations | P0 |
| WS-21 | View all company members | P0 |
| WS-22 | Search and filter members | P1 |
| WS-23 | View a member's role, teams, locations, and status | P0 |
| WS-24 | Change a member's role | P0 |
| WS-25 | Change a member's scope of access | P1 |
| WS-26 | Suspend or reactivate a member's company access | P0 |
| WS-27 | Remove a member from a company | P0 |
| WS-28 | Transfer responsibilities before removing a member | P1 |
| WS-29 | Prevent removal or demotion of the last company owner | P0 |
| WS-30 | Review a member's recent access and administrative changes | P2 |

## C. Roles and Permissions

| ID | Feature | Priority |
|---|---|---|
| WS-31 | Provide predefined company roles | P0 |
| WS-32 | Define a central permission catalogue | P0 |
| WS-33 | Map permissions to each role | P0 |
| WS-34 | Assign roles to members | P0 |
| WS-35 | Allow owners to create custom roles | P2 |
| WS-36 | Edit custom role permissions | P2 |
| WS-37 | Duplicate an existing role as a starting point | P2 |
| WS-38 | Preview the effective access of a role | P1 |
| WS-39 | Show the impact of permission changes before saving | P2 |
| WS-40 | Prevent unauthorized permission delegation | P0 |
| WS-41 | Protect ownership and critical administrative permissions | P0 |
| WS-42 | Record role and permission changes in audit history | P0 |

## D. Company Structure, Teams, and Terminals

| ID | Feature | Priority |
|---|---|---|
| WS-43 | Create and manage departments | P1 |
| WS-44 | Create and manage teams | P1 |
| WS-45 | Create and manage terminals or operating locations | P1 |
| WS-46 | Assign members to teams | P1 |
| WS-47 | Assign members to one or more terminals | P1 |
| WS-48 | Define team and terminal managers | P1 |
| WS-49 | Restrict operational records by team or terminal | P1 |
| WS-50 | Move members between teams or locations | P1 |
| WS-51 | View company organizational structure | P2 |

## E. TMS Operational Access

| ID | Feature | Priority |
|---|---|---|
| WS-52 | Restrict load visibility by role and scope | P0 |
| WS-53 | Create and manage loads according to permissions | P0 |
| WS-54 | Assign and reassign loads | P0 |
| WS-55 | Restrict dispatch actions by team, terminal, or assignment | P1 |
| WS-56 | Restrict access to driver information | P0 |
| WS-57 | Restrict access to vehicles and fleet information | P1 |
| WS-58 | Control carrier and broker relationship management | P1 |
| WS-59 | Restrict access to rates, margins, and commercial terms | P0 |
| WS-60 | Control document viewing, uploading, editing, and deletion | P0 |
| WS-61 | Control invoices, payments, settlements, and financial records | P0 |
| WS-62 | Restrict compliance and safety records | P1 |
| WS-63 | Restrict reports and business performance information | P1 |
| WS-64 | Control bulk operations and data exports | P1 |
| WS-65 | Restrict sensitive customer and partner information | P1 |

## F. Security and Account Access

| ID | Feature | Priority |
|---|---|---|
| WS-66 | Require authentication for private workspace access | P0 |
| WS-67 | Enforce company membership before granting access | P0 |
| WS-68 | Support secure sign-in and account recovery | P0 |
| WS-69 | Support company security policies for authentication | P2 |
| WS-70 | Manage active sessions and revoke access when necessary | P1 |
| WS-71 | Require additional verification for sensitive actions where appropriate | P2 |
| WS-72 | Restrict sensitive financial and security settings | P0 |
| WS-73 | Prevent members from changing their own privileges improperly | P0 |
| WS-74 | Revoke company access promptly when a member is removed | P0 |
| WS-75 | Control access to confidential business information | P0 |
| WS-76 | Provide an overview of company access and security settings | P2 |

## G. Audit, Approvals, and Governance

| ID | Feature | Priority |
|---|---|---|
| WS-77 | Record important company administrative actions | P0 |
| WS-78 | Record member, role, and permission changes | P0 |
| WS-79 | Record sensitive operational and financial changes | P1 |
| WS-80 | Show who performed an action and when | P0 |
| WS-81 | Show before-and-after values for important changes | P1 |
| WS-82 | Search and filter audit records | P1 |
| WS-83 | Define approval requirements for sensitive actions | P2 |
| WS-84 | Support approval, rejection, and review history | P2 |
| WS-85 | Prevent prohibited self-approval | P2 |
| WS-86 | Export audit records for authorized review | P2 |

## H. Settings, Integrations, and Billing

| ID | Feature | Priority |
|---|---|---|
| WS-87 | Manage general company settings | P0 |
| WS-88 | Configure company-specific operational defaults | P1 |
| WS-89 | Manage notification preferences and company policies | P1 |
| WS-90 | Manage approved external service connections | P2 |
| WS-91 | Restrict who can manage integrations | P1 |
| WS-92 | Manage external connection credentials and access | P2 |
| WS-93 | Review integration activity and failures | P2 |
| WS-94 | Manage company subscription and plan information | P1 |
| WS-95 | Restrict billing and subscription management | P1 |
| WS-96 | View invoices and subscription history | P1 |
| WS-97 | Configure data retention and export policies | P2 |
| WS-98 | Provide enterprise-level company policies and administrative controls | P3 |

For every inventory item, determine whether it is implemented, partially implemented, UI-only, missing, or blocked. Do not assume the feature exists simply because a page or button is visible.

---

# 3. Company Roles

Evaluate these roles against the existing application.

| Role | Primary responsibility | Default access boundary |
|---|---|---|
| Owner | Company ownership and critical administration | Company-wide, subject to protected actions and mandatory policies |
| Admin | Day-to-day workspace administration | Company management, excluding protected Owner-only privileges unless explicitly authorized |
| Operations Manager | Oversee loads, dispatch, and operating teams | Authorized operational scope |
| Dispatcher | Manage dispatch activities | Assigned loads, teams, terminals, or explicitly authorized records |
| Fleet Manager | Manage vehicles, fleet assignments, and related operations | Authorized fleet and driver records |
| Accounting | Manage financial workflows | Authorized financial records and reports |
| Safety & Compliance | Manage safety and compliance information | Authorized compliance and related records |
| Driver | Perform assigned transportation work | Assigned loads and permitted personal information |
| Analyst | Review operational and business information | Authorized read-only information |
| Member | Basic company membership | No sensitive permissions by default |

External customers, carriers, brokers, and vendors must receive access appropriate to their business relationship. They must not automatically receive internal employee or administrator permissions.

### Role rules

- Owner and Admin are separate roles.
- Admin must not automatically receive ownership transfer or workspace closure privileges.
- Driver access must be narrow by default.
- Accounting access must not automatically grant security or ownership privileges.
- Team managers must not automatically receive company-wide administration.
- Custom roles must be constrained by the assigning user's authority.
- No role may bypass mandatory company isolation or business-state restrictions.

---

# 4. Permission Action Catalogue

Use resource-specific permissions. Do not rely on one broad permission such as "manage everything."

| Action | Meaning | Example |
|---|---|---|
| View | View permitted information | View a load |
| List | See authorized records in a list | View permitted loads |
| Create | Create a new record | Create a load |
| Edit | Change an existing record | Edit load details |
| Delete | Delete a record where allowed | Delete a draft record |
| Archive | Remove a record from normal active views while retaining it | Archive an inactive vehicle |
| Restore | Restore an archived record | Restore an archived record |
| Assign | Assign a record or responsibility | Assign a driver |
| Reassign | Transfer an existing assignment | Reassign a load |
| Invite | Invite a person to the company | Invite a dispatcher |
| Remove | Remove a person or association | Remove a member |
| Manage roles | Create, edit, or assign roles within permitted limits | Assign a role |
| Approve | Approve an eligible action | Approve a settlement |
| Reject | Reject an approval request | Reject a payment request |
| Export | Export authorized information | Export a permitted report |
| Manage settings | Change permitted company settings | Change company preferences |
| Manage security | Change permitted security policies | Update access policies |
| Manage billing | Manage subscription and billing | Review subscription details |
| Manage integrations | Manage external connections | Configure an integration |
| View audit | Review authorized history | Review role changes |
| Manage ownership | Perform protected ownership actions | Transfer company ownership |

### Permission resource catalogue

| Resource | Important permissions |
|---|---|
| Organization | View, edit, manage settings, close, transfer ownership |
| Member | List, view, invite, edit role, suspend, remove |
| Role | View, create, edit, assign, delete custom role |
| Team | View, create, edit, archive, manage membership |
| Terminal | View, create, edit, manage membership and scope |
| Load | View, create, edit, assign, reassign, archive |
| Driver | View, edit permitted profile information, manage assignments |
| Vehicle | View, create, edit, assign, manage fleet records |
| Carrier | View, create, edit, manage authorized relationships |
| Customer | View, create, edit, manage authorized relationships |
| Rate | View, create, edit, approve, export |
| Document | View, upload, edit, delete, export |
| Invoice | View, create, edit, approve, export |
| Settlement | View, create, edit, approve, finalize |
| Compliance | View, create, edit, approve, export |
| Report | View, create where supported, export |
| Integration | View, create, edit, revoke, review activity |
| Webhook | View, create, edit, revoke |
| Audit | View, search, export |
| Security | View, edit permitted policies, manage sessions |
| Billing | View, manage subscription, view invoices |
| Approval | View, request, approve, reject, cancel |

For each permission, document its exact behavior, scope, default roles, delegation rules, approval requirements, and audit requirements.

---

# 5. Complete Role-Permission Matrix

Use this matrix as the initial default-policy proposal. Verify and refine it against actual business workflows.

**Legend:**

- **Full:** Broad access within the company and mandatory policy boundaries.
- **Manage:** Manage the relevant area.
- **Scoped:** Only assigned, team, terminal, or otherwise permitted records.
- **Read:** View only.
- **Approve:** Approve eligible actions.
- **Limited:** Only explicitly granted actions.
- **None:** No default access.

| Capability | Owner | Admin | Ops Manager | Dispatcher | Fleet Manager | Accounting | Safety | Driver | Analyst |
|---|---|---|---|---|---|---|---|---|---|
| Company profile | Full | Manage | None | None | None | None | None | None | None |
| Members | Full | Manage | Read | None | None | None | None | None | None |
| Assign roles | Full | Limited | None | None | None | None | None | None | None |
| Custom roles | Full | Limited | None | None | None | None | None | None | None |
| Teams and terminals | Full | Manage | Manage | Read | Read | Read | Read | None | Read |
| Loads | Full | Manage | Manage | Scoped | Scoped | Read | Scoped | Assigned | Read |
| Dispatch assignments | Full | Manage | Manage | Scoped | Scoped | None | Read | Assigned | Read |
| Drivers | Full | Manage | Manage | Scoped | Manage | Limited | Manage | Own profile | Read |
| Vehicles and fleet | Full | Manage | Manage | Scoped | Manage | Read | Read | Assigned | Read |
| Carriers and partners | Full | Manage | Manage | Scoped | Read | Read | Read | None | Read |
| Rates and margins | Full | Manage | Limited | Limited | None | Manage | None | None | Limited |
| Documents | Full | Manage | Manage | Scoped | Scoped | Financial docs | Compliance docs | Assigned docs | Read |
| Invoices and settlements | Full | Manage | Limited | None | None | Manage | None | Own permitted records | Read |
| Safety and compliance | Full | Manage | Scoped | Read | Scoped | None | Manage | Own permitted records | Read |
| Reports | Full | Manage | Manage | Scoped | Scoped | Financial | Compliance | Own permitted records | Read |
| Integrations | Full | Manage | None | None | None | Limited | Limited | None | None |
| Audit history | Full | Manage | Limited | None | None | Financial audit | Compliance audit | None | Limited |
| Security settings | Full | Limited | None | None | None | None | None | None | None |
| Billing and subscription | Full | Limited | None | None | None | Read | None | None | None |
| Ownership transfer | Protected | None | None | None | None | None | None | None | None |
| Company closure | Protected | None | None | None | None | None | None | None | None |

### Matrix interpretation

1. `Limited` must be explicitly defined; it must not mean unrestricted management.
2. `Scoped` must enforce actual record boundaries.
3. `Assigned` must restrict the user to relevant assigned work.
4. `Full` does not override company isolation, mandatory approvals, or protected actions.
5. `Own profile` means the driver's own permitted information, not all driver records.
6. `Financial docs` and `Compliance docs` refer to the respective authorized document categories.
7. Admin privileges must not automatically include all Owner-only actions.
8. No role should automatically gain permission to export every accessible record.
9. Custom roles must not bypass delegation limits.
10. The matrix must be revised if an actual business workflow requires a different boundary.

---

# 6. Authorization Must Have Three Dimensions

## Dimension 1: What action can the user perform?

Examples include viewing a load, editing a rate, assigning a driver, approving a settlement, inviting a member, or exporting a report.

## Dimension 2: Which records can the user access?

| Scope | Meaning | Example |
|---|---|---|
| Company | Permitted records across the company | Owner or authorized company manager |
| Terminal | Records for an assigned terminal | Terminal dispatcher |
| Team | Records for an authorized team | Operations team manager |
| Assigned | Records assigned to the user or their responsibility | Driver or dispatcher |
| Self | The user's own permitted information | Driver profile |
| Specific resource | Records explicitly shared or assigned | External business participant |
| Field-level | Specific fields within a permitted record | Hide confidential margins from a dispatcher |

## Dimension 3: Is the action permitted in the current situation?

| Scenario | Expected restriction |
|---|---|
| A dispatcher attempts to edit a finalized financial record | Deny |
| An accounting user prepares a payment that requires another approver | Permit preparation; require separate approval |
| A driver tries to access another driver's assigned load | Deny |
| An administrator assigns privileges beyond their authority | Deny |
| A user attempts to change a restricted record outside their terminal | Deny |
| A member is removed from the company | Revoke company access |
| An action requires an approval that has not been granted | Prevent completion |

The final decision must consider role, scope, and business rules together.

---

# 7. Mandatory Security Requirements

## Company isolation

Prevent users from viewing, editing, deleting, or exporting records belonging to another company unless a narrowly defined and authorized cross-company business relationship explicitly permits access.

## Privilege escalation

Prevent users from:

- Granting themselves a higher role.
- Granting permissions beyond their delegation authority.
- Assigning unauthorized ownership privileges.
- Removing or demoting the last Owner.
- Bypassing restrictions through another workflow.
- Expanding their own record scope without authorization.

## Access revocation

When membership is removed or suspended:

- Company access must be revoked promptly.
- Previously authorized actions must no longer be available.
- Existing business records must remain intact.
- Work assignments must be transferable where appropriate.
- Audit history must remain available to authorized reviewers.
- Membership in other companies must remain unaffected.

## Sensitive actions

Explicitly protect ownership transfer, workspace closure, critical security changes, permission changes, financial approvals, finalized financial records, confidential data exports, integration credentials, and high-impact operational changes.

## Platform separation

- Company Owners must not receive platform-wide administration.
- Company administrators must not change platform-wide policies.
- Platform support access must be controlled and auditable.
- Platform access must not silently bypass company isolation.

---

# 8. Audit History and Approval Workflows

## Audit history must cover

- Invitations and membership changes.
- Role and permission changes.
- Company settings changes.
- Team and terminal changes.
- Security policy changes.
- Sensitive operational changes.
- Rates and commercial terms.
- Financial records.
- Approval decisions.
- Integration changes.
- Data exports.
- Ownership transfer and workspace closure.
- Authorized support access to sensitive information.

Each event should identify the actor, timestamp, action, affected record, outcome, and relevant before-and-after values where appropriate.

## Approval workflows must support

- Configurable approval requirements.
- Threshold-based policies.
- Pending, approved, rejected, cancelled, and expired states.
- Assigned approvers.
- Rejection reasons.
- Approval history.
- Escalation or reassignment.
- Separation of duties.
- Prevention of prohibited self-approval.
- Audit records for decisions.

Approval rules must be enforced consistently across all supported ways of initiating an action.

---

# 9. Recommended Workspace Navigation

| Section | Purpose | Example contents |
|---|---|---|
| Main Dashboard | Daily operations | Loads, dispatch, tracking, exceptions |
| Company Profile | Company identity | Name, logo, business details, preferences |
| People & Access | Membership and roles | Members, invitations, roles, permissions |
| Teams & Terminals | Company structure | Departments, teams, locations, assignments |
| Operations Settings | Operational configuration | Defaults, company workflows, policies |
| Security & Audit | Security oversight | Access policies, sessions, audit history |
| Approvals & Workflows | Sensitive action governance | Approval rules, requests, decisions |
| Integrations | External services | Connections, permissions, activity |
| Plan & Billing | Subscription management | Plan, invoices, billing access |

Only authorized users should see and access the relevant settings and actions. Page visibility must never replace authorization enforcement.

---

# 10. Implementation Roadmap

| Phase | Scope | Required outcome |
|---|---|---|
| Phase 0 | Audit existing application | Verified feature coverage, risk register, permission matrix, implementation plan |
| Phase 1 | Workspace foundation | Company identity, membership, invitations, ownership, lifecycle |
| Phase 2 | Permission model | Roles, permissions, scopes, delegation, enforcement |
| Phase 3 | People and settings | Member management, roles, teams, terminals, company settings |
| Phase 4 | TMS operational access | Loads, dispatch, drivers, fleet, documents, finance, compliance |
| Phase 5 | Governance | Audit history, approvals, separation of duties |
| Phase 6 | Integrations and billing | Integration controls, subscription, billing permissions |
| Phase 7 | Enterprise capabilities | Custom roles, delegated administration, multi-terminal policies, advanced governance |
| Phase 8 | Security verification | Cross-company isolation, revocation, privilege escalation, negative tests |

Do not implement all phases in a single operation.

---

# 11. Phase 0 Audit Deliverables

The first deliverable must be an evidence-based report.

## A. Existing functionality report

Classify every relevant feature as:

- Implemented and verified.
- Partially implemented.
- Interface only; enforcement not verified.
- Missing.
- Blocked or requiring clarification.

Explain the evidence supporting each classification.

## B. Current roles and permissions

List existing roles, assigned capabilities, current access boundaries, excessive privileges, missing restrictions, and duplicated rules.

Clearly distinguish confirmed existing behavior from proposed behavior.

## C. Feature coverage

Compare the existing application against WS-01 through WS-98.

| Required field | Description |
|---|---|
| Feature ID | WS identifier |
| Feature name | Requirement name |
| Current status | Verified, partial, UI-only, missing, or blocked |
| Evidence | What was inspected and verified |
| Missing requirements | What remains incomplete |
| Dependencies | Prerequisite features |
| Priority | P0, P1, P2, or P3 |
| Next action | Proposed resolution |

## D. Company isolation analysis

Explain how the current application identifies the active company, verifies membership, restricts records, and revokes access. Identify any unverified security boundaries.

## E. Detailed permission matrix

Provide the role-by-resource-by-action matrix. Include scopes, delegation authority, approval requirements, and audit requirements.

## F. Risk register

| Field | Description |
|---|---|
| Risk ID | Unique reference |
| Description | What could go wrong |
| Severity | Critical, high, medium, or low |
| Evidence | Verified finding |
| Business impact | Potential consequence |
| Affected roles/resources | Who or what is affected |
| Recommendation | Proposed resolution |
| Verification | How the fix will be tested |

Prioritize cross-company data exposure, privilege escalation, excessive financial access, ownership risks, incomplete access revocation, missing approval enforcement, and incomplete audit history.

## G. Dependency map

Identify which existing features must be completed before later features can be implemented safely.

Examples:

- Company membership precedes company-specific authorization.
- Record scopes precede safe multi-terminal access.
- Permission enforcement precedes custom roles.
- Audit coverage accompanies sensitive administrative actions.
- Approval workflows depend on clear action permissions and responsible approvers.

## H. Phase 1 plan

Include:

- Exact feature scope.
- Dependencies.
- Expected user-visible behavior.
- Business rules.
- Acceptance criteria.
- Security checks.
- Positive and negative tests.
- Risks.
- Questions requiring a product decision.

---

# 12. Implementation Rules

After Phase 0 is approved:

1. Implement one approved phase at a time.
2. Preserve working functionality.
3. Reuse existing supported workspace and membership capabilities when appropriate.
4. Avoid duplicate roles, conflicting permissions, and parallel systems.
5. Enforce authorization for every protected action.
6. Verify membership, role, data scope, and business rules.
7. Ensure access changes take effect appropriately.
8. Maintain audit history for sensitive actions.
9. Test both permitted and prohibited access.
10. Document completed work, remaining gaps, and risks.
11. Request clarification for ambiguous critical business rules.
12. Do not make irreversible product decisions without approval.

## Required verification scenarios

| Test | Expected result |
|---|---|
| Owner changes company settings | Allowed |
| Driver accesses company-wide financial records | Denied |
| Dispatcher accesses loads outside authorized scope | Denied |
| Admin attempts an Owner-only action | Denied unless explicitly authorized |
| Member grants themselves higher privileges | Denied |
| Removed member accesses the company | Denied |
| Company A member accesses Company B's private records | Denied |
| Restricted member exports confidential information | Denied |
| User performs an action requiring an ungranted approval | Denied |
| Team manager bypasses terminal restrictions | Denied |
| Role change unintentionally expands privileges | Prevented |
| Platform administration is used to obtain invisible unrestricted company access | Prevented |

Tests must verify actual behavior, not merely whether the interface hides or shows controls.

---

# 13. Definition of Success

The completed workspace must allow transportation companies to manage people, roles, permissions, operating structures, TMS operations, security policies, approvals, integrations, and billing.

Every user must be restricted by their role, authorized record scope, and applicable business rules.

Company data must remain isolated. Sensitive actions must be controlled. Access revocation must work. Critical actions must be auditable.

Enterprise readiness must be based on verified behavior, not on the number of settings pages or features displayed.

# FINAL EXECUTION INSTRUCTION

**Start with Phase 0 only.**

Audit the existing application and return:

1. The existing functionality report.
2. The current roles and permissions report.
3. The complete WS-01 through WS-98 feature coverage table.
4. The company isolation analysis.
5. The detailed role-permission matrix.
6. The risk register.
7. The dependency map.
8. The prioritized Phase 1 implementation plan.

Do not modify files, change existing behavior, create pages, run destructive operations, or implement features during Phase 0.

Clearly distinguish verified existing functionality from proposed requirements.

After presenting the complete audit and plan, stop and wait for explicit approval before starting Phase 1.