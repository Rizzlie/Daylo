# F06-11 — Expired authentication record cleanup

Parent: F06 · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: Scope discussed and approved on 2026-10-14.
Implementation authorization: Owner explicitly authorized implementation with "tak"
after the proposed scope. Delivery status: Implemented and locally verified;
owner-accepted on 2026-10-14; closed.

## Assumptions and sources

The [auth audit](../security/auth-audit-2026-10-13.md) identifies retained expired
sessions and OAuth cleanup tied to a new login start. Expired credentials already
fail server checks; cleanup controls retention/storage, not authentication validity.
Preserve the seven-day sliding window and 30-day absolute cap from F06-06.

## Scope

- Choose a periodic job/scheduler appropriate to the actual deployment, without
  introducing unrelated infrastructure or speculative modules.
- Remove expired OAuth transactions and sessions past either sliding expiry or
  the absolute cap, including legacy rows whose sliding deadline exceeds that cap.
- Bound deletion batches and run time; add required indexes through Prisma
  migrations if justified. Define retries, metrics and multi-instance coordination.
- Delete only eligible authentication records, never users, invitations or business
  data. Define retention for expired rows explicitly rather than assuming immediate deletion.

## Acceptance criteria

Eligible records are removed within the agreed schedule/retention bounds. Valid
sessions and OAuth attempts survive. Exact cutoff, concurrent renewal/revocation,
callback consumption, repeated runs and multiple workers do not delete protected
records or restore credentials. Failures are retryable and logged without secrets.
Session rejection does not depend on the cleanup job running successfully.

## Verification

Use isolated PostgreSQL fixtures for both expiry types, valid records, boundary
times, concurrency, repeat execution and bounded batches. Apply migrations to an
empty disposable database and inspect query/index behavior. Run appropriate Nx
lint/tests/builds. Browser checks are needed only if user-facing behavior changes;
never run deletion tests against the owner's development/production data.

## Discussion topics and decision record

Agree retention, schedule, batch size, deployment/job ownership, coordination,
metrics and retry policy. The owner requested backlog registration on 2026-10-13;
implementation was subsequently authorized on 2026-10-14 as recorded below.

### Approved scope — 2026-10-14

- No additional retention after expiry: OAuth expires at `expiresAt`; sessions
  expire at the earlier of `expiresAt` and creation plus 30 days, including legacy rows.
- Run on API startup and every 15 minutes while the API is running. Catch up on
  restart; remove unbounded OAuth cleanup from the login request path.
- At most 500 records per batch and a five-second execution budget per run,
  with database query timeouts. Remaining backlog waits for the next run.
- Atomic PostgreSQL deletion, coordination across workers and protection against
  concurrent renewal, revocation and callback consumption. Delete auth rows only.
- Retry at the next scheduled run after failure; bounded operational logs contain
  outcome, deletion counts and duration without credentials or personal identifiers.
- Add justified expiry/creation indexes through a Prisma migration; no new
  UI, API operation, external scheduler or deployment infrastructure.
- The owner subsequently requested NestJS Task Scheduling. Use pinned
  `@nestjs/schedule` with runtime-only `ScheduleModule.forRoot()` and a named
  15-minute interval, plus startup execution; keep database coordination in the
  auth store. This supersedes the initial proposal to avoid a new package.
- Verify against disposable PostgreSQL: exact cutoffs, legacy absolute expiry,
  protected records, races, repeat runs, batch bounds, failure recovery and migration.
  Run relevant Nx lint/tests/builds. Browser inspection is inapplicable unless
  implementation changes user-facing behavior.

## Delivery and retrospective

### Delivery — 2026-10-14

Implemented the approved runtime job using pinned `@nestjs/schedule` **6.1.3**,
compatible with NestJS 11 and the existing CommonJS backend. Runtime composition
imports `ScheduleModule.forRoot()` and `ApiAuthCleanupModule`; offline export and
ordinary HTTP fixtures omit scheduling. Startup catch-up, the named 15-minute
interval, local overlap prevention and graceful shutdown are verified.

The auth store removes at most 500 rows from one table per transaction, alternating
tables within the monotonic five-second run budget. One fixed cutoff preserves
exact OAuth/sliding/30-day eligibility. Advisory lock 60611 coordinates batches;
row locks skip in-flight renewal/revocation/consumption. Acquisition, transaction
and statement timeouts bound database work. Completed batches stay committed if
later work fails; failures/busy workers/backlogs retry next tick. One redacted
operational summary reports counts, duration and outcome. Login starts now only
insert their own transaction. Added three Prisma expiry/creation indexes.

### Verification evidence

- `api:test`: **221 passed**, including all 65 opt-in real-PostgreSQL HTTP/admission/
  session cases and six scheduler/budget/shutdown/redaction cases. The scheduler
  test initializes the actual auth cleanup module through Nest's scheduler.
- `api-auth-data-access:test`: **16 passed**: 13 new cleanup integration cases and
  three OAuth repository regressions. Final changed fixture cleanup guard was
  rechecked through all 13 cleanup cases. Global deletion used its own empty
  `daylo_f06_cleanup` database; regressions used `daylo_f06_cleanup_regression`.
- Checks cover exact millisecond cutoffs, both session expiry policies, legacy
  rows, retained users/preferences/groups/invitations/tasks, 500-row batches,
  repeat runs, concurrent workers, locked renewal/revocation/callback operations,
  real valid renewal/consumption races, query timeout and recovery. Expired
  sessions remain rejected when deletion fails.
- All three migrations applied to both empty disposable PostgreSQL 17 databases.
  `api-core-database:prisma-verify` passed. EXPLAIN with sequential scans disabled
  locally confirmed all three new indexes support their eligibility predicates;
  this is index eligibility evidence, not a production load benchmark.
- Lint passed for `api`, `api-auth-feature`, `api-auth-data-access` and
  `api-core-database`. Database unit tests and API production build passed.
- `web-shared-api-client:check` passed offline specification validation, two
  identical client generations, drift detection and preservation of source
  artifacts. No public contract or generated-client source changed.
- `git diff --check` passed. No UI/HTTP response change: browser/frontend E2E
  inspection is inapplicable to this maintenance task.

The owned disposable PostgreSQL container was removed after checks. Development
and production data were not used for deletion tests or migrated by this task.

### Limits and acceptance

The job only runs while API is alive; restart catches up. Backlogs, failures and
conflicting row locks may defer removal beyond one tick. The five-second budget
and database timeouts are not hard real-time guarantees during event-loop or
network/database stalls. Hosting collection, retention and alerts remain deferred.
No deployment, hosted CI, real Google smoke or production load test is claimed.
Owner accepted the delivered scope on 2026-10-14; F06-12 and other tasks remain
unstarted. Publication was subsequently authorized as recorded below.

### Retrospective

Registry peer compatibility alone did not establish module-format compatibility:
the initially selected schedule 12.0.2 failed CommonJS type checking, so it was
replaced with 6.1.3 without changing workspace compilation. The first scheduler
test accidentally triggered an extra run after bootstrap; corrected the fixture
and verified the actual cleanup module instead of only a manually supplied
service. Keep global-deletion suites on an exclusive empty database and guard
cleanup hooks against missing fixture IDs.

### Owner review follow-up — declarative code, 2026-10-14

The owner requested more declarative code before acceptance. Refactored only the
F06-11 runtime service and store: one queue describes alternating pending tables,
named stop conditions return typed outcomes, and execution/reporting are separate.
The store now declares transaction limits and delegates lock acquisition, statement
timeout and table-specific deletion to named operations. SQL eligibility, locks,
batch size, schedule, retry and authentication behavior are preserved.

Verification after refactoring: all 13 cleanup PostgreSQL scenarios and six
scheduler/budget/shutdown/redaction scenarios passed; relevant lint, API production
build and whitespace validation passed. The cleanup suite used a freshly migrated
empty disposable database; the owned container was removed after verification.
Prior full authentication/contract evidence remains recorded above. No UI change
or additional task was introduced. Owner accepted the reviewed scope on 2026-10-14.

Review improvement: express orchestration as a short sequence of named operations
with explicit outcomes; avoid nested loops and mutation of iteration state when
a two-table queue expresses the same scheduling policy.

### Owner acceptance — 2026-10-14

The owner accepted the delivered F06-11 scope, including the declarative-code
review follow-up, with "akceptuje". F06-11 is closed. Recorded verification and
operational limits remain unchanged; parent F06 still awaits F06-09 and F06-12.
This acceptance update changes documentation only. No checks were rerun, and
no commit, publication or subsequent implementation was authorized.

### Publication authorization — 2026-10-14

The owner separately requested "ok, wystaw PR", authorizing a task-branch commit,
push and draft PR for the accepted F06-11 scope only. Existing verification remains
valid; no identical tests were repeated for publication. No merge, deployment or
subsequent task implementation was requested.

Publication: [draft PR #24](https://github.com/Rizzlie/Daylo/pull/24) contains the
accepted F06-11 implementation and review follow-up and is registered with this
task thread. Hosted CI remains pending; no merge or deployment was performed.
