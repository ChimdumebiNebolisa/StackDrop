# StackDrop Guardrails

Version: v1.0  
Status: Active  
Date: 2026-05-12

## 1. Purpose

These guardrails define what is forbidden during implementation and what evidence is required before any success claim can be made.

A guardrail is valid only if it can be checked.

## 2. Scope control rules

- No feature may be added unless it already exists in the current PRD.
- If implementation reveals a missing requirement, stop and update the PRD before coding that behavior.
- Only PRD must-have items may enter the initial Plan.
- Should-have and nice-to-have items are forbidden until all must-have items are verified.

## 3. Boundary control rules

- No module ownership change is allowed unless the Architecture is updated first.
- UI code must not write directly to the database.
- UI code must not contain business rules for capture, organization, removal, or search policy.
- Application services must not be bypassed for core item workflows.
- OS-specific code must stay inside the Tauri boundary.
- No remote backend, cloud service, or auth flow may be introduced.

## 4. Implementation rules

- No unrelated refactors.
- No placeholder logic in any core path.
- No duplicate business logic across UI, domain, or data layers.
- No silent failures.
- Every failure path must return a visible, explicit error state, logged detail, or both.
- Validation, parsing decisions, routing decisions, and policy checks must use deterministic logic.
- AI must not be introduced anywhere in v1.
- Core paths must handle success, failure, and loading or processing states where applicable.

## 5. Verification rules

- Never claim a behavior works without a verification artifact.
- A step is not done until its stated verification passes.
- If verification fails, the step remains active or blocked.
- If verification is partial, the report must state exactly what was verified and what was not.
- If a change regresses a previously verified behavior, fix it or explicitly accept the regression before moving on.

## 6. Required verification artifacts

Acceptable verification artifacts are:
- unit test result
- integration test result
- manual UI check result
- lint result
- typecheck result
- sample input and output result
- screenshot
- log or CLI output

Claims without one of the artifacts above are unverified.

## 7. Minimum verification required for core flows

### Capture flows
#### Create note
Required evidence:
- one unit or integration test for persistence of created note
- one manual UI check showing note creation and list visibility

#### Save link
Required evidence:
- one unit or integration test for saved link record
- one manual UI check showing link creation and detail visibility

#### Import file
Required evidence:
- one integration test or sample import result for each supported file type path touched in the step
- one manual UI check showing imported file visibility
- one explicit parse failure check for unsupported or failed extraction path if that behavior was changed

### Search flows
Required evidence:
- one test covering note search match
- one test covering parsed file search match
- one manual UI check showing type filter behavior
- one manual UI check showing tag filter behavior

### Organization flows
Required evidence:
- one test covering title update
- one test covering tag add or remove
- one test covering collection assign or unassign
- one manual UI check showing the updated state in the interface

### Removal flows
Required evidence:
- one integration test showing app index removal
- one check proving the original file still exists on disk after index removal when the changed step touches file removal logic

## 8. Reporting format rules

Every non-trivial implementation step must report:
- goal
- facts
- assumptions
- plan
- files changed
- verification performed
- result status: done, partial, or blocked
- remaining uncertainty

A success report without verification is invalid.

## 9. Forbidden shortcuts

- No marking a parser failure as success.
- No swallowing database errors and returning empty success states.
- No fake search results or hardcoded sample data in the core flow.
- No skipping loading or failure states in the UI for implemented core flows.
- No direct mutation of persistent records from presentation components.

## 10. Change control rules

- If the task requires behavior not present in the PRD, stop and request a PRD update.
- If the task requires changing module ownership or boundaries, stop and request an Architecture update.
- If the task depends on an unresolved blocker or assumption, surface it before coding.
- Do not mark a step done unless its required verification artifact exists.
- When verification is partial, state the exact gap.

## 11. Definition of done enforcement

The build is done only when:
- all PRD must-have items are complete
- core flows have verification artifacts
- active blockers are resolved or explicitly accepted
- no unresolved guardrail violations remain
- the delivered system still matches the current PRD and Architecture
