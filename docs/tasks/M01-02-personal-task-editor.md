# M01-02 — Personal-task editor and actions

Parent backlog item: **M01** · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: **Scope and direction agreed on 2026-10-16.**
Implementation authorization: **Granted by the owner on 2026-10-16: "tak, zaimplementuj".**
Delivery status: Implemented, locally verified and owner-accepted on 2026-10-16, including the recorded refinements and both review corrections. Recorded verification limitations remain.

## Assumptions and sources

- Personal tasks are private to their creator. Visibility is immutable; date defaults to today, time and description are optional. Mutations enforce authorization and optimistic concurrency.
- Dependencies: M01-01. Confirm their delivered and verified behavior before dependent work.
- Read [product requirements](../product-requirements.md), [architecture](../architecture.md) and [backlog](../backlog.md). Apply the relevant [frontend](../frontend-architecture.md), [backend](../backend-architecture.md) and [design-system](../design/design-system.md) rules.
- This is a proposed bounded task. Inspect discoverable implementation facts; resolve material product decisions with the owner during the discussion.

## Work to perform

- [x] Add accessible task editor/details/actions through Material controls and handwritten data-access.
- [x] Date defaults to today, title/date required, time/description optional; delete requires confirmation.
- [x] Include a minimal reachable list needed to exercise CRUD.

## Acceptance criteria

The work above must satisfy this task-specific observable outcome:

Real-stack CRUD, reload persistence, retained input/retry after failed save and recoverable conflicts; keyboard/mobile dialogs work. Full Today grouping belongs to M02.

The owner must confirm the final criteria during discussion. Applicable checks must pass, evidence and limitations must be recorded, and no blocking defect may remain. Implementation, verification and owner acceptance are tracked separately.

## Verification plan

- [x] Real-stack CRUD, reload persistence, retained input/retry after failed save and recoverable conflicts; keyboard/mobile dialogs work.
- [x] Full Today grouping belongs to M02.

- Inspect available Nx targets and use project generators/targets where applicable; select exact commands after inspection rather than inventing flags.
- Run affected lint, meaningful tests and production builds. For API contract changes, export/validate OpenAPI, regenerate the Angular client and check drift.
- For user-facing changes, run applicable real-stack Playwright scenarios and independently inspect the running UI through an available browser tool at relevant desktop/mobile widths, including keyboard behavior and console/network errors where supported.
- Use synthetic data and keep secrets, authentication state, reports, screenshots and traces out of version control.
- Record unavailable checks as incomplete. For review/manual-only tasks, mark inapplicable automated checks with a reason; do not rerun unrelated checks solely to fill the report.

## Discussion before implementation

Discuss this task with the owner before application changes:

1. What minimum list/editor flow should precede Today, and how should retained input, deletion confirmation and conflict recovery appear?
2. Confirm assumptions, dependencies, scope boundaries and the observable acceptance scenarios above.
3. Agree on implementation approach, affected areas, required checks and any remaining limitations; resolve material ambiguities explicitly.

Record the discussion outcome below. Agreement on documentation alone is not implementation authorization. Start implementation only after the discussion is complete and the owner explicitly requests implementation of the agreed scope. Do not interpret silence or a request to discuss as approval.

### Decision record

- Discussion date: 2026-10-16.
- Agreed assumptions and behavior: A minimal personal-task list on the existing Today page opens one shared Material dialog for creation and editing. Title and date are required; the date defaults to today in Europe/Warsaw. Time and description are optional. Support deletion with confirmation, completion and reopening. Preserve entered values after a failed save and provide retry and recoverable version conflicts without silently overwriting concurrent edits.
- Agreed scope and exclusions: Reuse the accepted M01-01 API and generated client. Deliver the minimal list/editor/action flow only. Full Today retrieval/grouping, timeline, overdue/completed sections and quick creation remain in M02; group tasks and SSE remain outside this task.
- Agreed approach and verification: The owner explicitly requested the angular-developer skill and declarative behavior over imperative coordination. The workspace pins Angular 22.2.2 and Material 22.2.1. Prefer Signal Forms, derived state with computed/linkedSignal where appropriate, declarative template bindings and handwritten data-access around generated services. Do not use effects to copy derived state between signals. Keep imperative work at action and external-API boundaries. Follow Nx library boundaries, approved Material themes and public control APIs. Verify affected lint, meaningful form/state/action tests, production build, real-stack CRUD/reload/failure/conflict E2E and independent desktop/mobile/keyboard browser inspection. Record limitations separately from acceptance.
- Unresolved questions: No blocking product ambiguity identified in this discussion. Resolve any material ambiguity discovered during implementation with the owner.
- Owner implementation authorization: Granted on 2026-10-16 with "tak, zaimplementuj", following the scope agreement and explicit implementation question. Use a single agent; no commit, publication or deployment is authorized.

## Scope boundaries

Only the work listed above belongs to this task. Follow the parent backlog boundary and approved architecture; do not implement subsequent tasks, speculative libraries or deferred MVP features. Preserve existing delivered work and original design exports. Git initialization, commits, publication and deployment require their own authorization.

## Delivery and review record

- Delivered behavior: Minimal personal-task list on Today with 50-item cursor pages, creation/editing through one Material dialog, explicit delete confirmation and completion/reopening actions. Polish validation/feedback, required title/date, Warsaw date default and optional time/description. Signal Forms and computed state preserve drafts on failed saves; real 409 conflicts block stale retries until current values/version are loaded for comparison. Explicit retry can save the retained draft or replace it with current values. Current-version deletion conflicts require returning to the refreshed list. Pending mutations prevent duplicate submission and accidental dialog dismissal. Page destruction closes its own dialogs; successful list mutations restore focus to the list heading. Existing auth interception and native XSRF transport remain in use.
- Checks executed and outcomes: Initial eight real-stack desktop/mobile scenarios passed (4.3 minutes), including the existing four API privacy/lifecycle cases and four new editor cases. Three data-access and eight feature tests pass. Affected lint passes without new warnings. Production web/API/test-API builds, generated-client typecheck and source-preserving OpenAPI/client drift checks pass. E2E typecheck passes. Final UI/shell/XSRF regression and app/shell unit verification are in progress; final results will be appended below.
- Browser scenarios and viewport coverage: Independent collaborative-browser inspection of the real isolated stack covered sign-in through the synthetic Google provider, personal-task creation, details/editing, completion/reopening, delete confirmation, cancel/restore focus and dialog keyboard containment. Inspected 1440x900 light and 390x844 light/dark layouts, single-column mobile fields and no horizontal overflow. Network diagnostics showed successful business requests and the expected anonymous session 401 before sign-in; no application exception was observed. Preview image capture was visibly duplicated/blurred, so layout conclusions also use accessibility boxes and DOM measurements rather than claiming pixel-perfect screenshot evidence. Final button sizing/error-layout refinement requires final-build inspection.
- Known limitations / incomplete verification: Full Today grouping/timeline, quick creation, shared tasks and SSE remain outside this task. No real Google sign-in, hosted/Linux/deployed HTTPS or physical mobile keyboard/safe-area verification is claimed. The first build attempt required starting Docker Desktop; the first isolated-stack start failed while reading a transient missing Docker port binding and cleaned up successfully, then the next run passed without harness changes. Existing Nx deprecation notices remain. No API contract, generated source, dependency or migration changes were needed.
- Owner acceptance: Pending.
- Retrospective and workflow improvements: Keep the editor local when feature boundaries forbid importing a sibling feature; use generated transport only through handwritten data-access. Replace generator smoke tests with behavior tests before verification. Formatting changed template whitespace, revealing a brittle exact-text unit-test lookup; normalize whitespace in that lookup. Wait for completed mutations/layout stabilization before browser assertions, preserve focus when a row disappears, and run final browser checks against a stable production output.

### Final verification — 2026-10-16

- Final results supersede the in-progress verification statements above. All 35
  relevant tests passed: data-access 3, Today/editor/deletion 8, application/router
  16 and shell 8. Related lint passes without new warnings. Existing auth-route
  fixtures now explicitly answer the new task-list read while retaining HTTP
  request verification.
- The initial eight API/editor desktop/mobile E2E cases passed. The subsequent
  shell/XSRF/editor regression passed seven of eight and exposed a real delayed
  autofocus race: very fast form entry could be redirected to the title after
  the dialog animation. Public Material `delayFocusTrap: false` now captures
  focus immediately; E2E asserts initial focus and separate field values. All
  four final editor cases passed in 1.6 minutes. Together the runs cover 12
  distinct passing real-stack scenarios, not 20 distinct cases.
- Final production web build and its client typecheck/OpenAPI validation/
  source-preserving drift prerequisites passed. Existing API and test-API builds
  passed in the managed target; unchanged outputs were reused where applicable.
  E2E typecheck and lint passed. Final changed-file formatting and whitespace checks passed. No generated artifact was manually changed.
- Independent final-build browser inspection confirmed correct title/description
  persistence, long-title wrapping, required-field feedback, keyboard focus and
  no horizontal overflow at 360, 390, 768, 1024 and 1440 px. At 360x640 and
  390x844, the dialog fit the viewport and action buttons measured 44 px high;
  final dark-dialog state retained the correct field values. Native zoom and
  physical mobile keyboards remain unverified. Captured preview images were
  duplicated/blurred, so pixel-perfect visual evidence remains incomplete.
- Test-only DOM focusability emitted one CDK warning after immediate focus was
  enabled; actual browser focus assertions passed. Local Node was 24.16.0,
  rather than the pinned 24.19.0; exact pinned-runtime verification is incomplete.
  Hosted CI/Linux, real Google sign-in and deployed HTTPS remain unverified.
- All run-owned environments, including failed startup and both inspection
  stacks, recorded successful cleanup; no labeled E2E container remained.
- Retrospective: explicitly flush new business reads in existing auth-route
  tests; check initial-focus timing under rapid input, not only final focus.
  Keep final-build output stable during browser assertions and count distinct
  scenarios separately from correction reruns.
- Owner acceptance remains pending. No commit, push, PR, deployment or next task
  is authorized by this delivery.

### Owner-requested schema extraction — 2026-10-16

The owner requested extracting Signal Forms schemas into separate files.
`task-editor.schema.ts` now exports the typed Angular `schema<TaskFields>` with
the existing validation rules and Polish messages. The editor composes it using
`apply`; its model and operation-dependent disabled rule remain in the component.
This is the only Signal Form currently in the frontend. Behavior is unchanged.
All eight feature tests, lint, production web build and its OpenAPI/client checks,
targeted formatting and whitespace checks passed. The existing CDK/jsdom focus
warning remains. Browser/E2E checks were not repeated for this structural
extraction; previous behavioral evidence and limitations remain applicable.
Owner acceptance remains pending; no commit or publication was performed.

### Owner-requested frontend type simplification — 2026-10-16

The owner authorized the discussed type simplification with "ok zrób to,
sprawdzę i ewentualnie wrócimy". The mapper now accepts the generated
`PersonalTaskResponseDtoOutput` through the API client's public entrypoint.
`PersonalTask` derives from `ReturnType<typeof toTask>` and `TaskFields` from
`Pick<PersonalTask, ...>`. Explicit field mapping and null-to-empty-string /
completion-state normalization remain unchanged; generated files are untouched.
All 11 data-access/feature tests, related lint, production web build and its
OpenAPI/client checks, formatting and whitespace checks passed. Existing CDK
test-environment warnings and earlier verification limits remain recorded.
No runtime/UI behavior changed, so browser and E2E runs were not repeated for
this type-only refinement. Owner review remains pending; no commit or publication
was performed.

### Owner-requested installation timezone — 2026-10-16

The owner requested replacing the hardcoded `warsawToday` helper, then approved
the environment-based design with "tak": backend `DAYLO_TIME_ZONE`, default
`Europe/Warsaw`, startup validation and a public API contract supplying the same
value to the browser. This supersedes the fixed-zone assumption for this scope;
it does not add a per-user preference or authorize later Today functionality.

- Delivered: validated supported IANA identifiers, a single backend default,
  `runtime.timeZone`, public/rate-limited `GET /api/configuration` returning only
  `timeZone` with `Cache-Control: no-store`, Zod/OpenAPI contract and officially
  regenerated Angular client. Shared `todayInTimeZone(timeZone, now?)` replaces
  both handwritten Warsaw helpers. API creation defaults to its configured zone;
  the editor receives that same zone from core configuration resource state.
- Failure behavior: no browser-local or hardcoded fallback. Creation/editing is
  disabled while configuration loads or fails, with explicit retry. Existing
  task operations and session/XSRF policy remain intact. Restart API and reload
  browser tabs after configuration changes; stored dates/times are unchanged.
- Scope: new non-buildable shared date utility and core web data-access libraries,
  no npm dependency or migration. Product/architecture/API conventions, README,
  `.env.example` and future M02 timezone assumptions are aligned. This does not
  implement midnight refresh, grouping, timeline or timezone selection UI.
- Final verification: 261 relevant unit/component/API/router/schema cases passed;
  96 opt-in database cases were skipped in the ordinary API unit target. This
  includes date/DST/year boundaries, explicit alternate zones, API configured
  defaults, invalid environment rejection, public response allowlisting and
  frontend loading failure/retry/disabled actions. Related lint passes, retaining
  ten existing API warnings and the recorded CDK/jsdom warning. Production web,
  API and test-API builds, OpenAPI/client drift/typechecks and E2E typecheck pass.
  Both default-zone real-stack desktop/mobile configuration cases passed.
  All eight alternate-zone editor/configuration/XSRF desktop/mobile cases passed in 3.6 minutes, for ten browser cases across both runtime configurations.
- Independent browser: inspected the real isolated stack with
  `Pacific/Kiritimati`, confirmed the displayed zone/date and successful creation,
  1440px light and 390px dark layouts without horizontal overflow, wrapped zone
  text and initial keyboard focus. Only the expected pre-login anonymous-session
  401 appeared in diagnostics. Screenshot capture remains duplicated/blurred;
  semantic/DOM inspection supplements that limited visual evidence.
- Cleanup: both test stacks and the inspection stack recorded successful cleanup; no labeled E2E container remained.
- Review/limitations: owner acceptance remains pending. Real Google, hosted CI,
  deployed HTTPS, physical mobile keyboards and the exact pinned Node patch
  remain unverified. No commit, publication, deployment or later task occurred.
- Retrospective: keep environment loading outside the offline OpenAPI controller
  graph; import plain ConfigModule for dependency visibility. Preserve generator
  boundaries without retaining unrelated plugin changes. Extend existing auth
  test fixtures for the new configuration read, and verify API/UI agreement using
  an explicit synthetic alternative timezone rather than only the default.

### Startup configuration token and cache refinement — 2026-10-16

- Authorization: the owner requested a reusable configuration token, clarified
  that configuration should load once before startup, and authorized caching.
  Acceptance scope: synchronous immutable consumption after startup, one startup
  read, HTTP cache revalidation, persistent failure/retry and unchanged task dates.
- Delivery: `provideDayloConfiguration()` waits through `provideAppInitializer`
  with a 15-second request deadline. `DAYLO_CONFIG` exposes a frozen plain value;
  the editor injects it directly. Today no longer carries configuration loading
  state or passes the zone through dialog data. Native startup markup presents a
  durable error and reload action when Angular initialization fails.
- Cache: `Cache-Control: no-cache` plus ETag stores public configuration with
  mandatory revalidation. Matching conditional reads return 304; configuration
  changes return 200 with a new ETag. This still makes one network request on
  each page load, and uses no stale offline/localStorage fallback. This record
  supersedes the earlier resource-state/no-store description.
- Boundary: only the configuration library has the narrow
  `capability:configuration-bootstrap` app-import exception, following auth.
- Verification: configuration/bootstrap, component/router and API tests pass;
  API conditional-read tests cover unchanged and changed configuration. Relevant
  lint and production web/API/test-API builds, E2E/client typechecks and generated
  OpenAPI/client drift checks pass. Real-stack results are recorded below.
- Real-stack outcome: all 18 distinct desktop/mobile editor/configuration/XSRF
  and rate-limit scenarios passed across the recorded runs and targeted reruns.
  The editor run used `Pacific/Kiritimati`. Eleven initial editor/XSRF cases
  passed; the mobile lifecycle case passed its sequential rerun after the trace
  collision. Four rate-limit cases passed initially; both startup recovery cases
  passed after correcting the expected anonymous protected-route redirect.
  All five temporary stacks recorded successful cleanup. No labeled E2E container
  remained. Existing ten API lint warnings and 96 opt-in database-test skips remain.
- Independent browser: real 429 startup failure remains readable, then reload
  succeeds after quota recovery. Inspected desktop light and 390px dark layouts,
  no horizontal overflow, 44px retry target and visible keyboard focus. Expected
  synthetic 429 and anonymous-session 401 diagnostics only. Preview images remain
  blurred/duplicated; semantic/DOM inspection supplements visual evidence.
- Retrospective: two simultaneous verification commands both invoked Prisma
  generation and collided. Sequential reruns succeeded; avoid concurrent writers
  to shared generated outputs. Separate Playwright runs also share the report
  directory: concurrent execution caused a trace-file cleanup error despite
  passing scenario assertions; rerun the affected case sequentially. Node fetch adds no-cache to conditional requests,
  so the API test explicitly uses max-age=0 to exercise normal ETag revalidation.
- Review: owner acceptance remains pending; earlier environment/hosted/real Google
  limitations remain. No commit, deployment or subsequent task was performed.

### Review correction: list invalidation during loading — 2026-10-16

- Owner review identified a successful creation racing the initial list read:
  `Resource.reload()` can ignore invalidation while loading, allowing a stale
  list after the save notice. Scope is limited to reliable list invalidation.
- Acceptance: saving before an outstanding list response must trigger a fresh
  read and prevent the old response from replacing it, for both `first()` and
  `refresh()`. Creation remains available while the list loads.
- Delivery: a revision signal is part of `rxResource` parameters. Both actions
  invalidate those parameters, cancelling the outstanding HTTP subscription and
  reading fresh data. Returning to the first page resets the cursor in the same
  reactive update. No effect, polling or request-completion queue is introduced.
- Verification: all four data-access and eight feature component tests pass,
  including both controlled HTTP race regressions. Relevant lint, production web
  build and generated-client drift/typecheck pass. Browser smoke on the real
  isolated API/PostgreSQL stack confirmed creation (201), subsequent list GET
  (200), saved row and focus on the list heading. Desktop/mobile layouts have no
  horizontal overflow. Only the expected pre-login 401 appeared in diagnostics;
  preview screenshots retain the recorded blur/duplication limitation. The race
  itself is verified by controlled HTTP tests, not by browser timing.
- Retrospective: resource reload is conditional; mutation invalidation must also
  cover loading, rather than only resolved/error resource states.
- Owner acceptance remains pending.

### Review correction: completion keyboard focus — 2026-10-16

- Owner review identified that revision-based refresh clears resource values,
  removing focused completion buttons. Acceptance: preserve the row/button and
  keyboard focus throughout completion/reopening and the following list read,
  while retaining the previous race fix and blocking duplicate actions.
- Delivery: `linkedSignal` retains the last displayed page during a same-cursor
  refresh or its failure. Cursor changes clear that retained page. Fresh responses
  replace it, including genuinely empty pages. Angular's keyed rows retain their
  DOM identity. The completion action uses Material's public `disabledInteractive`
  input to retain focus while exposing disabled state; the handler guards busy
  mutations and list loading. No effect or forced focus restoration is needed.
- Verification: controlled HTTP tests cover retained rows, failure/retry, cursor
  changes and both initial-read races. Component tests check completion and
  reopening focus before/during/after the pending list response and reject repeat
  activation. Real-stack lifecycle tests now activate via Enter and assert focus
  after both transitions. All 15 relevant unit/component tests and both real-stack
  desktop/mobile lifecycle scenarios pass, along with related lint, production
  web/API builds, E2E/client typechecks and generated-client drift checks.
- Independent browser: real completion and reopening via Enter each returned
  200 followed by a successful list read. The same button retained focus and DOM
  identity at 1440px and 390px, with no horizontal overflow. Only expected
  pre-login 401 diagnostics appeared; screenshot blur/duplication remains a
  preview limitation. Both temporary stacks recorded successful cleanup.
- Retrospective: resource invalidation tests must cover presentation continuity
  and focus, as well as freshness. Native disabled controls also affect focus;
  retaining rows alone is insufficient for the full pending-operation interval.
- Owner acceptance remains pending.

### Final owner acceptance — 2026-10-16

- The owner accepted the delivered changes with "ok wygląda dobrze, akceptuje zmiany".
- Acceptance covers M01-02, its schema/type/configuration refinements and the
  list-freshness and completion-focus review corrections recorded above.
- This supersedes earlier pending-acceptance entries. Both M01 tasks are now
  owner-accepted, closing parent M01 with the recorded verification limitations.
- No additional checks were run for this documentation-only acceptance update.
  No commit, publication, deployment or subsequent implementation was requested.

### Publication — 2026-10-16

- Owner requested a ready-for-review PR. Published
  [PR #30](https://github.com/Rizzlie/Daylo/pull/30) from
  `feat/personal-task-editor` to `main` and linked it to the current agent thread.
- The PR includes the accepted M01-02 scope and recorded refinements/corrections.
  CI results remain pending; local verification limitations are unchanged.
- The unrelated local `nx.json` generator-style change is excluded.

### GitHub Actions correction — 2026-10-18

- The owner reported failed jobs on PR #30. The failed
  [GitHub Actions run](https://github.com/Rizzlie/Daylo/actions/runs/38918228790)
  passed conventions and quality checks, but both shell browser cases failed.
  The frontend-only `e2e` target had no API for the new mandatory
  `/api/configuration` bootstrap read (`ECONNREFUSED`). Nx Cloud is not connected.
- The workflow now selects and runs existing `e2e-fullstack` targets for affected
  PR projects and all applicable main projects. This provisions the real API and
  isolated PostgreSQL and replaces only Google, retaining production bootstrap
  and access checks. README commands and runtime prerequisites are aligned.
- Verification: Nx affected selection identifies `web-e2e`; builds/typechecks and
  generated-client checks pass. Workflow YAML parses, E2E lint/typecheck pass.
  The full local managed suite exposed quota exhaustion before the final
  unauthenticated navigation and repeated responsive reloads in `access.spec.ts`.
  These tests now await real quota recovery through the existing helper; production
  limits and assertions are preserved. The full local suite and hosted verification
  remain in progress; this record does not claim they passed.
- Retrospective: when bootstrap gains a mandatory API dependency, revisit the CI
  entrypoint and local smoke documentation, not just feature acceptance targets.
- Full local initial run: 56 of 62 browser cases passed in 18.7 minutes; six
  failures were the owner/member session and repeated responsive-reload cases
  already identified above, on both browser projects. Their targeted rerun on
  the corrected test code is in progress. Stack cleanup completed.
- The E2E job budget is raised from 20 to 30 minutes: the measured suite duration
  needs room for dependency/browser installation, builds and genuine quota waits.
  This changes neither test timeouts nor production rate limits.
- The targeted repeat also identified budget exhaustion during sign-out's
  follow-up session read. The session lifecycle now awaits budget before sign-out
  as well as before its final protected navigation. The required 204/revocation
  and expired-session redirect assertions remain unchanged.

Keep this record and the parent backlog aligned with any subsequent review findings.
