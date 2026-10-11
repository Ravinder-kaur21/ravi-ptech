# ADDENDUM — AUDIT EVIDENCE PROTOCOL AND STANDARDIZED PERMISSION MATRIX

These requirements are mandatory for Phase 0 and every subsequent implementation phase. They supplement the existing workspace feature inventory, role definitions, permission catalogue, and implementation roadmap. They do not replace or redefine existing product requirements unless explicitly approved.

---

# PART A — AUDIT EVIDENCE PROTOCOL

## A1. Purpose

Every audit conclusion must be traceable to evidence from the existing application.

Do not claim that a feature is implemented, secure, complete, or working merely because:

- A page or component exists.
- A button is visible.
- A role name appears in the interface.
- A permission is declared in a configuration file.
- A test file exists.
- A function appears to implement the intended behavior.
- A developer comment claims the feature is complete.
- A successful test covers only one access path.

Distinguish what exists, what is enforced, what has been tested, and what remains unknown.

## A2. Required Audit Status Values

Use exactly one primary status for every audited feature.

| Status | Definition | Minimum evidence required |
|---|---|---|
| VERIFIED | The relevant behavior has been demonstrated and the required enforcement has been inspected or tested | Direct evidence plus a successful verification appropriate to the feature |
| PARTIAL | Some required behavior works, but one or more acceptance criteria are incomplete | Evidence of working behavior and explicit evidence or identification of remaining gaps |
| UI_ONLY | The interface exists, but the underlying business behavior or access enforcement has not been demonstrated | Evidence of the interface; enforcement remains unverified |
| MISSING | The required capability was searched for systematically and no implementation was found within the documented inspection scope | Recorded search locations, inspected areas, and search limitations |
| BLOCKED | Verification cannot be completed because of a missing dependency, unavailable environment, inaccessible service, insufficient permissions, or another explicit blocker | Exact blocker, attempted verification, and what is needed to proceed |

### Status rules

1. `VERIFIED` means the stated acceptance criteria were verified, not that the entire product is universally secure.
2. `PARTIAL` must identify both completed and incomplete requirements.
3. `UI_ONLY` must not be used when the underlying behavior has been verified but only some interface details are missing.
4. `MISSING` must not be assigned merely because the agent failed to locate something during a superficial search.
5. `BLOCKED` must not be used to conceal incomplete inspection.
6. If a feature cannot be evaluated because inspection was incomplete, report that limitation explicitly and do not claim it is missing.
7. Do not merge statuses. If a feature has independently assessable subfeatures, record each separately.

## A3. Evidence Types

Assign one or more evidence types to each finding.

| Code | Evidence type | What it establishes |
|---|---|---|
| SRC | Source inspection | Relevant implementation or configuration exists |
| UI | Interface inspection | A user-facing page or control exists |
| FLOW | End-to-end workflow inspection | The user journey and connected behavior were inspected |
| TEST | Automated test evidence | A relevant test was executed and its result recorded |
| RUN | Runtime verification | Actual application behavior was observed during execution |
| DB | Data and persistence inspection | Relevant stored relationships, records, or constraints were inspected |
| AUTH | Authorization enforcement inspection | The relevant action enforces identity, membership, permissions, and scope as required |
| LOG | Runtime or audit logs | Recorded behavior or outcomes support the finding |
| DOC | Existing project documentation | Requirements or intended behavior are documented |
| EXT | External dependency or service evidence | An external service or dependency was inspected or verified |

Documentation and source inspection alone do not prove runtime behavior. A successful UI workflow does not, by itself, prove that unauthorized access is prevented.

## A4. Evidence Reference Format

Every material audit finding must receive a stable reference ID.

Use this format:

`AUD-[CATEGORY]-[NUMBER]`

Examples:

- `AUD-WS-001` — Company workspace creation.
- `AUD-AUTH-001` — Company membership enforcement.
- `AUD-PERM-001` — Role permission enforcement.
- `AUD-DATA-001` — Cross-company data isolation.
- `AUD-TEST-001` — Authorization test results.

For each finding, record:

| Field | Required content |
|---|---|
| Evidence ID | Unique audit reference |
| Feature ID | Relevant WS-01 through WS-98 identifier or security requirement |
| Finding | Specific factual statement |
| Status | One standardized audit status |
| Evidence type | SRC, UI, FLOW, TEST, RUN, DB, AUTH, LOG, DOC, or EXT |
| Location | Exact file path, page, function, configuration section, or test name when available |
| Evidence detail | What was actually observed |
| Verification | Test or inspection performed and its result |
| Limitations | What the evidence does not establish |
| Recommendation | Next action, if required |

For source evidence, include the exact file path and relevant symbol, section, or line range when available. For runtime evidence, identify the scenario and result. For tests, identify the test and whether it passed, failed, was skipped, or could not run.

Never fabricate file paths, line numbers, test results, runtime behavior, database contents, or evidence references.

## A5. Required Verification Procedure

For every feature:

1. Identify its acceptance criteria from the workspace specification.
2. Locate the relevant interface, behavior, authorization rules, data relationships, and tests.
3. Record the locations inspected.
4. Inspect the actual implementation rather than relying only on names or comments.
5. Determine whether the feature has both the intended behavior and the necessary access restrictions.
6. Execute relevant existing tests when the environment permits.
7. Perform targeted runtime verification where practical.
8. Record successful checks, failed checks, skipped checks, and unavailable checks separately.
9. Assign the primary status based on the evidence.
10. Document gaps and the next verification or implementation action.

During Phase 0, use read-only inspection. Do not alter application files, production data, existing permissions, or business behavior.

Do not run destructive commands, change access policies, modify live company data, or perform production actions to prove a hypothesis.

If a test requires a database, credentials, external service, or unavailable environment, report the blocker rather than inventing a result.

## A6. Security Evidence Protocol

For every critical authorization requirement, distinguish these questions:

1. Does the relevant permission exist?
2. Is the permission assigned to the intended role?
3. Is it checked when the action is performed?
4. Is company membership verified?
5. Is the requested record within the user's permitted scope?
6. Are applicable business-state and approval rules enforced?
7. Is the same protection applied to alternate action paths?
8. Has the allowed case been tested?
9. Has the prohibited case been tested?
10. Is the result recorded in audit history when required?

A positive test proves only the tested allowed scenario. It does not establish that unauthorized scenarios are blocked.

For critical security findings, provide both positive and negative test evidence where the environment permits.

### Mandatory security scenarios

- A member of Company A attempts to access Company B's private records.
- A user attempts an action without the required permission.
- A user attempts to access a record outside their team or terminal scope.
- A driver attempts to access another driver's restricted records.
- An Admin attempts an Owner-only action.
- A user attempts to grant themselves additional privileges.
- A removed member attempts to reuse existing access.
- A user attempts an unauthorized financial export.
- A user attempts to bypass a required approval.
- A user attempts to change a finalized or otherwise restricted record.
- A company administrator attempts a platform-only administrative action.
- A privileged user performs an action that must create an audit record.

If any scenario cannot be executed, report `NOT TESTED` and explain why. Do not interpret an untested scenario as a pass.

## A7. Coverage and Evidence Completeness

For each inventory item WS-01 through WS-98, provide a feature-level status and an evidence reference.

Where an inventory item contains multiple independent acceptance criteria, include a subfeature checklist. Do not mark the entire item `VERIFIED` if a mandatory criterion remains unverified.

Use the following verification states for individual acceptance criteria:

- `PASS` — The criterion was verified successfully.
- `FAIL` — The criterion was tested and failed.
- `NOT TESTED` — The criterion was not tested.
- `BLOCKED` — The criterion could not be tested because of a documented blocker.
- `NOT APPLICABLE` — The criterion does not apply, with a written justification.

A skipped test is not a pass. A test that cannot run is not a pass. An absence of observed errors is not proof of correct behavior.

## A8. Required Audit Deliverables

Provide:

1. Feature coverage for WS-01 through WS-98.
2. Evidence references for every material finding.
3. A current-role and permission report.
4. A company-isolation assessment.
5. A detailed authorization enforcement assessment.
6. A security risk register.
7. An inventory of tests executed and their results.
8. A list of untested requirements and blockers.
9. A dependency map.
10. A prioritized Phase 1 implementation plan.

The report must distinguish verified facts, observed failures, assumptions, recommendations, and unresolved questions.

---

# PART B — STANDARDIZED PERMISSION MATRIX

## B1. Purpose

Use one consistent permission vocabulary throughout the product specification, role matrix, audit report, implementation plan, interface descriptions, and tests.

Do not use ambiguous values such as `Full`, `Manage`, `Limited`, `Assigned`, or `Scoped` as executable permission values.

Those words may describe a business role's overall responsibility, but they do not specify an exact authorization decision.

The permission matrix must explicitly define:

- Resource.
- Action.
- Grant status.
- Data scope.
- Conditions.
- Delegation rules.
- Approval requirements.
- Audit requirements.

## B2. Canonical Grant Values

Use exactly the following values in the normalized permission matrix.

| Value | Meaning | Authorization result |
|---|---|---|
| `ALLOW` | The action is permitted when all other mandatory checks pass | Permit the action within the specified scope and conditions |
| `DENY` | The action is explicitly prohibited | Reject the action |
| `INHERIT` | No explicit decision is made at this level; evaluate the defined parent or default policy | Continue through the documented policy-resolution process |

### Rules

1. `ALLOW` is not a bypass for company membership, data scope, business rules, or mandatory approvals.
2. `DENY` must override an inherited or broader grant within the same authorization policy.
3. `INHERIT` must resolve through a deterministic, documented policy.
4. An unresolved permission must never default to `ALLOW`.
5. When no valid grant exists, access must be denied.
6. The policy must not silently convert an invalid or unknown permission into an unrestricted grant.
7. Explicit denials, inherited rules, and default-deny outcomes must be distinguishable in authorization explanations and audit records where appropriate.
8. Do not interpret an absent matrix row as an implicit grant.

For the initial policy, use **default deny**. Access is granted only when an applicable, valid permission explicitly authorizes it.

## B3. Canonical Action Values

Use these standardized actions when applicable:

| Action | Definition |
|---|---|
| `list` | Retrieve a list of authorized records |
| `read` | View a specific authorized record |
| `create` | Create a new record |
| `update` | Modify an existing record |
| `delete` | Permanently remove a record where permitted |
| `archive` | Archive a record |
| `restore` | Restore an archived record |
| `assign` | Assign a record or responsibility |
| `reassign` | Change an existing assignment |
| `invite` | Invite a person to the company |
| `remove` | Remove a person or association |
| `manage_roles` | Manage roles within the user's authority |
| `approve` | Approve an eligible action or request |
| `reject` | Reject an eligible action or request |
| `export` | Export authorized information |
| `manage_settings` | Change permitted company settings |
| `manage_security` | Change permitted security settings |
| `manage_billing` | Manage permitted billing operations |
| `manage_integrations` | Manage permitted external connections |
| `view_audit` | View authorized audit history |
| `manage_ownership` | Perform authorized ownership operations |

Only define actions that make sense for the resource. For example, a document may support `read`, `create`, `update`, `delete`, `archive`, `restore`, and `export`, while company ownership may support a specialized ownership operation.

Do not treat `manage` as an unrestricted shortcut that silently grants every action.

## B4. Canonical Scope Values

Use these standardized scope values.

| Scope | Definition |
|---|---|
| `COMPANY` | Authorized records across the company |
| `TERMINAL` | Authorized records associated with permitted terminals |
| `TEAM` | Authorized records associated with permitted teams |
| `ASSIGNED` | Records assigned to the user or responsibilities they are explicitly authorized to manage |
| `SELF` | The user's own permitted profile or personal records |
| `RESOURCE` | Specific records explicitly granted or shared |
| `FIELD` | Specific fields within an otherwise authorized record |
| `NONE` | No record access |

### Scope rules

1. Every data-access permission must have an explicit scope.
2. Administrative permissions that operate on company-wide resources must still validate company membership and the intended company.
3. A `COMPANY` scope must never mean access to every company on the platform.
4. `TERMINAL` and `TEAM` scopes must validate actual membership or authorized management responsibility.
5. `ASSIGNED` must verify the relevant assignment or responsibility at the time of the action.
6. `SELF` must not expose other members' personal information.
7. `RESOURCE` must verify the specific sharing or assignment relationship.
8. `FIELD` must identify the fields that may be accessed or modified.
9. `NONE` means no access; it is not a missing or unresolved scope.
10. Scope does not independently grant an action. The corresponding action must also be authorized.

When a user has access through multiple permitted scopes, calculate the effective scope according to an explicitly defined policy. Do not assume that all scopes are automatically combined into company-wide access.

## B5. Canonical Condition Values

Record relevant business conditions separately from permission grants.

| Condition | Meaning |
|---|---|
| `NO_EXTRA_CONDITION` | No additional resource-specific business condition |
| `RECORD_STATE_ALLOWED` | The record is in a state where the action is permitted |
| `ASSIGNMENT_REQUIRED` | The user must have the required assignment or responsibility |
| `APPROVAL_REQUIRED` | The action cannot complete until the required approval is satisfied |
| `THRESHOLD_POLICY` | The action is subject to a configured threshold |
| `SEPARATION_OF_DUTIES` | The actor and approver must satisfy separation-of-duties rules |
| `RESOURCE_RELATIONSHIP_REQUIRED` | An authorized relationship to the resource must exist |
| `EXPLICIT_POLICY_REQUIRED` | A separate company policy must explicitly authorize the action |

These conditions are identifiers for requirements, not automatic proof that a condition has been enforced. The implementation and audit must establish how each condition is evaluated.

If an action has multiple conditions, all mandatory conditions must be satisfied unless a documented policy explicitly defines a different rule.

## B6. Canonical Delegation Values

Use these values for permission delegation.

| Value | Meaning |
|---|---|
| `NO_DELEGATION` | The permission cannot be delegated by the user |
| `DELEGATION_ALLOWED` | The permission may be delegated within explicitly defined limits |
| `OWNER_CONTROLLED` | Only an authorized Owner or designated ownership process may delegate it |
| `POLICY_CONTROLLED` | Delegation is governed by an explicit company policy |

A user must not delegate privileges beyond their own authority.

Delegation does not transfer ownership automatically, bypass approval requirements, or override company isolation.

## B7. Canonical Approval Values

| Value | Meaning |
|---|---|
| `NOT_REQUIRED` | No additional approval is required for the action |
| `REQUIRED` | An authorized approval must be completed |
| `CONDITIONAL` | Approval is required only when a documented condition is met |

For `CONDITIONAL`, identify the triggering rule. Examples include a financial threshold, a restricted record state, or a separation-of-duties requirement.

Do not assume an approval has occurred because an approval interface exists. Verify the actual action restriction and approval outcome.

## B8. Canonical Audit Values

| Value | Meaning |
|---|---|
| `AUDIT_REQUIRED` | The action must create an audit event |
| `AUDIT_NOT_REQUIRED` | The action is not required to create an individual audit event under the defined policy |
| `AUDIT_INHERITED` | The requirement is determined by a documented resource or action policy |

For sensitive administrative, financial, security, ownership, and access-control actions, default to `AUDIT_REQUIRED` unless an approved policy documents a justified exception.

Audit requirements do not permit recording secrets or unnecessarily exposing confidential information in audit events.

---

# PART C — REQUIRED NORMALIZED PERMISSION MATRIX

## C1. Required Matrix Schema

For every permission, use these columns:

| Column | Required value |
|---|---|
| Permission ID | Stable unique identifier |
| Resource | The protected resource |
| Action | A canonical action value |
| Role | The applicable company role |
| Grant | `ALLOW`, `DENY`, or `INHERIT` |
| Scope | A canonical scope value |
| Conditions | Canonical conditions or an explicitly documented condition set |
| Delegation | A canonical delegation value |
| Approval | `NOT_REQUIRED`, `REQUIRED`, or `CONDITIONAL` |
| Audit | `AUDIT_REQUIRED`, `AUDIT_NOT_REQUIRED`, or `AUDIT_INHERITED` |
| Rationale | Why the role needs or is denied the permission |
| Verification | Required positive and negative test scenarios |

Every row must describe one role, one resource, and one action. Do not combine several actions into a single ambiguous cell.

## C2. Illustrative Permission Matrix

The following examples illustrate the required precision. They are proposed policy examples, not evidence that the existing application already enforces these permissions.

| Permission ID | Resource | Action | Role | Grant | Scope | Conditions | Delegation | Approval | Audit |
|---|---|---|---|---|---|---|---|---|---|
| PERM-ORG-001 | Organization | read | Owner | ALLOW | COMPANY | NO_EXTRA_CONDITION | NO_DELEGATION | NOT_REQUIRED | AUDIT_INHERITED |
| PERM-ORG-002 | Organization | update | Owner | ALLOW | COMPANY | NO_EXTRA_CONDITION | NO_DELEGATION | NOT_REQUIRED | AUDIT_REQUIRED |
| PERM-ORG-003 | Organization | update | Dispatcher | DENY | NONE | EXPLICIT_POLICY_REQUIRED | NO_DELEGATION | NOT_REQUIRED | AUDIT_INHERITED |
| PERM-MEM-001 | Member | invite | Admin | ALLOW | COMPANY | NO_EXTRA_CONDITION | NO_DELEGATION | NOT_REQUIRED | AUDIT_REQUIRED |
| PERM-ROLE-001 | Role | manage_roles | Admin | ALLOW | COMPANY | EXPLICIT_POLICY_REQUIRED | POLICY_CONTROLLED | NOT_REQUIRED | AUDIT_REQUIRED |
| PERM-LOAD-001 | Load | read | Dispatcher | ALLOW | TERMINAL | RESOURCE_RELATIONSHIP_REQUIRED | NO_DELEGATION | NOT_REQUIRED | AUDIT_INHERITED |
| PERM-LOAD-002 | Load | update | Dispatcher | ALLOW | ASSIGNED | ASSIGNMENT_REQUIRED | NO_DELEGATION | CONDITIONAL | AUDIT_REQUIRED |
| PERM-LOAD-003 | Load | read | Driver | ALLOW | ASSIGNED | ASSIGNMENT_REQUIRED | NO_DELEGATION | NOT_REQUIRED | AUDIT_INHERITED |
| PERM-RATE-001 | Rate | read | Accounting | ALLOW | COMPANY | RESOURCE_RELATIONSHIP_REQUIRED | NO_DELEGATION | NOT_REQUIRED | AUDIT_INHERITED |
| PERM-RATE-002 | Rate | read | Driver | DENY | NONE | EXPLICIT_POLICY_REQUIRED | NO_DELEGATION | NOT_REQUIRED | AUDIT_INHERITED |
| PERM-SETTLE-001 | Settlement | approve | Accounting | ALLOW | COMPANY | SEPARATION_OF_DUTIES | NO_DELEGATION | REQUIRED | AUDIT_REQUIRED |
| PERM-AUDIT-001 | Audit | view_audit | Owner | ALLOW | COMPANY | NO_EXTRA_CONDITION | NO_DELEGATION | NOT_REQUIRED | AUDIT_INHERITED |
| PERM-BILL-001 | Billing | manage_billing | Admin | INHERIT | COMPANY | EXPLICIT_POLICY_REQUIRED | POLICY_CONTROLLED | NOT_REQUIRED | AUDIT_REQUIRED |

**Important:** These rows are examples of format and semantics. Verify the actual business rules before adopting them. In particular, determine whether an Admin may manage roles, whether a dispatcher may update assigned loads, and which actions require approval.

## C3. Permission Resolution Rules

Define and document one deterministic permission-resolution process.

The process must:

1. Establish the authenticated user.
2. Establish the intended company.
3. Verify current company membership and membership status.
4. Identify the requested resource and action.
5. Identify the applicable role or authorized roles.
6. Resolve explicit permission grants, denials, and inherited policies.
7. Validate record scope.
8. Validate required resource relationships and assignments.
9. Evaluate record-state and business conditions.
10. Enforce mandatory approval requirements.
11. Enforce protected-action and delegation restrictions.
12. Record the outcome where audit is required.
13. Permit the action only if every mandatory requirement passes.

An unresolved permission, missing company membership, invalid scope, failed condition, or unsatisfied mandatory approval must not produce access.

### Conflict rules

- Explicit `DENY` must not be overridden by `ALLOW` or `INHERIT` within the same applicable policy.
- `INHERIT` must follow the documented policy-resolution order.
- An absent grant must default to deny.
- Multiple roles must not automatically produce unrestricted access.
- If multiple roles are supported, document how grants and denials combine.
- Mandatory security restrictions must override ordinary role grants.
- No role grant can override a required approval or an invalid record state.
- Scope must be evaluated independently from action permission.
- Company isolation must be enforced independently from role assignment.
- Do not invent wildcard permissions or implicit superuser access.

If the existing application uses a different model, document its behavior and propose a safe, explicit migration plan rather than silently changing semantics during the audit.

---

# PART D — CONSISTENT ROLE MATRIX PRESENTATION

## D1. Human-Readable Role Summary

The existing summary matrix may continue to use descriptive labels such as Owner, Admin, Manage, Scoped, or Read for readability.

However, these labels must not be treated as executable permission values.

Every human-readable cell must map to the detailed normalized permission rows.

| Summary label | Required interpretation |
|---|---|
| Full | A documented collection of explicit `ALLOW` grants; never an unrestricted wildcard |
| Manage | The exact authorized actions for that resource, defined individually |
| Scoped | Explicit actions with a defined scope such as `TEAM`, `TERMINAL`, or `ASSIGNED` |
| Read | Explicit `read` and, where appropriate, `list` grants |
| Limited | A documented subset of actions; never an undefined grant |
| Approve | An explicit `approve` grant plus all required approval conditions |
| None | Explicit `DENY` or no applicable grant under default-deny policy |

Do not leave `Limited`, `Manage`, or `Scoped` undefined.

## D2. Matrix Validation Rules

Before accepting the permission matrix, verify:

- Every permission has a unique identifier.
- Every action uses the canonical vocabulary or has a documented exception.
- Every grant uses `ALLOW`, `DENY`, or `INHERIT`.
- Every data-access permission has a valid scope.
- Every condition is documented.
- Every delegation rule has an explicit value.
- Every approval requirement has an explicit value.
- Every audit requirement has an explicit value.
- No role receives privileges beyond its approved responsibility.
- No Admin receives protected Owner privileges by implication.
- No Driver receives company-wide financial or administrative access by default.
- No role can bypass company isolation.
- Sensitive actions have appropriate audit and approval requirements.
- Every permission can be linked to verification scenarios.
- The readable role matrix agrees with the normalized permission matrix.
- Unknown, missing, and conflicting permissions fail safely.

---

# PART E — PHASE 0 AUDIT OUTPUT REQUIREMENTS

The Phase 0 report must include all of the following.

## E1. Feature Coverage Table

Include every feature from WS-01 through WS-98.

Required columns:

`Feature ID | Feature | Priority | Status | Evidence IDs | Acceptance Criteria | Gaps | Next Action`

Do not omit inventory rows. If a feature cannot be assessed, use the appropriate status and document why.

## E2. Evidence Register

Required columns:

`Evidence ID | Feature ID | Finding | Evidence Type | Location | Evidence Detail | Verification Result | Limitations`

Every material conclusion in the report must refer to one or more evidence IDs.

## E3. Current Role Matrix

Document the actual existing roles and permissions as observed.

Required columns:

`Role | Resource | Action | Current Behavior | Scope | Evidence IDs | Verification Status | Gap`

Do not replace observed behavior with the proposed final policy.

## E4. Proposed Permission Matrix

Include the normalized matrix defined in Part C.

Required columns:

`Permission ID | Resource | Action | Role | Grant | Scope | Conditions | Delegation | Approval | Audit | Rationale | Verification`

## E5. Security Test Matrix

Required columns:

`Test ID | Security Requirement | Actor | Target Company | Target Resource | Attempted Action | Expected Result | Actual Result | Evidence ID | Test Status`

Use `PASS`, `FAIL`, `NOT TESTED`, `BLOCKED`, or `NOT APPLICABLE` for test status.

## E6. Risk Register

Required columns:

`Risk ID | Description | Severity | Evidence IDs | Business Impact | Affected Resources | Recommendation | Verification Plan`

## E7. Implementation Plan

For each proposed phase, document:

- Features included.
- Existing behavior to preserve.
- Dependencies.
- Required permission changes.
- User-visible changes.
- Acceptance criteria.
- Positive tests.
- Negative tests.
- Audit requirements.
- Risks.
- Outstanding decisions.

---

# PART F — EXECUTION RULES

## Phase 0

Perform read-only inspection.

Do not:

- Modify application files.
- Change role assignments.
- Change permissions.
- Modify company data.
- Perform production mutations.
- Run destructive commands.
- Claim untested behavior is verified.
- Invent evidence, test results, or file locations.
- Implement a new permission system.
- Begin Phase 1 without approval.

## After Phase 0 approval

Proceed one approved phase at a time.

For every implemented feature:

1. Define acceptance criteria.
2. Define the relevant normalized permission rows.
3. Identify all protected action paths.
4. Implement or update the behavior.
5. Test permitted actions.
6. Test prohibited actions.
7. Verify scope and company isolation.
8. Verify approval and audit requirements.
9. Record evidence and results.
10. Report remaining gaps before proceeding.

# FINAL INSTRUCTION

Start with Phase 0 only.

Return the complete WS-01 through WS-98 coverage table, evidence register, current role matrix, normalized proposed permission matrix, security test matrix, risk register, dependency map, and prioritized Phase 1 plan.

All conclusions must follow the evidence protocol. All proposed permissions must follow the standardized permission vocabulary.

Clearly separate verified existing behavior from proposed policy. Do not modify the application until the audit has been reviewed and Phase 1 has been explicitly approved.