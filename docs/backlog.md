# Daylo — Backlog and Verification

Status: Planning baseline, version 1.0, with delivery/acceptance updates through 2026-10-13. F02, F03 and F04 are implemented, verified and owner-accepted. F05 is closed: both task scopes are implemented, locally verified and owner-accepted; F05-02 hosted CI passed on PR #13. F06-01 through F06-04 and the final F06-06 hardening scope are owner-accepted; F06-05 recorded manual smoke scope is owner-accepted with independent technical inspection incomplete; F06-07 is implemented, locally verified and owner-accepted on 2026-10-13; F06-08 is implemented, locally verified and owner-accepted on 2026-10-13; F06-10 is implemented, locally verified and owner-accepted on 2026-10-13; F06-09, F06-11 and F06-12 remain pending, so parent F06 is incomplete. All delivered F01 task scopes are owner-accepted; recorded F01 browser/hosted-CI verification gaps remain incomplete. The delivered global theme slice is owner-accepted; the rest of M05 remains pending. Undelivered work remains pending.

See [Task index](tasks.md) for the 2026-10-05 breakdown. Every task has a separate file under `docs/tasks/` with assumptions, work to perform, acceptance criteria, verification and discussion/decision records. Discuss each task with the owner before implementation, record agreed decisions, and wait for an explicit implementation request for that scope. The breakdown and discussion do not authorize implementation or change parent-item acceptance status.

### F06-10 security event logging delivery — 2026-10-13

The owner agreed JSON stdout logging and authorized implementation with "okej,
do it". Implemented bounded allowlisted events for login, callback/admission,
CSRF, explicit sign-out and API quotas, with backend request correlation and
resolved internal user UUIDs. No emails, IPs, secrets, request dumps or arbitrary
exception diagnostics are logged. Backpressure/sink failures do not change auth.
No new dependency, log database/file, collector or alert infrastructure was added.
Hosting collection, retention/access and proxy redaction remain deferred, as agreed.

Fresh local Nx verification passed: 215 API tests with isolated PostgreSQL enabled,
10 recorder tests, relevant lint (ten existing API warnings), API production build,
OpenAPI/client drift checks and generated Angular client compilation. Both existing
migrations applied to the disposable verification database. No UI/HTTP response
change; browser/frontend E2E inspection is inapplicable to this diagnostic scope.
See [F06-10](tasks/F06-10-auth-security-event-logging.md) and
[Security logging](security/security-logging.md) for evidence and delivery limits.

F06-10 is implemented, locally verified and owner-accepted with "lgtm" on
2026-10-13. Recorded hosting/verification limits remain unchanged. F06-09 is
deferred by the owner until hosting decisions, before public exposure; F06-11/12
remain pending. Parent F06 is incomplete. No commit/publication, hosted verification
or subsequent implementation is authorized by this delivery.

Retrospective: remove unrelated generator config churn; bound diagnostics independently
of actor/request cardinality and emit success/revocation only after persistence.

### F06-08 PKCE delivery — 2026-10-13

Owner acceptance: "Ok zatwierdzam", 2026-10-13, closes the delivered F06-08
scope. Recorded real-provider/hosted-CI/deployment and runtime-setup limits remain.
The owner requested browser-tool-neutral documentation; browser results and
limitations are retained without naming the host. This documentation-only update
does not authorize publication or subsequent implementation.

The owner agreed to the discussed F06-08 scope and implementation request with
"tak, zgadzam sie". Implemented transaction-specific S256 PKCE through the official
Google client. AES-256-GCM protects the recoverable verifier with a separate required
configuration key and state/browser/nonce binding. Atomic single-use consumption,
OIDC defenses and session behavior are preserved. Legacy, damaged, swapped or old-key
attempts fail safely and require a fresh start; rotation preserves existing sessions.

Local verification passed: 207 API tests with isolated PostgreSQL, 28 configuration
tests, 3 transaction repository tests, affected lint, both production builds,
OpenAPI/client compilation and drift checks, and 22 real-stack desktop/mobile E2E
cases. Independent browser invalid-callback recovery/layout/storage and Daylo diagnostics
inspection passed. Real Google PKCE success, hosted CI and deployment remain
unverified. See [F06-08](tasks/F06-08-pkce-for-google-oidc.md).

F06-08 is implemented, locally verified and owner-accepted on 2026-10-13. F06-09 through
F06-12 remain pending and parent F06 is incomplete. Existing owner runtime/configuration
was not changed: its updated API needs the independent key, migration and restart.
No publication or subsequent task is authorized.

Retrospective: assert the verifier after code exchange, preserve encrypted-record
binding and atomic consumption, and distinguish controlled-provider proof from a
successful real Google smoke check.

### F06-07 global API rate limiting delivery — 2026-10-13

Owner acceptance: "zatwierdzam", 2026-10-13, closes the delivered local F06-07
scope. Recorded deployment/provider/hosted-CI limits remain unchanged. This
documentation update does not authorize Git publication or the next task.

Implemented the owner-discussed and explicitly authorized local single-instance
scope using `@nestjs/throttler`: common per-IP API budgets (120/minute and
20/10 seconds), separate Google-start/callback budgets (5 and 10/minute), bounded
expiring in-memory counters and safe 429/Retry-After/HTML recovery. Readiness,
documentation middleware, OPTIONS and newly added routes are protected by default.
Quota rejection precedes persistence and does not revoke sessions or clear cookies.

Fresh Nx verification passed: 195 API tests with enabled isolated PostgreSQL,
53 frontend/schema tests, affected lint, API/web production builds, OpenAPI/client
generation and drift checks, and 20 real-stack desktop/mobile Playwright cases.
Independent browser inspection passed for layouts, a genuine quota rejection and
explicit recovery; only expected synthetic 429/anonymous 401 network errors appeared.
See [F06-07](tasks/F06-07-global-api-rate-limiting.md) for evidence and limits.

F06-07 is implemented, locally verified and owner-accepted on 2026-10-13. F06-08
through F06-12 remain pending and parent F06 remains incomplete. No hosting,
fresh real Google sign-in, hosted CI, commit or publication is claimed.

Retrospective: preserve Swagger registration before Nest's final 404 handler;
attach shared admission before documentation middleware and pace real-stack tests
against actual quotas rather than disabling protection.

### F06-05 owner-assisted real Google smoke — 2026-10-13

The owner reported real Google sign-in with a personalized greeting, session
retention after reload, the Google sign-in button after sign-out, and a
session-expiry notice after the requested protected-route back-navigation/reload
check. The discussed visible scenarios passed according to the owner's report.
See [F06-05](tasks/F06-05-google-smoke-verification.md).

Independent redirect/callback, cookie/database, network/console and viewport
inspection remain incomplete. The owner accepted the recorded manual scope with
"tak, akceptuje, wystaw PR" and authorized its commit, push and PR publication.
F06 remains incomplete. No application changes or automated check reruns were
needed for this documentation-only record, and no later implementation is authorized.

Retrospective: distinguish owner-reported manual results from independent
technical verification and explicit acceptance.

### Authentication delivery acceptance — 2026-10-13

The owner stated "a okej, akceptuje zakres prac" after reviewing the current auth
implementation and security corrections. This closes the delivered F06-04 frontend
authentication scope and final F06-06 email-authority, 30-day session-cap and HTTPS
cookie scope. The auth-only limiter remains removed by owner decision; AUTH-03 is
open and F06-07 global rate limiting remains pending. F06-05 real Google smoke and
F06-08 through F06-12 remain pending, as do recorded deployment/verification gaps.
Parent F06 is not complete. Earlier dated pending-acceptance statements for these
two delivered tasks are superseded. No application change, commit, publication or
later task implementation was authorized by acceptance.

Retrospective: record acceptance of the final bounded scope without converting
deferred security work or unavailable verification into completed work.

### Historical acceptance reconciliation — 2026-10-12

The owner explicitly accepted previously implemented tasks: "zrobiliśmy je, ale nie zaakceptowałem po implementacji, akceptuje je oczywiscie". This records delivery acceptance for F01-02, F01-03, F01-05, F02-01, F02-02, F03-01 and F03-02, plus the already delivered global theme slice. Prior acceptance of F01-01, the simplified F01-04, F04-01 and F04-02 is preserved. Task files and the index now agree; F02/F03 acceptance dates in the index are reconciled to this explicit confirmation rather than their implementation dates.

F02, F03 and F04 are closed and owner-accepted. All delivered F01 scopes are accepted, but independent browser inspection for F01-03 and GitHub-hosted execution/artifact verification for F01-05 remain unverified; acceptance does not turn those checks into passes. The theme acceptance covers delivered global styling only, not the pending rendered-control/overlay/focus review, preferences or navigation. M05-01 and the parent M05 are not complete.

The dated delivery records below preserve historical verification and acceptance state at delivery time; their pending-acceptance statements are superseded by this reconciliation and the F04-01/F04-02 acceptance records. No application files were changed or checks rerun for this documentation update. No commit or subsequent implementation is authorized.

Retrospective: reconcile task files, index and parent backlog when recording acceptance. Keep delivery dates, explicit acceptance dates and verification limitations separate; do not infer completed checks from owner approval.

### Additional security backlog — 2026-10-13

The owner requested backlog registration for the remaining audit recommendations.
All items below are pending, with assumptions, scope, acceptance criteria,
verification and unresolved policy decisions in their own task files:

| Task | Planned outcome |
| --- | --- |
| [F06-08](tasks/F06-08-pkce-for-google-oidc.md) | Add transaction-bound S256 PKCE while preserving existing OIDC defenses |
| [F06-09](tasks/F06-09-production-security-headers.md) | Apply and validate security headers/CSP on the actual frontend and API serving paths |
| [F06-10](tasks/F06-10-auth-security-event-logging.md) | Add structured redacted security events with agreed retention and operational handling |
| [F06-11](tasks/F06-11-expired-auth-record-cleanup.md) | Periodically remove eligible expired auth records safely and in bounded batches |
| [F06-12](tasks/F06-12-security-dependency-review.md) | Review current advisories/reachability and perform separately approved compatible remediation |

Global API rate limiting remains the existing F06-07 task. Before public exposure,
prioritize it, production headers and reachable dependency findings; discuss the
remaining work's order and dependencies rather than inferring implementation
authorization. This update changes documentation only and does not accept F06.

Retrospective: give each security concern a bounded task and explicit verification;
keep deployment decisions, implementation status and scanner evidence separate.

### F06-04 delivery — 2026-10-13

F06-06 follow-up: Owner-authorized authentication security hardening is implemented
and locally verified, pending acceptance. New admission checks Google email authority;
sessions have a 30-day absolute cap; HTTPS
cookies use host-prefixed names. All 277 relevant tests, fourteen real-stack E2E
cases, lint, builds and contract checks passed. Browser review passed after a fresh
preview tab resolved snapshot failures. Deployment-wide quotas and other recorded
audit recommendations remain open. See [F06-06](tasks/F06-06-authentication-security-hardening.md).

Owner scope correction: Auth-only throttling was removed and its dependency and
contract entries withdrawn. AUTH-03 remains open. Global protection for public and
authenticated API routes, with stricter expensive-route overrides, is now the
separate pending [F06-07 task](tasks/F06-07-global-api-rate-limiting.md). Its budgets,
proxy/storage policy and implementation require discussion and authorization.

Implemented the owner-confirmed frontend authentication scope: login, real
entry/reload and protected foreground session checks, empty active/pending route
screens, safe errors/retry and in-memory CSRF sign-out. Detected expiry redirects
to login with a visible error that survives reload, as explicitly requested.
HTML Google-navigation failures now redirect to fixed login error destinations;
non-HTML API errors remain unchanged. No feature content or dependencies were added.

Local lint, 19 frontend tests, 115 ordinary API regression tests, both production
builds and contract generation/drift checks passed. Ten real-stack Playwright
desktop/mobile cases passed with isolated PostgreSQL, including CSRF revocation,
pending restrictions, reload and expiry. Four automated login screenshots were
visually inspected. Browser DOM/navigation/resource checks passed; independent browser
visual/screenshot and console inspection remain incomplete because snapshots
failed. Real Google sign-in remains F06-05, and managed browser/provider fixtures
remain F07. Full-stack UI cases are opt-in; hosted CI was not run.

Owner acceptance is pending. F06 remains incomplete, and subsequent work is not
authorized. See [F06-04](tasks/F06-04-frontend-authentication.md).

Retrospective: use production-consistent CSRF fixtures, set Angular's PORT
explicitly, verify observed browser state after tool actions and distinguish
automated screenshots from independent browser verification.

Owner-requested revision: The frontend is now declarative, using `rxResource`,
computed session/view models, an explicit sign-out stream and separate routing
rules. Twenty-five frontend tests, the web production build and ten real-stack
desktop/mobile E2E cases passed. Independent Browser snapshots, UI interaction and
console/resource inspection now passed, resolving the initial F06-04 browser
limitation. Acceptance remains pending. Prefer resources and derived state over
manual synchronization of several writable signals; keep mutation/router side
effects at explicit boundaries. See the task's revision record for details.

Auth ownership review: Reusable guards and redirect rules now belong to auth;
bootstrap imports its provider directly, without a shell proxy. A narrow Nx
auth-bootstrap capability permits that composition import. All routed components
are lazy; guards retain permitted unrelated/parameterized destinations. Thirty-three
frontend tests, production build, ten real-stack E2E cases and independent browser
checks passed. The frontend architecture records the owner-approved conventions.
Owner acceptance remains pending.

Login ownership/readability follow-up: Login is now a separate lazy auth feature;
the app composes its route and the protected shell destinations. Templates use
named signals, and shared `injectQueryParamMap()` removes repeated route-signal
setup. Forty-four frontend tests, affected lint, production build and ten real-stack
E2E cases passed. Independent desktop/mobile visual, console and lazy-resource
checks passed after initial snapshot failures. Owner acceptance remains pending.
Keep screen ownership, app composition and reusable router/auth logic explicit.

Auth lifecycle follow-up: Application-level auth now owns foreground checks and
session-loss/sign-out navigation, independent of mounted feature components.
Public recovery notices remain unchanged on foreground return; protected route
metadata selects access policy. Shell preserves the owner's greeting and displays
session state only. Fifty-five frontend tests, lint, production build and twelve
real-stack E2E cases passed; independent mobile/desktop inspection confirmed expiry
navigation and public-page request suppression. Owner acceptance remains pending.

### Authorized F01-01 Angular shell completion — 2026-10-05

Implemented: minimal semantic Daylo root page with a Polish preparation message, responsive surface using existing light/dark tokens, `Daylo` title and `pl` language, frontend commands/prerequisites/version documentation and exact direct frontend dependency pins using existing lockfile resolutions. Material Symbols Outlined and Google Fonts preconnect links were restored after the owner's subsequent request to retain fonts for planned icons. No package upgrade or product feature was introduced.

Verified: fresh web lint, unit test and production build passed. Manifest/lock metadata consistency passed. Browser inspection passed at desktop 1440 × 900 and emulated mobile 390 × 844 in both system themes, with no horizontal overflow, console errors/warnings or failed requests. These checks preceded Material Symbols restoration; their no-external-resource observation is historical, since the icon stylesheet now loads from Google Fonts. Its restored stylesheet returned HTTP 200 with no console errors/warnings in a subsequent browser check. See [F01-01 delivery record](tasks/F01-01-angular-shell-review.md#authorized-completion-delivery--2026-10-05).

Accepted: owner instruction `Akceptuje aktualny zakres`, 2026-10-05, closes the agreed F01-01 scope including restored Material Symbols. Automated shell smoke coverage under F01-03 and the remaining F01 tasks are pending. This acceptance does not complete F01 or authorize another task.

Retrospective: pin existing resolutions without upgrading; record browser-visible behavior separately from build and component-creation results. Restricted process startup required approved expanded-permission verification.

### Requested F01 API shell slice — 2026-10-05

Implemented: empty NestJS `api` application generated with `@nx/nest` 23.2.1 in `apps/api`, root module and bootstrap, `/api` prefix, default port 3000 with `PORT` override, ESLint and Webpack/Nx targets, and `platform:api`, `scope:app`, `type:app` tags. Dependencies and npm lockfile updated; commands documented in the root README. No sample controller/service or API test target remains.

Verified: API and existing web lint and production builds passed. Nx serve started successfully; `GET /api` returned the expected NestJS JSON 404 because the shell has no endpoints. The verification server was stopped afterward. Browser verification is not applicable to this backend-only scaffold. Human acceptance and the remainder of F01 are pending; this slice does not complete F01 or authorize further implementation.

Retrospective: the generator's inherited CommonJS/bundler TypeScript combination was corrected locally to Node16 module/resolution before verification. Generator dry-run was unavailable because it installs an additional plugin. Restricted-session Nx socket/process failures required disabling the daemon/plugin isolation and running dependency installation and checks with expanded permissions. Inspect generated configuration before validating future slices.

### F01-02 API shell review — 2026-10-05

The owner confirmed the bounded review scope. Existing bootstrap, empty root module, `/api` prefix, default port 3000 with `PORT` override, API application tags and documented Nx commands were reviewed; no application correction was needed.

Fresh API lint and production build passed without cache. Nx serve started with `PORT=3102`, and `GET /api` returned the expected JSON 404. The verification server was stopped and its port released. Browser review, business tests, database readiness and generated-contract checks are inapplicable to this endpoint-free review. Inspector attachment was unavailable because port 9229 was occupied; HTTP verification passed. Owner acceptance remains pending; F01 and subsequent tasks remain incomplete. See [F01-02 review record](tasks/F01-02-nestjs-shell-review.md#delivery-and-review-record).

Retrospective: restricted child-process `spawn EPERM` was not treated as success despite a zero wrapper exit code; approved expanded-permission checks passed. Verify child-process cleanup after stopping Nx. Reuse delivered code and keep later task boundaries intact.

### F01-03 frontend shell smoke coverage — 2026-10-05

Implemented within the owner-confirmed scope: replaced the obsolete `Welcome` sample with observable `Daylo` heading/title and Polish preparation-message assertions. Chromium projects cover desktop 1440 × 900 and mobile emulation 390 × 844. Existing Nx serves the real frontend and waits for readiness; the normal E2E target disables cache. README documents test, headed/debug/UI and report commands. HTML reports and failure artifacts use ignored `dist` paths; additional ignore rules protect direct-CLI artifacts and browser authentication state. No application features, API calls, database runtime or dependencies were added.

Verified: fresh E2E passed 2 tests after installing the missing Chromium revision, fresh E2E lint passed, report server returned HTML with HTTP 200, and ignore/configuration checks passed. Independent visual/keyboard/console/network inspection remains incomplete: Chrome DevTools profile was occupied, CUA had no browser provider, and CLI was unavailable. Interactive debugging modes were inspected in configuration, not exercised. Owner acceptance is pending; F01 remains incomplete. See [F01-03 delivery record](tasks/F01-03-frontend-smoke-tests.md#delivery-and-review-record).

Retrospective: confirm browser installation and resolved Nx serve/readiness dependencies; verify nested authentication-state ignore rules; explicitly stop owned child servers after interactive wrappers exit. Automated E2E does not establish independent browser acceptance.

### F01-04 library boundaries — 2026-10-05

The owner narrowed delivery to the built-in `@nx/enforce-module-boundaries` ESLint rule. The existing platform/scope/type policy and narrow backend contract exceptions are retained. API Angular restrictions, framework-neutral utilities and nested external-import checks complete this configuration. Custom boundary tooling, metadata validation, fixtures and root workspace targets were removed. No libraries, runtime changes or dependencies were added.

Verified for the simplified configuration: fresh Nx lint passed for web/api/web-e2e, fresh production builds passed for web/api, and `git diff --check` passed. Tag completeness, path consistency, capability-tag ownership and additional canonical-entrypoint validation are outside this delivery. CI wiring remains F01-05; the owner accepted the simplified scope on 2026-10-05; F01 remains incomplete. See [F01-04 delivery record](tasks/F01-04-library-boundaries.md#delivery-and-review-record).

Retrospective: the initial implementation exceeded the desired complexity. Prefer the existing Nx rule and record its enforcement limits before proposing custom tooling.

### F01-05 commit conventions and CI — 2026-10-05

Implemented the owner-requested affected PR checks with three GitHub Actions jobs: conventions, quality and E2E. PRs use explicit event base/head SHA and full history; main pushes use full target sets. Commitlint and Husky enforce local/CI message conventions, with strict PR titles checked on edits. Shared workflow/runtime inputs affect application targets, and E2E installs Chromium only when selected. Versions and commands are documented; no custom boundary validation or runtime features were added.

Locally verified: clean npm ci, positive/negative commit/title examples and actual hook execution, merge-base commit validation, representative affected selections, empty-diff/missing-history handling, six lint/unit/build tasks and two desktop/mobile smoke cases. actionlint validated workflow syntax and git diff --check passed. GitHub-hosted execution/artifact upload and owner acceptance remain pending; F01 remains incomplete. See [F01-05 delivery record](tasks/F01-05-commit-conventions-and-ci.md#delivery-and-review-record).

Retrospective: test affected selection for global CI inputs, remove inherited failing test placeholders, and use native npm.cmd for PowerShell pipelines. Local verification does not establish hosted CI success.

### Requested M05 theme slice — 2026-10-05

Implemented: global Angular Material light/dark theme from `docs/design/tokens.json`, system default, document-level explicit variant hooks, typography and supported card/form-field styling. Production build and lint passed; shell browser checks passed at desktop/mobile widths. See [theme verification](design/design-system.md#theme-implementation--2026-10-05) for evidence and limitations. Human acceptance, rendered Material controls/overlays, theme preference UI/persistence and the remainder of M05 are pending. This slice does not complete M05 or authorize further implementation.

### Authorized F02-01 local PostgreSQL runtime — 2026-10-06

Implemented: Docker Compose runs the official PostgreSQL 17 Alpine image with a health check and persistent development volume; documented local configuration stays outside Git, and reset is an explicit destructive command. Daylo uses host port `5433` because the owner's existing healthy `homey-postgres` container occupies `5432`. The API consumes Zod 4-validated runtime configuration through a tagged Nx infrastructure library, and Angular development serving proxies `/api` to NestJS. Prisma, migrations and database-aware readiness remain in F03 and F02-02. The owner-requested Zod follow-up was applied and freshly verified on 2026-10-09.

Verified: Compose rendering, container health, PostgreSQL readiness/query and host port reachability passed. Six configuration tests, lint for API/configuration/web, and both production builds passed without cache. Valid API startup, explicit missing/invalid configuration failures, and the real Angular-to-NestJS proxy path passed. No rendered UI changed, so browser viewport inspection was inapplicable. Owner acceptance is pending; F02 remains incomplete until F02-02 is delivered and accepted. See [F02-01 delivery record](tasks/F02-01-local-postgresql-runtime.md#delivery-and-review-record).

Retrospective: inspect host port ownership before starting Compose, verify dependency module format in addition to peer ranges, and check generator-modified root files for newline-only churn before final validation.

### Authorized F02-02 database-aware API readiness — 2026-10-11

Implemented: `GET /api/health/ready` probes PostgreSQL with `SELECT 1` through a focused `api-core-database` infrastructure library. The endpoint returns the agreed stable 200/503 response bodies, applies a 1000 ms overall deadline, and suppresses connection details and raw database errors. The API composition root and README are updated. Prisma, migrations, liveness, Swagger/OpenAPI and generated clients remain in their later tasks.

Verified: five focused service/controller tests passed, lint passed for the database library and API, and the API production build passed without cache. A real API/PostgreSQL sequence returned 200 while available, 503 while PostgreSQL was stopped, and 200 again after recovery, with the exact agreed response bodies. No rendered UI changed, so browser viewport inspection is inapplicable. Owner acceptance is pending; F02 is implemented but remains unaccepted.

Retrospective: check Docker engine readiness before Compose verification and stop processes owned by the verification run. Restricted Nx plugin subprocesses required the documented daemon/plugin-isolation settings and execution outside the sandbox.

### Authorized F03-01 Prisma schema and migrations — 2026-10-11

Implemented: pinned Prisma 7.10 CLI/client and PostgreSQL adapter dependencies; the agreed User, Preferences, Session, OAuthTransaction, Group, Membership, Invitation and Task models; and an initial versioned migration. UUID identifiers, native PostgreSQL date/time values, UTC timestamps, uniqueness, indexes, required relations and deletion rules are encoded in the schema/migration. Database checks protect normalized emails, invitation resolution, task completion and positive task versions. Nx targets own client generation, migration deployment and repeatable schema verification. Avatar persistence/transport is omitted as agreed. Runtime Prisma lifecycle/transaction support remains F03-02.

Verified: Prisma format/validation and client generation passed. The migration applied to a newly created empty isolated PostgreSQL database; the synthetic verifier confirmed eight tables, ten required foreign keys/deletion rules, identity/email, session token/CSRF, OAuth state/nonce and membership uniqueness, plus database checks. Schema/database drift was empty. Five database-library tests, database/API lint and the API production build passed without cache. No UI or HTTP contract changed, so browser inspection was inapplicable. The isolated database was deleted and PostgreSQL was returned to its prior stopped state. Owner acceptance is pending.

Retrospective: provide an explicit non-secret `DATABASE_URL` for Prisma 7 tooling when no local `.env` exists, do not trust a zero wrapper exit after sandboxed Nx reports `spawn EPERM`, and verify hand-authored checks and foreign-key deletion behavior against an empty real database.

### Authorized F03-02 database lifecycle and transaction runner — 2026-10-11

Implemented: added a framework-neutral core transaction contract with an opaque context, generic runner and explicit DI token. The database infrastructure now manages Prisma connection lifecycle, executes interactive PostgreSQL transactions, validates transaction-context provenance and exports the runner plus controlled Prisma access for future data-access adapters. Business repositories, invitation acceptance, post-commit updates, endpoints and UI remain in later tasks.

Verified: fresh lint passed for the transaction-contract and database libraries, the ordinary database suite passed without cache, and the API production build passed. A separate isolated PostgreSQL database received the existing migration; 11 tests then passed, including lifecycle behavior, NestJS token resolution, two adapters committing through one context, rollback of both writes after failure and rejection of an invalid context. After the first PR CI run exposed a missing ignored Prisma client on a clean checkout, Nx dependencies were added so database tests and the API build generate it first. The full affected lint/test/build command passed after deleting the local client. No rendered UI or HTTP behavior changed, so browser inspection was inapplicable. The isolated database was removed and PostgreSQL returned to its prior stopped state. Owner acceptance is pending; F03 is implemented and verified but remains unaccepted.

Retrospective: use an explicit opt-in flag for integration suites so a configured `DATABASE_URL` does not imply that PostgreSQL is running. Keep transaction-context construction in database infrastructure and require adapters to resolve their Prisma transaction client through that context. Remove ignored generated artifacts before clean-checkout verification and encode their generation in the Nx task graph.

### Authorized F04-01 Zod validation and response serialization — 2026-10-12

Implemented: added the platform-neutral `shared-schemas` Nx library and pinned `nestjs-zod` 5.5.0. Zod 4 schemas now define the stable public error envelope, validation details, readiness response and optional-value normalization. NestJS globally applies strict Zod request validation, declared-response serialization and safe error mapping. The readiness HTTP adapter now declares its response DTO and lives in the API application layer, keeping public transport contracts out of database infrastructure. API conventions document 400/401/403/404/409/500/503 semantics plus the approved cookie/CSRF requirements. Swagger, current-session, OpenAPI/client generation and authentication enforcement remain in F04-02, F05 and F06.

Verified: fresh tests and lint passed without cache for the schema, API and database projects. Twenty-two ordinary tests passed; four existing opt-in database integration cases were skipped by design. API tests used an ephemeral NestJS listener to verify invalid-input details, removal of an undeclared internal field, hidden serialization diagnostics and stable 401/403/404/409/503 codes. The fresh API production build passed. No rendered UI changed, so browser inspection was inapplicable.

Accepted: owner instruction `akceptuje`, 2026-10-12, closes F04-01. F04 remains incomplete until F04-02 is delivered and accepted; this acceptance does not authorize the next task.

Retrospective: review and minimize root changes made by generators. Keep HTTP adapters above infrastructure rather than weakening Nx boundaries when a public schema dependency exposes misplaced transport code. Exclude application specs from the production TypeScript program when adding a colocated test target.

### Authorized F04-02 current-session contract and Swagger — 2026-10-12

Implemented: shared Zod schemas define the pending/active session response and public user identity. The auth feature exposes `GET /api/auth/session` with operation ID `getCurrentSession`; runtime always returns the standard 401 `AUTHENTICATION_REQUIRED` envelope until real session lookup is added in F06. Swagger UI at `/api/docs` and OpenAPI 3.0 JSON at `/api/openapi.json` document readiness/session responses and errors. API conventions and README explain the current behavior and deferred cookie/CSRF names. Export and Angular client generation remain F05.

Verified: fresh lint passed for API, auth feature and shared schemas; all 28 API/shared-schema tests and the API production build passed without cache. HTTP tests validate the served specification, Swagger assets, 401 behavior, pending/active response serialization, field privacy and safe serialization failures. Real API/PostgreSQL browser inspection exercised Swagger and the expected session 401; see the [F04-02 delivery record](tasks/F04-02-session-contract-and-swagger.md#delivery-and-review-record) for viewport evidence and limitations. No Angular feature changed.

Accepted: owner instruction "akceptuje F04-02. Nie commituj jeszcze nic, zaktualizuj tylko docsy", 2026-10-12, closes F04-02. Together with the previously accepted F04-01, F04 is complete and owner-accepted. This instruction authorizes documentation updates only; commits and subsequent implementation remain unauthorized.

Retrospective: verify root output-schema naming against the actual nestjs-zod/Zod versions, dedupe NestJS in cross-library Vitest tests, and review Swagger's displayed examples rather than relying only on specification validity.

### Authorized F05-01 offline OpenAPI and Angular client — 2026-10-12

Implemented: Nx targets build/export/validate OpenAPI from the existing application graph and generate the internal Angular client. The specification is stored at `docs/api/openapi.json`, and unmodified client sources at `libs/web/shared/api-client/src/generated`. The official Docker generator is pinned to version 7.26.0 and its digest; configuration matches Angular 22.1.8. Runtime configuration loading is separated from NestJS preview export, without changing session/readiness behavior. No npm dependency or frontend workflow was added.

Verified: offline export from an empty working directory without runtime configuration or PostgreSQL matched the artifact; repeated generation produced identical hashes for the specification and all 19 client files. OpenAPI validation, client Angular compilation, relevant lint/tests and API/web production builds passed. Real API/PostgreSQL smoke returned readiness 200 and session 401; served and offline specifications matched. No rendered UI changed, so browser inspection was inapplicable. See the [F05-01 delivery record](tasks/F05-01-openapi-angular-client-generation.md#delivery-and-review-record).

Accepted: owner instruction "ok super, akceptuje zmiany", 2026-10-12, closes F05-01 including the verified `npm run api:generate` convenience command. Fresh lint passed for all nine workspace projects without cache. F05 remains incomplete: drift enforcement and CI/build integration are F05-02, which remains pending. No commit or publication was requested.

Retrospective: preview mode still requires resolvable DI tokens; keep environment loading separate and import configuration dependencies explicitly. Preserve generator output with scoped style exceptions, exclude bookkeeping from source, and explain Docker/Java prerequisites early.

### F05-02 delivery — 2026-10-12

Implemented temporary-output specification/client drift checking, consecutive-generation determinism, source-preservation checks, actionable file diagnostics and cleanup. Frontend builds depend on the uncached drift check and Angular client compilation; CI runs both explicitly before quality checks. Shared pinned Docker orchestration stays outside generated code. Artifact-only LF rules prevent Windows checkout differences. No API or generated client content changed.

Local verification passed: client and web lint/tests, API lint/all 20 tests/build, client compilation, frontend production build, and identical temporary generations. An intentional backend contract version change blocked the ordinary frontend build while preserving all 20 source artifacts; the backend source was restored. A cached frontend build still ran both drift generations. Temporary output was cleaned. CI YAML parsing and `git diff --check` passed. Browser/E2E verification is inapplicable to this tooling-only change. Hosted CI execution and owner acceptance remain pending. See [F05-02](tasks/F05-02-generated-client-drift-checks.md).

Retrospective: explicit LF attributes are necessary for strict cross-platform artifact comparison; verify negative drift and cached build behavior when adding build dependencies. F06 remains pending; no commit or publication was requested.

Accepted: owner instruction "wygląda ok, akceptuje", 2026-10-12, closes F05-02 and the parent F05 together with the previously accepted F05-01. Hosted CI execution remains unverified; acceptance does not establish hosted verification as passed. The acceptance update changes documentation only; no checks were rerun, and no commit, publication or subsequent implementation was requested.

Hosted CI follow-up: On 2026-10-12, the owner reported all PR #13 jobs passed. GitHub results confirmed all three Foundation CI jobs succeeded in [run 38278120066](https://github.com/Rizzlie/Daylo/actions/runs/38278120066) for `cb9de11`, including contract drift/build checks and shell E2E. The F05-02 hosted-execution limitation is resolved. No new local verification or subsequent implementation was started.

## 1. Foundation backlog

### F06-01 delivery — 2026-10-12

Implemented the authorized Google OIDC transaction slice: ten-minute browser binding,
hashed state/binding, atomic single-use PostgreSQL consumption, backend code exchange,
complete Google token checks and safe cookie/error behavior. The existing environment
validator now covers Google settings and callback policy. OpenAPI/client artifacts
were regenerated through the official pipeline. Successful verification ends with
the agreed safe 503 until admission/session completion in F06-02/F06-03.

Relevant local lint/tests, real isolated PostgreSQL concurrency/replay tests,
API/web production builds, Angular client compilation, offline OpenAPI validation
and two-generation source-preserving drift verification passed. Browser inspection
checked the real proxy/API stack and safe callback rejection on desktop/mobile with
synthetic credentials. Real Google sign-in, full authentication browser E2E and hosted
F06-01 CI remain unverified. The owner accepted the delivered scope with "ok akceptuje
zmiany" on 2026-10-12, closing F06-01. F06 remains incomplete until its remaining
tasks are delivered and accepted. Acceptance does not authorize the next task,
commits or publication. See [F06-01](tasks/F06-01-google-oidc-flow.md) for evidence
and retrospective. This acceptance update changes documentation only; no checks
were rerun.

Publication: the owner separately authorized a PR on 2026-10-12. The accepted
F06-01 scope is published in [draft PR #15](https://github.com/Rizzlie/Daylo/pull/15),
registered with the task thread. Hosted F06-01 CI is pending.

### F06-02 delivery — 2026-10-12

Implemented the owner-authorized identity/admission slice through narrow Users and
Groups contracts and application-root module wiring. Stable Google subject owns
identity; configured owner and existing active access are admitted, while everyone
else needs a matching unexpired pending invitation. Email collisions and outsiders
receive safe 403 without identity writes. Admitted profiles are persisted/refreshed
and temporarily end with safe 503 until F06-03 creates sessions. Transaction-scoped
identity locks and a shared invitation lock protect the admission checks and writes.
No schema migration, npm dependency, membership or invitation resolution was added.

Local verification passed: 104 API tests (including 24 real PostgreSQL admission/HTTP
cases), 21 configuration tests, three PostgreSQL OAuth-store cases, affected lint,
API/web production builds, Angular client compilation, OpenAPI validation, official
regeneration and deterministic source-preserving drift checks. Browser inspection
checked Swagger admission documentation at 1280x800 and safe invalid callback
behavior at 390x844 through the actual Angular/API/PostgreSQL stack. Snapshots failed
and the browser host later disconnected; visual/console verification is incomplete.
Full login browser E2E and real Google sign-in remain their later tasks. Hosted CI
is pending. The owner accepted the delivered scope on 2026-10-12 after reporting
the expected intermediate callback response from a real Google attempt. This does
not establish sessions or the full F06-05 smoke exercise. Local startup now requires
INITIAL_OWNER_EMAIL.
See [F06-02](tasks/F06-02-identity-and-admission.md) for details and retrospective.
The same acceptance instruction authorized a draft PR. F06-03 remains pending;
no subsequent application implementation is authorized.

Publication: [draft PR #16](https://github.com/Rizzlie/Daylo/pull/16) contains the
accepted F06-02 scope and is registered with the task thread. Hosted CI is pending.

### F06-03 delivery — 2026-10-12

Implemented the owner-authorized database session and CSRF slice, including the
selected seven-day sliding expiry policy. Admitted callbacks issue a fresh hashed
session cookie and fixed active/pending redirect. Current-session retrieval alone
renews valid sessions and cookies; expired/revoked sessions cannot be renewed.
CSRF retrieval does not renew and returns a stable session-bound token. Unsafe
requests require exact frontend Origin plus X-CSRF-Token. Sign-out revokes only
the current session; default global guards restrict pending access to explicit
exceptions. Reused the existing Prisma schema and generated one necessary core
identity contract library. OpenAPI and the Angular client were officially regenerated.
No frontend workflow, new dependency or schema migration was added.

All 166 API cases passed with the isolated PostgreSQL suites enabled, including
31 production-store session HTTP cases, signed-provider session callbacks and
admission regression cases. OAuth-store/shared-schema tests, affected lint,
API/web production builds, Angular compilation, OpenAPI validation, deterministic
source-preserving drift checks and handwritten/documentation whitespace checks passed.
The full staged check flags upstream whitespace in the new generated CSRF model,
which is retained unmodified. Browser checks through
the real Angular/API/PostgreSQL stack covered synthetic session retrieval/reload,
HttpOnly behavior, CSRF rejection and successful sign-out at desktop/mobile widths.
Browser snapshots failed; visual and console inspection remain incomplete. Authentication
UI/full Playwright login fixtures and real Google sign-in remain later tasks.
Hosted CI remains unverified. The owner accepted the delivered scope on 2026-10-12
through "Wygląda dobrze, akceptuje. zaktualizuj docsy i wystaw PR", and separately
authorized publication in the same instruction. Acceptance preserves the recorded
verification limits and does not establish the later real Google smoke exercise.
See [F06-03](tasks/F06-03-sessions-and-csrf.md).

Retrospective: scope database assertions to each suite's synthetic users, guard
against implicit HEAD renewal, and document browser-managed Origin without making
it a generated client argument. Snapshot failure must remain a verification limit.
F06 remains incomplete; F06-04 stays pending. This follow-up records acceptance
and publishes only the already delivered F06-03 scope; no subsequent implementation
or deployment is authorized.

Publication: [draft PR #17](https://github.com/Rizzlie/Daylo/pull/17) contains the
accepted F06-03 scope and is registered with the task thread. Hosted CI is pending.

Work in small reviewed increments. Do not execute the next item merely because the previous item is finished.

| ID | Deliverable | Acceptance criteria | Verification |
| --- | --- | --- | --- |
| F01 | Nx workspace | Angular `web`, NestJS `api`, and Playwright `web-e2e` projects; npm lockfile; boundary rules; documented serve, lint, test, and build targets | Apps start; relevant lint and builds pass; Playwright can open the initial frontend shell |
| F02 | Local runtime | PostgreSQL Compose service; documented environment; API readiness endpoint checks database | Empty local database starts; readiness succeeds with DB and reports unavailability when DB is down |
| F03 | Prisma persistence | Models, constraints, migrations, and Prisma client for agreed entities | Apply migrations to an empty isolated DB; verify identity/membership uniqueness and invitation transaction behavior |
| F04 | Zod and Swagger | Request/response schemas, NestJS validation and serialization, documented current-session contract | Invalid payload rejected; valid response conforms; Swagger and OpenAPI endpoints work |
| F05 | OpenAPI client generation | Export, validate, and generate Nx targets; pinned Angular generator; committed client | Export without live DB; repeated generation stable; generated client compiles; drift check works |
| F06 | Google OAuth and sessions | Owner and invitation access; browser-bound single-use OAuth transactions; cookie sessions; sign-out; CSRF protection | Valid/invalid provider flows, invalid state/nonce, replay, denied outsider, session expiry/revocation, CSRF rejection; real Google smoke check separately |
| F07 | Browser verification foundation | Real test stack, isolated fixtures, controlled provider, multi-user contexts, reports and artifacts | Authentication E2E passes; fixture isolation holds; normal runtime excludes test provider; agent browser workflow exercised |

Dependencies: F01 -> F02 -> F03 -> F04 -> F05 -> F06. Establish Playwright in F01 and finish authentication fixtures and F07 after F06. F04-F05 use the current-session endpoint as the first complete contract-to-client example; authenticated behavior is finished in F06.

### F01 task boundary

Create the workspace and minimal runnable application shells. Add Nx tags and rules for the agreed platform boundaries, a Playwright smoke test, and development instructions. Create only libraries needed for the shells and boundary verification. Do not implement authentication, task features, or database migrations in F01.

Implement the tag policy in [Frontend architecture](frontend-architecture.md): one platform/scope/type tag per project, root ESLint module-boundary constraints at error severity, metadata validation, public-entrypoint restrictions, and positive/negative verification fixtures. Preserve the `area/features/name` library layout. F01-04 was narrowed by the owner to the built-in Nx ESLint rule; custom metadata validation and synthetic positive/negative fixtures are excluded from that delivery. Linting valid current imports does not establish complete policy verification.

Pin mutually compatible tool versions when implementing F01 and record the chosen versions. Use official generators where appropriate. Review the resulting workspace before proceeding.

Implement [Git workflow](git-workflow.md) enforcement during F01: conventional commitlint configuration, commit-message hook, CI checks for PR titles/commit messages, and valid/invalid verification examples. Do not initialize Git on behalf of the owner or publish planning changes without task authorization. PR template is already documented under `.github/pull_request_template.md`.

Merge the accepted [Backend architecture](backend-architecture.md) tag/type/scope policy with the frontend constraints, preserving narrow internal-contract exceptions and preventing frontend rule leakage. Verify representative permitted and forbidden backend imports. Business contracts, transaction runners, Prisma adapters, and SSE implementation belong to their later requested slices; boundary fixtures do not authorize creating their full runtime implementations in F01.

## 2. Functional slices after the foundation

| ID | Slice | Acceptance criteria |
| --- | --- | --- |
| M01 | Personal tasks | Create, edit, delete, complete, reopen; API access restricted to owner; persistence and conflict handling |
| M02 | Today | Timeline, untimed, overdue, completed sections; quick creation; greeting; loading/error/empty states; timezone boundaries |
| M03 | Groups and invitations | Owner creates groups and invitations; recipient accepts/rejects; atomic membership; pending users remain restricted |
| M04 | Shared tasks and live updates | Members manage group tasks; shared completion/reopening appears in two sessions without refresh; unauthorized users receive no task data or events |
| M05 | UI and preferences | Dark/light/system themes, saved preferences, greeting toggle, mobile bottom navigation, accessible forms |
| M06 | MVP acceptance | Core automated checks pass; browser inspection completed; seven-day owner usage exercise recorded separately |

M01 precedes M02. M03 precedes M04; M04 also depends on M01. M05 can be delivered incrementally with UI slices. M06 follows all functional slices.

Every slice includes schema/API updates, client regeneration, relevant tests, and browser verification. A feature is not accepted solely because its API works.

## 3. E2E environment

Use Playwright with `@nx/playwright` in `apps/web-e2e`.

- Run the real Angular frontend, NestJS backend, and isolated PostgreSQL test database.
- Replace only the external Google provider with a controlled test adapter. Exercise the real Daylo OAuth transactions, admission rules, sessions, CSRF protection, permissions, and persistence.
- Do not mock Daylo API responses in acceptance E2E tests.
- Keep the provider adapter unavailable in ordinary development and production configurations.
- Prepare deterministic synthetic users: owner, invited user, member, and outsider.
- Give each test independent data and browser state. Prevent fixtures from resetting development or production databases.
- Use two independent browser contexts for shared behavior.
- Use a controlled clock in frontend and backend for date-sensitive scenarios.
- Wait for stack readiness before testing; clean up services owned by the test run.
- Initial coverage is Chromium on desktop and an emulated mobile viewport. Emulation does not replace an actual phone check.

Real Google sign-in requires a separate manual smoke check with configured credentials. Controlled-provider tests do not verify the real Google configuration.

## 4. Required browser scenarios

Add each scenario when its feature exists; do not claim coverage for unimplemented features.

| Area | Scenarios |
| --- | --- |
| Authentication | Owner sign-in; outsider denial; sign-out; expired session; valid session survives reload |
| Invitations | Restricted pending screen; accept/reject; expired invite; wrong account; no group access before acceptance |
| Personal tasks | All task operations; optional description/time; persistence; user privacy |
| Today | Correct ordering and grouping; overdue retained; completed task union without duplicates; empty state; midnight change |
| Shared tasks | Both members see the task; completion and reopening propagate without refresh |
| Concurrency | Stale edit receives a recoverable conflict without silent overwrite |
| Preferences and layout | Both themes; system preference; persisted selection; greeting toggle; usable mobile form and bottom navigation |
| Failures | Failed save retains input; API failure message; lost SSE connection; reconnection reload |

Prefer accessible roles and labels in selectors. Use Playwright assertions and automatic waiting rather than fixed sleeps. Keep tests focused on observable behavior.

Capture screenshots and traces on failure. Store HTML reports, traces, authentication state, and screenshots outside version control. Use synthetic data for artifacts.

## 5. Agent browser verification

For every user-facing change, the implementing agent must:

1. Start required services and confirm readiness.
2. Open the running app using an available browser-control tool.
3. Perform the feature's acceptance scenario through the actual UI.
4. Inspect desktop and mobile layouts where affected.
5. Check console errors and failed application requests when supported by the tool.
6. Use two authenticated sessions for shared behavior.
7. Record what was checked, what passed, and remaining limitations.

Automated E2E and exploratory browser inspection are both required. Screenshots support visual inspection but do not replace behavioral assertions. If browser control is unavailable, mark that verification as incomplete rather than claiming success.

## 6. Nx verification targets

Define and document targets for:

- Serve, lint, unit/integration tests, and production builds.
- Prisma client generation and migration application.
- OpenAPI export, validation, Angular generation, and drift verification.
- Frontend E2E, interactive/headed debugging, and opening test reports.

Wire dependencies so frontend builds use the current generated contract. Do not use cached E2E results as evidence of a fresh browser run. Regeneration checks compare temporary output and do not rewrite tracked files.

CI runs automated checks; agent browser inspection is recorded separately. Report failures before broadening tests, and rerun checks affected by fixes.

## 7. Definition of done

A task is complete when its acceptance criteria are met, relevant lint/tests/builds pass, generated artifacts are current, applicable frontend E2E passes, browser verification is recorded, and no blocking defect remains.

For each item, report:

```text
Backlog item:
Delivered behavior:
Checks executed and outcomes:
Browser scenarios and viewport coverage:
Known limitations:
Pending human acceptance:
```

After each phase, record agent mistakes, defects found by review, and improvements to requirements or verification. Keep the retrospective brief and evidence-based.

## References

- [Nx Playwright integration](https://nx.dev/docs/technologies/test-tools/playwright/introduction)
- [Playwright authentication and multiple contexts](https://playwright.dev/docs/auth)
- [Playwright best practices](https://playwright.dev/docs/best-practices)
