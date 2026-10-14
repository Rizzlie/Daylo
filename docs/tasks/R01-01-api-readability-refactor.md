# R01-01 — API readability refactor

Parent: API maintenance · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: Scope agreed on 2026-10-13.
Implementation authorization: Granted on 2026-10-13; no commit requested.
Delivery status: Full API scope implemented, locally verified and owner-accepted on 2026-10-14.

## Assumptions and sources

Preserve the product requirements, backend architecture, public API contracts and
accepted F06 authentication/security behavior. This is a readability refactor of
existing `apps/api` and `libs/api` code, not new product functionality.

## Scope

The owner clarified that this task covers all handwritten API code, not only
recent authentication/security additions. Review every runtime source under
`apps/api` and `libs/api`, including bootstrap/OpenAPI, configuration, controllers,
guards, persistence and infrastructure. Refactor complex orchestration and policy
code where useful; retain already declarative modules, contracts and simple
adapters. Generated Prisma files remain generator-owned. Verification must cover
the expanded scope, not rely solely on the initial slice's results.

- Name HTTP recovery and security-failure classification rules.
- Clarify existing-user, owner and invitation admission policies.
- Separate CSRF decision rules from rejection logging and transport effects.
- Split OIDC verification into code exchange, header and claims validation stages.
- Separate security-event construction, bounded counters and output.
- Keep explicit sequential awaits at transaction, persistence and logging boundaries.

No dependency, database migration, public contract or frontend change is planned.

## Acceptance criteria

Policy intent is readable through focused named functions and methods; nested
conditional expressions are removed from the selected flows. Existing status
codes, error reasons, redirects, session/CSRF/PKCE defenses, admission short
circuiting, transactional consistency and logging limits remain unchanged.

## Verification

Run existing API tests with isolated PostgreSQL variants enabled, security-event
tests, relevant Nx lint, API production build, OpenAPI/generated-client drift
checks and generated-client compilation. Add behavioral regression cases only
where existing coverage leaves a concrete gap. Browser inspection is applicable
if user-facing behavior changes; no fresh real Google or hosted-CI claim is made.

## Discussion topics and decision record

The owner requested more declarative/readable API code. The proposed five-part
scope and verification were discussed; the owner authorized it with
"zrób to, ale na razie nie commituj". Use focused policies and explicit effects,
without introducing a generic pipeline framework. Work remains single-agent.

Scope correction: "chodzi mi o cały kod, nie tylko to co bylo ostatnio" authorizes
expanding this same refactor across the API. The no-commit instruction persists.

## Delivery and retrospective

### Initial slice

Implemented the agreed five-part scope in existing files, without new libraries
or dependencies. HTTP classification and OIDC claims/identity mapping are named
functions. Admission resolves access status explicitly within the existing
transaction. CSRF separates rejection classification from logging/throwing.
Security events separate allowlisting/serialization, window rollover, suppression
summary and quota reservation. Persistence and security-event ordering remain
explicit and sequential.

Fresh local Nx verification passed:

- `api:test`: 215 tests passed, including all PostgreSQL variants enabled through
  `RUN_F06_DATABASE_INTEGRATION` and `F06_TEST_DATABASE_URL`.
- `api-core-security-events:test`: passed (10 existing cases covering privacy,
  correlation, limits, backpressure and sink failures).
- Lint for `api`, `api-auth-feature`, `api-core-security-events` and the generated
  client: passed; ten existing API test non-null-assertion warnings remain.
- API production build and OpenAPI export build: passed.
- Generated-client `check`: OpenAPI valid, two generations identical, committed
  OpenAPI/client artifacts unchanged. Generated-client `typecheck`: passed.
- Both existing migrations applied to the owned disposable PostgreSQL 17 database
  `daylo_f06_r01_refactor` on port 5441. The verification container was removed;
  the owner's development database/configuration was not changed.
- `git diff --check`: passed. Existing behavioral tests cover the selected rules;
  no implementation-mirroring tests were added.

Browser inspection and frontend E2E were not run: no user-facing behavior or UI
changed; HTTP recovery, cookie/session and admission regression tests passed.
No fresh real Google sign-in, hosted CI or deployment verification is claimed.
Changes remain uncommitted as requested. Human acceptance remains pending;
no subsequent task is started.

Retrospective: focused policy functions make intent easier to inspect, while
explicit transaction and output-counter mutations retain visible ordering. Keep
invitation/CSRF short circuiting and distinct provider error boundaries during
future readability work; avoid generic pipeline abstractions for these flows.

### Full API scope after owner correction

Reviewed the handwritten API runtime sources across application composition,
HTTP/OpenAPI, auth, users/groups adapters, configuration, database lifecycle,
transactions, internal contracts and security-event infrastructure. Also inspected
bootstrap/export, build/test configuration and verification scripts. Already
declarative modules, contracts, DTOs, simple Prisma adapters and serialization
were retained; generated Prisma code and SQL migration history were not edited.
Explicit sequential SQL verification/locking remains appropriate.

The final change touches 21 runtime files across `apps/api` and `libs/api`:

- Configuration shares URL parsing and names database/origin predicates; callback
  rules declare their validation messages and retain their error order.
- OpenAPI selects HTTP operations with `flatMap`/`filter` and applies the common
  rate-limit response from one declaration.
- Rate limiting shares admission/error handling between Nest middleware and
  Swagger handlers; quota lookup/allocation and result construction are separate.
  Budget consumption and counter mutations stay synchronous/sequential as required.
- Session guard separates actor mapping and pending-access policy from mutation
  verification. Session service names token/session requirements and shares the
  anonymous-cookie rejection path.
- Controllers separate session response mapping and use declared login
  destinations; callback orchestration visibly preserves persistence before success.
- OAuth code consumption, verifier recovery and rejection logging are focused
  stages. PKCE envelope encoding/decoding is separate from authenticated crypto.
  Google client construction is a named factory, preserving timeout/retry policy.
- Session persistence names the selected fields, absolute-age cutoff and renewed
  row mapping. User persistence separates profile create/update declarations from
  the upsert. Atomic SQL, transaction contexts and advisory lock order remain intact.
- Database readiness separates deadline/timer cleanup from the readiness outcome
  and connection cleanup. Security output names write availability and failure
  callbacks. The misleading generated bootstrap placeholder comment was removed.

Final local verification for this expanded scope passed:

- API: 215 tests; configuration: 28; security events: 10; database: 12;
  OAuth-transaction repository: 3. Total: 268 passing tests, with all seven library
  PostgreSQL cases and API PostgreSQL variants enabled on the disposable database.
  Earlier library runs skipped seven integration cases; the final enabled run
  completed them successfully, so no skipped integration result is counted as a pass.
- Lint: API, auth feature/data-access, users/groups data-access, configuration,
  database, security events and generated client passed. The same ten existing
  API test warnings remain; no new warnings were added.
- API production/OpenAPI builds, valid OpenAPI, identical double-generation/client
  drift checks and generated Angular client compilation passed after runtime edits.
- Both migrations applied to disposable PostgreSQL 17 `daylo_f06_r01_full` on
  port 5441. The labeled owned verification container was removed afterward.
  Owner database/configuration and dependencies remain unchanged.
- `git diff --check` passed. No new product behavior or implementation-mirroring
  tests were introduced; the existing regressions cover the refactored policies.

No frontend/UI or public HTTP contract change was made. Browser/frontend E2E,
real Google, hosted CI and deployment were not rerun or claimed. Final human
acceptance remains pending. All changes remain uncommitted as requested.

Retrospective: the initial proposal focused too narrowly on recent auth/security
code. The owner corrected the scope, which was expanded across the API within
this task. Future whole-area refactors should inventory all runtime areas before
proposing changes and distinguish already declarative code from actual candidates.

### Owner acceptance and publication authorization — 2026-10-14

The owner accepted the full refactor with "wygląda dobrze, wystaw PR" and authorized
selective staging, a Conventional Commit on `refactor/r01-01-api-readability`, push
and a draft PR targeting the discovered default branch `main`. This supersedes
the earlier temporary no-commit restriction. Earlier pending-acceptance and
uncommitted statements describe the state before this request.

Reuse the recorded final 268-test, lint/build and contract/client verification:
only acceptance/publication documentation changed after those checks. No merge,
deployment or subsequent implementation is authorized. Hosted CI remains unverified.

Published: [draft PR #23](https://github.com/Rizzlie/Daylo/pull/23), branch
`refactor/r01-01-api-readability`, targeting `main`. The PR is linked to this
thread. Commit `2a2f035` contains the accepted implementation and acceptance
record. Recorded local verification is preserved; hosted CI was not assessed
during publication. Only the publication record changed afterward.
