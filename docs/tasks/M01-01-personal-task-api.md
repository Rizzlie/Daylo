# M01-01 — Personal-task API and authorization

Parent backlog item: **M01** · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: **Completed with the owner on 2026-10-15.**
Implementation authorization: **Granted on 2026-10-15 for the agreed scope below.**
Delivery status: Closed: implemented, locally verified and owner-accepted on 2026-10-15.

## Assumptions and sources

- Personal tasks are private to their creator. Visibility is immutable; date defaults to today, time and description are optional. Mutations enforce authorization and optimistic concurrency.
- Dependencies: F07. Confirm their delivered and verified behavior before dependent work.
- Read [product requirements](../product-requirements.md), [architecture](../architecture.md) and [backlog](../backlog.md). Apply the relevant [frontend](../frontend-architecture.md), [backend](../backend-architecture.md) and [design-system](../design/design-system.md) rules.
- This is a proposed bounded task. Inspect discoverable implementation facts; resolve material product decisions with the owner during the discussion.

## Work to perform

- [x] Add personal-task contracts and API create/read/edit/delete/complete/reopen operations with owner authorization, immutable visibility, explicit mapping and optimistic versions.
- [x] Completion actor/time are server-owned.

## Acceptance criteria

The work above must satisfy this task-specific observable outcome:

Owner operations persist; other users cannot read/mutate identifiers; stale writes return recoverable 409; completion/reopen fields and atomic versions are correct.

The owner must confirm the final criteria during discussion. Applicable checks must pass, evidence and limitations must be recorded, and no blocking defect may remain. Implementation, verification and owner acceptance are tracked separately.

## Verification plan

- [x] Owner operations persist; other users cannot read/mutate identifiers; stale writes return recoverable 409; completion/reopen fields and atomic versions are correct.

- Inspect available Nx targets and use project generators/targets where applicable; select exact commands after inspection rather than inventing flags.
- Run affected lint, meaningful tests and production builds. For API contract changes, export/validate OpenAPI, regenerate the Angular client and check drift.
- For user-facing changes, run applicable real-stack Playwright scenarios and independently inspect the running UI through an available browser tool at relevant desktop/mobile widths, including keyboard behavior and console/network errors where supported.
- Use synthetic data and keep secrets, authentication state, reports, screenshots and traces out of version control.
- Record unavailable checks as incomplete. For review/manual-only tasks, mark inapplicable automated checks with a reason; do not rerun unrelated checks solely to fill the report.

## Discussion before implementation

Discuss this task with the owner before application changes:

1. What title/description limits and precise mutation/version contracts should clients use, including repeated completion or reopening?
2. Confirm assumptions, dependencies, scope boundaries and the observable acceptance scenarios above.
3. Agree on implementation approach, affected areas, required checks and any remaining limitations; resolve material ambiguities explicitly.

Record the discussion outcome below. Agreement on documentation alone is not implementation authorization. Start implementation only after the discussion is complete and the owner explicitly requests implementation of the agreed scope. Do not interpret silence or a request to discuss as approval.

### Decision record

- Discussion date: 2026-10-15.
- Agreed assumptions and behavior: title is trimmed and contains 1–200 characters;
  optional description contains at most 5000 characters; empty description/time
  are returned as null. Creation without a date defaults to today in Europe/Warsaw.
  Past dates are allowed; time uses HH:mm. Active users manage only their personal
  tasks; pending users have no task access. Missing and inaccessible IDs return 404.
  Edit/delete/complete/reopen require the current version; stale versions return 409. Actual changes increment the version atomically. Repeating complete/reopen
  with the current version leaves state, timestamps and version unchanged.
  Creator and completion actor/time are server-owned.
- Agreed scope and exclusions: create/list/read/edit/delete/complete/reopen personal
  tasks, public contracts and generated Angular client. No task UI, Today grouping,
  group operations, SSE, commits, publication or deployment.
- Agreed approach and verification: task-area libraries, existing Prisma schema,
  transaction runner, global session/CSRF policy and Zod/OpenAPI pipeline. Meaningful
  PostgreSQL HTTP/integration checks cover privacy, validation, persistence and
  concurrent writes; affected lint/tests/build and client drift/compilation checks.
  No new user-facing UI; task editor/browser acceptance belongs to M01-02.
- Unresolved questions: None from the approved product discussion.
- Owner implementation authorization: after the explicit question asking both to
  approve these rules and commission M01-01 implementation, the owner replied
  "zatwierdzam" on 2026-10-15. This authorizes the agreed implementation scope.

## Scope boundaries

Only the work listed above belongs to this task. Follow the parent backlog boundary and approved architecture; do not implement subsequent tasks, speculative libraries or deferred MVP features. Preserve existing delivered work and original design exports. Git initialization, commits, publication and deployment require their own authorization.

## Delivery and review record

- Delivered behavior: Seven operations under `/api/tasks/personal`, with strict
  Zod input contracts, explicit response DTOs, generated Angular models/services,
  default Warsaw date, optional-field normalization, immutable personal visibility
  and server-owned creator/completion fields. PATCH is partial; DELETE takes the
  expected query version. UUID keyset listing defaults to 50 and caps at 100.
  Accessible rows are locked with PostgreSQL FOR UPDATE inside the existing
  transaction runner; ownership/visibility/version predicates also constrain writes.
  Missing/inaccessible resources return 404 before version checks; stale writes
  return 409, including repeated state operations. Unchanged normalized edits and
  repeated complete/reopen preserve timestamps/version. Failures roll back and
  return a safe 503. No dependency, migration or task UI was added.
- Checks executed and outcomes:
  - `npm exec nx -- run api:test` with `RUN_F06_DATABASE_INTEGRATION=true` and
    `F06_TEST_DATABASE_URL` pointing to a disposable `daylo_f06_*` database:
    249 of 250 cases passed in the final full regression run. Its single failure
    was the pre-existing exact OpenAPI endpoint list, which needed the four new
    paths. After updating that expectation, all three exporter tests passed in
    the focused rerun. Thus all 250 distinct API cases are verified across these
    runs; a second full regression run was unnecessary. The 29 new task cases
    cover real HTTP/session/CSRF, same-group privacy, missing/group IDs, validation,
    pagination, no-ops, atomic completion/versioning, concurrent mutation pairs,
    rollback, safe errors and OpenAPI declarations.
  - `npm exec nx -- run-many -t lint test -p api-tasks-feature api-tasks-data-access shared-schemas`:
    passed; 9 Warsaw midnight/DST/year-boundary cases and 29 shared-schema cases
    (18 new task cases). New libraries/schema lint passed without warnings.
  - API, web-e2e and generated-client project lint passed; the API retains ten
    pre-existing non-null-assertion warnings. E2E typecheck passed.
  - OpenAPI export/validation, official Angular generation, Angular client
    compilation and source-preserving drift checks passed. Two independent
    generations are identical. Dates/times generate as strings, not untyped models.
  - Production API/web builds and the separate test API build passed through
    existing Nx targets; unchanged outputs were reused where applicable.
  - `npm exec nx -- run web-e2e:e2e-fullstack --args='--grep=personal-task'`:
    all four desktop/mobile real-stack cases passed in 2.6 minutes. Browser actors
    sign in through synthetic Google; Daylo OAuth/PKCE, admission, database sessions,
    CSRF and PostgreSQL stay real. Cases cover lifecycle, reload persistence,
    conflicts, repeated completion, owner/member privacy, member creation,
    pending/anonymous denial and missing mutation proof. Production quotas stay on.
  - Three existing migrations applied to fresh disposable databases. Test and
    inspection stack cleanup records report completion; the separate API
    verification container was identity/label-checked and removed. Final fixture
    counts were zero tasks/users/groups in that database; the inspection task was
    deleted and its table count was zero before cleanup. The owner's database was
    not used. Changed-file formatting and diff whitespace checks passed.
- Browser scenarios and viewport coverage: independent collaborative browser
  inspection of rendered Swagger operations and CSRF contract, synthetic-provider
  sign-in and existing shell at 1440×900 and 390×844. Browser fetches verified
  create/read/edit/409/complete/repeat/reopen/delete with the real cookie session;
  all checks passed. Console/network inspection showed expected anonymous 401 and
  deliberate 409. The inspector also labeled the successful 204 DELETE as
  net::ERR_ABORTED; browser fetch returned 204 and an independent database count
  confirmed deletion. No unexpected application exception was observed. Shell
  layout inspection is a smoke check; no new task controls or keyboard flow exist
  until M01-02.
- Known limitations / incomplete verification: hosted CI/Linux, real Google,
  deployed HTTPS and exact pinned Node patch remain unverified (local Node
  24.16.0). No load benchmark, restart/sign-out persistence E2E, new task-editor
  UI or seven-day real-use acceptance is claimed. Dedicated PostgreSQL HTTP tests
  retain the existing opt-in integration environment; the managed fullstack target
  includes the new task suite. Existing hosted CI was not expanded in this scope.
- Owner acceptance: Granted with "Akceptuje zmiany" on 2026-10-15 for the delivered scope, including the personal-task type simplification and automatic XSRF transport. Recorded verification limitations remain. No publication or subsequent implementation is authorized.
- Retrospective and workflow improvements: validate OpenAPI and generated-client
  compilation before launching the full-stack target. Standalone null types and
  intersected string regex schemas caused incompatible OpenAPI 3.0/client output;
  nullable base types and one time regex preserve runtime rules and scalar client
  types. Avoid adding schema IDs solely to deduplicate generated models: nested
  and top-level DTO processing can produce duplicate-ID conflicts. Update exact
  endpoint assertions alongside new controllers. Nx generators attempted an
  unrelated Vitest plugin addition; it was removed, preserving existing targets.

### Owner-requested type simplification — 2026-10-15

The owner requested removing redundant repository type definitions with
"zróbmy to" after discussing the separation between public Zod contracts and
internal persistence types. The selected row type now derives from
`Prisma.TaskGetPayload` and `taskSelect`, privately inside the repository.
`PersonalTaskRecord` derives from the explicit mapper with `ReturnType`;
`PersonalTaskFields` remains the normalized write input. Database infrastructure
exports the Prisma namespace as a type-only public entrypoint, avoiding deep
imports. The mapped record still contains only explicitly selected plain fields.
No API schema or runtime behavior changes. Affected repository/database lint,
production API compilation and OpenAPI/client drift checks passed. The drift
check validated the specification and confirmed two identical generations without
rewriting source artifacts. Existing behavioral/E2E evidence above remains
applicable; those suites and browser inspection were not repeated for a type-only
refactor. The owner accepted the delivered task and this simplification with "Akceptuje zmiany" on 2026-10-15.

Update this record and the parent backlog after delivery/review. Do not mark the parent item accepted until all of its criteria are met and the owner accepts it.

### Publication authorization — 2026-10-15

After accepting the delivered changes, the owner requested "super, wystaw gotową PR".
This authorizes selective staging, task-branch commits, push and a ready-for-review
pull request containing M01-01, its type simplification and F06-13. Recorded
verification limits remain; merge, deployment and subsequent tasks are not authorized.

Publication: [PR #29](https://github.com/Rizzlie/Daylo/pull/29) is ready for review,
contains the accepted M01-01/F06-13 scope and is linked to the task thread.
Pre-commit formatting and commitlint passed. Hosted CI remains pending.
No merge, deployment or subsequent task was performed.
