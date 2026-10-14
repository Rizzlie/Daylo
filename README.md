# Daylo

Daylo is a personal and shared task planner built incrementally with coding agents.

## Project status

Planning documentation, project-local agent skills, an Angular shell with Daylo themes, a NestJS API shell with database readiness, and a Docker Compose PostgreSQL development runtime. Foundation and MVP acceptance remain pending; see the backlog for delivered slices.

The repository will be initialized by its owner.

## Documentation

- [Product requirements](docs/product-requirements.md): MVP behavior and acceptance criteria.
- [Architecture](docs/architecture.md): Nx, authentication, persistence, contracts, and client generation.
- [Frontend architecture](docs/frontend-architecture.md): feature directories, library responsibilities, project tags, and ESLint dependency rules.
- [Backend architecture](docs/backend-architecture.md): modular monolith, internal contracts, transaction ownership, post-commit updates, and backend boundary rules.
- [Backlog and verification](docs/backlog.md): implementation sequence and browser testing requirements.
- [Task index](docs/tasks.md): individual task files with assumptions, scope, verification and required discussion before implementation.
- [Agent instructions](AGENTS.md): working agreements and definition of done.
- [Project-local skills](docs/skills.md): installed skills, sources, and pinned revisions.
- [Git workflow](docs/git-workflow.md): Conventional Commits, PR template, enforcement plan, and selected PR skill.
- [Today design brief](docs/design-brief.md): mockup scope, interaction scenarios, and Angular Material component mapping.
- [Accepted design sources](docs/design/README.md): owner-approved Today visual baseline and remaining refinements.

## Planned stack

Nx, Angular, Angular Material, NestJS, PostgreSQL, Prisma, Zod, Swagger, OpenAPI Generator, and Playwright.

Code and documentation use English. User-facing UI text uses Polish.

## Delivery approach

1. Review the planning documents.
2. Discuss the selected task's assumptions, behavior, scope and verification; record decisions in its task file.
3. Implement one task only after the owner explicitly requests implementation of the agreed scope.
4. Review changes and verification evidence before selecting the next task for discussion.

Only explicitly requested slices are authorized; the full **F01: Nx workspace** item remains pending.

## Frontend shell

Use Node.js 24.19.0 and npm 11.17.0, the verified local baseline. Install the locked dependencies with `npm ci` from the workspace root. Frontend framework and tooling dependencies are pinned to their existing exact locked versions; this task does not upgrade packages.

| Tool | Pinned version |
| --- | --- |
| Nx and frontend Nx plugins | 23.3.0 |
| Angular runtime, compiler and language service | 22.2.2 |
| Angular CLI, build, devkit and schematics | 22.2.2 |
| Angular Material and CDK | 22.2.1 |
| TypeScript | 6.0.3 |
| Analog Angular/Vitest integration | 2.8.0 |
| Vite / Vitest | 8.3.2 / 4.1.11 |
| Angular ESLint / ESLint | 22.5.0 / 9.39.5 |
| Playwright | 1.63.0 |
| Plus Jakarta Sans Variable | 5.3.0 |

The client-rendered Angular app lives in `apps/web`, tagged `platform:web`, `scope:app`, `type:app`. Use its Nx targets:

```powershell
npm exec nx -- run web:serve
npm exec nx -- run web:lint
npm exec nx -- run web:test
npm exec nx -- run web:build
```

Serve defaults to development at `http://localhost:4200/`. If the port is occupied, use `npm exec nx -- run web:serve --port=4300`. Build defaults to production and writes to `dist/apps/web`; unit tests use Vitest. The root `npm test` script is not the web test target.

The initial page shows the `Daylo` heading and a Polish preparation message. Its document title is `Daylo` and language is Polish. Themes follow system appearance by default; document-level `data-theme="light"` or `data-theme="dark"` overrides remain available. Plus Jakarta Sans is bundled locally; Material Symbols Outlined is loaded from Google Fonts for planned icon use, with preconnect links to its stylesheet and font hosts. Product navigation, authentication and task screens remain pending.

Development requests under `/api` are proxied to the NestJS server at `http://localhost:3000`. Managed real-stack E2E is available through `web-e2e:e2e-fullstack`; see the verification instructions below.

## Frontend shell smoke tests

Install the Playwright Chromium browser once after `npm ci` with `npm exec playwright -- install chromium`. Use the existing Nx project for test runs and debugging:

```powershell
npm exec nx -- run web-e2e:e2e --skipNxCache
npm exec nx -- run web-e2e:lint
npm exec nx -- run web-e2e:e2e:headed --skipNxCache
npm exec nx -- run web-e2e:e2e:debug --skipNxCache
npm exec nx -- run web-e2e:e2e:ui --skipNxCache
npm exec nx -- run web-e2e:e2e-report
```

The smoke test opens the real Angular shell and checks its `Daylo` heading, document title and Polish preparation message. Projects `chromium-desktop` (1440 × 900) and `chromium-mobile` (390 × 844, touch/mobile emulation) run by default. Mobile emulation does not replace a physical phone check. To select one project, append `--project=chromium-desktop` or `--project=chromium-mobile` to the E2E command.

Nx starts `web:serve` and waits for `http://localhost:4200` before the tests. Keep that port free when starting a run; Playwright reuses the server owned by the Nx task graph. The normal E2E target disables cache; retain `--skipNxCache` when requesting fresh evidence or using inferred CI targets. Tests do not mock responses. This endpoint-free shell needs only the frontend. The separate `e2e-fullstack` target owns API, isolated PostgreSQL and controlled-provider startup.

The headed configuration shows both browser projects; debug opens the Playwright Inspector for desktop, and UI opens the interactive test runner. Stop interactive sessions with Ctrl+C. The report target serves the latest HTML report at a loopback address (default port 9323) until stopped. These interactive commands are for local debugging, not CI verification.

HTML reports live in `dist/.playwright/apps/web-e2e/playwright-report`, test results in its sibling `test-output`, and CI blob reports in `blob-report`. Screenshots and traces are retained on failure, including a first local failure without retries. The report never opens automatically. These artifacts and browser authentication state are ignored by Git and must not be committed.

## Workspace boundary checks

The root ESLint configuration uses `@nx/enforce-module-boundaries` for platform, scope and type constraints, circular dependencies and forbidden external packages. Run it through the existing Nx lint targets:

```powershell
npm exec nx -- run-many -t lint -p web api web-e2e --skipNxCache
```

F01-04 uses only the built-in Nx rule. It adds no custom rules, metadata validator, fixture harness or workspace targets. Tag completeness, path consistency and capability-tag ownership are not automatically validated. Public entrypoints follow Nx's built-in import checks; no additional canonical-alias validation is implemented. CI wiring remains F01-05.

## Local runtime

Install and start Docker Desktop. Copy the documented local configuration once, then start PostgreSQL from the workspace root:

```powershell
Copy-Item .env.example .env
docker compose up -d postgres
docker compose ps
```

The Compose service uses the official `postgres:17-alpine` image, exposes PostgreSQL at `localhost:5433`, and stores development data in the named `daylo-postgres-data` volume. Port `5433` avoids the PostgreSQL service already using the owner's standard `5432` port; change `POSTGRES_PORT` and the port in `DATABASE_URL` together if needed. The example credentials are local development values only. Change `POSTGRES_PASSWORD` and its matching `DATABASE_URL` password together. The checked-in `.env.example` contains no production secret; `.env` and environment-specific variants remain ignored.

Stop the container while retaining data:

```powershell
docker compose down
```

Reset the development database only when its data can be discarded:

```powershell
docker compose down -v
docker compose up -d postgres
```

The reset command permanently deletes the named development volume. Automated tests will use separate database configuration in their later task.

## API shell

The NestJS application lives in `apps/api`. Install dependencies with `npm ci`, then use:

```powershell
npm exec nx -- run api:serve
npm exec nx -- run api:lint
npm exec nx -- run api:build
```

The API loads `.env.local` before `.env` and validates `NODE_ENV`, `PORT`, `DATABASE_URL`, `FRONTEND_ORIGIN`, `INITIAL_OWNER_EMAIL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, and `OAUTH_PKCE_ENCRYPTION_KEY` with Zod before listening. Missing or invalid required values stop startup with a specific configuration error without echoing their values. Set `INITIAL_OWNER_EMAIL` to the owner's verified Google email; it is trimmed and lowercased. Routes use the `/api` prefix.

`GET /api/health/ready` checks PostgreSQL with a `SELECT 1` query and a 1000 ms deadline. It returns HTTP 200 with `{"status":"ok","checks":{"database":"up"}}` when the database is available. A failed or timed-out check returns HTTP 503 with the standard `SERVICE_UNAVAILABLE` error envelope established in F04-01; the response does not expose connection details or raw database errors. Configuration validation tests live in `api-core-configuration`; readiness tests live in `api-core-database` and `api`.

Swagger UI is at `http://localhost:3000/api/docs`, and OpenAPI 3.0 JSON is at `/api/openapi.json`. `GET /api/auth/session` returns `status: pending | active` and `user: { id, email, displayName }` for a valid cookie, renewing the session and cookie for seven days from that request. Missing/expired/revoked sessions return HTTP 401 with `AUTHENTICATION_REQUIRED` and cannot be renewed. See [API conventions](docs/api-conventions.md). Run schema/API tests with `npm exec nx -- run-many -t test -p shared-schemas api`.

## OpenAPI and generated Angular client

Authentication/security outcomes are emitted as bounded JSON lines to the API's
stdout. They exclude secrets, emails and IPs; there is no permanent local log
store. Collection, access, retention and alerts are deferred to hosting. See
[Security logging](docs/security/security-logging.md) for event codes and limits.

Google OIDC transaction setup, verification and admission are documented in [Google authentication](docs/google-authentication.md). F06-01/F06-02 provide backend Google navigation, token verification and identity/admission persistence. F06-03 adds hashed database sessions, seven-day sliding renewal, session-bound CSRF/origin checks and revoking sign-out. Admitted callbacks create a `daylo_session` cookie and redirect to fixed `/today` or `/invitations`. F06-04 connects the authentication UI, entry/foreground checks and sign-out. Google navigation errors requested as HTML redirect to fixed login error destinations; non-HTML API clients retain safe JSON errors, including 403 for denied accounts.

Export and validate the specification, then generate Angular models and services with one command from the workspace root:

```powershell
npm run api:generate
```

This script delegates to the existing Nx generation target and its export/validation dependencies. Individual targets remain available:

```powershell
npm exec nx -- run api:openapi-export
npm exec nx -- run api:openapi-validate
npm exec nx -- run web-shared-api-client:generate
npm exec nx -- run web-shared-api-client:check
npm exec nx -- run web-shared-api-client:typecheck
npm exec nx -- run web-shared-api-client:lint
```

Generation first builds the offline exporter, exports and validates `docs/api/openapi.json`, then replaces only `libs/web/shared/api-client/src/generated`. Export/validation require installed npm dependencies, but no `.env`, secrets, HTTP server or running PostgreSQL. NestJS preview mode scans the actual application controller graph without constructing providers or running database lifecycle hooks. Normal API startup still loads and validates runtime configuration.

Client generation requires a running Docker engine with Linux containers and access to the workspace bind mount. It uses the official `openapitools/openapi-generator-cli` image pinned to version 7.26.0 and its SHA-256 digest; the first run needs network access to download that image. Java is not required on the host. Generator options pin Angular 22.2.2, RxJS 7.8.2 and TypeScript 6.0.3. Generation stages output under ignored `dist`, publishing only unmodified TypeScript sources, without timestamps, machine paths or generator bookkeeping.

Use the public import `@daylo/web/shared/api-client` from handwritten data-access libraries. The client includes `AuthenticationService.getCurrentSession()` and `HealthService.getReadiness()`. Application bootstrap imports `provideAuthentication` directly from `@daylo/web/core/auth/data-access`; that provider configures HttpClient and `provideApi('')` for same-origin `/api` requests. The generator's standalone default base URL is `http://localhost`. The library is consumed as source and has no publishable package or separate packaging build. Its `typecheck` target compiles all generated services/models with Angular's compiler. Generated templates have narrowly scoped lint style exceptions; Nx boundaries remain enforced.

Keep the specification and generated sources in version control, and never edit generated files manually. Regenerate after changing API contracts. The auth data-access library now consumes the generated session, CSRF and sign-out services.

## Frontend authentication

The login page lives in `libs/web/auth/features/login`. Application routes lazily
load it and the protected placeholder shell. Templates read separate named signals;
`@daylo/web/shared/util-router` exports `injectQueryParamMap()` for shared reactive
query-parameter access. Reusable session state, guards and providers belong to core
auth data-access.

Application bootstrap registers `provideAuthSessionLifecycle()` once for protected
foreground revalidation and session-loss navigation, independently of the shell.
Protected routes/groups declare `data.authAccess`; public login events preserve
recovery notices and do not renew sessions.

F06-06 security hardening limits sessions to 30 days from creation while retaining
the seven-day sliding window. New email-based admission requires Gmail or an
authoritative Workspace identity; existing active Google subjects remain usable.
HTTPS uses `__Host-` session/OAuth cookies and ignores old unprefixed credentials,
so an HTTPS rollout requires one new sign-in. Local development HTTP remains
compatible. Global API rate limiting, including stricter OAuth quotas, is implemented
and accepted in [F06-07](docs/tasks/F06-07-global-api-rate-limiting.md).
F06-08 adds S256 PKCE with an encrypted transaction-bound verifier. Before starting
the updated API, apply migrations and configure the independent 64-hex-character
`OAUTH_PKCE_ENCRYPTION_KEY`; see [key setup and rotation](docs/google-authentication.md).

The public `/login` screen navigates directly to `/api/auth/google`. Entry/reload checks the real session; active users go to `/today`, pending invitees to `/invitations`. Both destinations contain only a heading and sign-out control until their feature tasks arrive. Protected foreground return rechecks the session without background polling. A detected expired/revoked session redirects to `/login?error=expired` with a durable Polish error; normal anonymous entry and successful sign-out show no expiry error. Connection failures offer retry. Session tokens remain in HttpOnly cookies, and CSRF proof stays in memory.

Run the API and PostgreSQL using the existing instructions. In a separate frontend terminal, explicitly set the frontend port because Angular also honors the `PORT` variable loaded by Nx:

```powershell
$env:PORT = '4200'
npm exec nx -- run web:serve --port=4200
```

Keep `FRONTEND_ORIGIN` and `GOOGLE_CALLBACK_URL` consistent with that frontend origin. Real Google sign-in verification remains F06-05.

Focused auth checks use `npm exec nx -- run-many -t lint,test -p web-core-auth-data-access,web-core-shell,web-auth-feature-login,web-shared-util-router,web`. The ordinary `web-e2e:e2e` target keeps the public login-screen smoke check. The managed real-stack target runs that check, the existing session/rate-limit suites and a successful controlled-provider login on desktop/mobile:

```powershell
npm exec nx -- run web-e2e:e2e-fullstack
npm exec nx -- run web-e2e:environment-test
```

Prerequisites are Docker Desktop with Linux containers, installed Chromium (`npm exec playwright -- install chromium`) and the existing workspace build prerequisites. No real Google credentials or owner database configuration are required. Nx builds the production frontend, normal API and separate test API. The runner creates a uniquely named PostgreSQL 17 container with temporary storage, random credentials and loopback-only kernel-assigned ports, applies migrations through Nx and seeds synthetic owner/member/invited/outsider identities. It starts the real API with only Google's HTTP endpoints replaced, then serves the frontend build with a same-origin API proxy. Login exercises real OAuth state/browser binding, encrypted S256 PKCE, RS256 verification, admission and database sessions. Existing direct-session fixtures remain focused session checks; they do not prove successful Google login.

The test-only API entrypoint is absent from the normal API bundle and refuses development/production mode. Its local provider offers synthetic account selection, validates redirect/client/PKCE and consumes codes once. Production has no provider URL switch or test authentication endpoint. The managed target also runs `access.spec.ts`: owner/member/invited OAuth admission, outsider denial, reload, pending-route restrictions, real-CSRF sign-out, independent sessions of the same account and sliding/absolute expiry with reload/foreground recovery.

Reusable authentication support lives in `apps/web-e2e/src/support/authentication.fixture.ts`. Import its `test` and `expect`, then call `actors.login('owner' | 'member' | 'invited' | 'outsider')`. Each call creates a fresh context with the current desktop/mobile project options and follows the browser OAuth flow. The returned actor exposes `page`, `context`, `session()`, `sessionCount()` and `expire('sliding' | 'absolute')`. `session()` uses browser-origin fetch so Chromium sends the real Secure loopback cookie; Playwright's standalone HTTP client does not reproduce that transport behavior. Database operations validate the run-private destination and target only that actor's session hash; teardown closes every context and removes its remaining session. Seeded identities/invitations persist within the run, so these fixtures must not mutate their shared membership/admission state. The managed suite uses one worker to respect the actual per-IP quotas; login retries only quota rejection (HTTP 429 or its HTML recovery redirect) with bounded `Retry-After` waiting. Other failures fail immediately.

`browserClock.install(page)` and `browserClock.advance(page, milliseconds)` control only that page's JavaScript time. They do not advance API/PostgreSQL time or cookie expiry. Expiry scenarios first prove that advancing browser time leaves a real session valid, then change the owned session's database deadline through `actor.expire()` and exercise normal API validation. No backend clock override or fabricated acceptance session is used. Existing direct-session security regression tests remain distinct. No active-only business API endpoint exists yet; pending API resource denial must be exercised when those features are delivered, without adding a test-only product endpoint.

Pass Playwright filters through Nx run-commands, for example `--args="--grep=active --project=chromium-desktop"`, to avoid confusing the Playwright project with the Nx project.

Every run owns its database/container and fresh browser contexts. No reset/drop command accepts an external database. Cleanup checks the exact container identity and run label, stops only owned processes and removes temporary PostgreSQL storage on success or failure. Existing listeners are never reused or killed. For independent browser inspection:

```powershell
npm exec nx -- run web-e2e:e2e-fullstack:inspect --output-style=stream
```

Open the printed loopback URL. Stop normally with Ctrl+C, or create the exact run-private `stop` file printed by the runner to request cleanup (useful from another PowerShell terminal). Forced termination of the runner or Docker can prevent cleanup; inspect containers by their `daylo.e2e.run` label and remove only the exact run-owned container after checking its identity. Reports, synthetic API logs and public-address/cleanup records stay under ignored `dist/.playwright`; browser authentication state and database credentials are not written to manifests. Hosted CI still runs the existing shell suite; hosted full-stack execution is not claimed.

Inspect separately from Playwright: navigate to `/login`, select a synthetic account through the provider, check owner access and reload, invited `/today` recovery to `/invitations`, outsider denial and sign-out. At desktop and mobile widths inspect the visible states, keyboard operation, overflow, browser storage and console/network diagnostics. For manual expiry use only the exact session created in that inspection run's isolated database, then reload a protected route and verify the persistent expiry notice. Anonymous/expired session HTTP 401 responses are expected. Do not treat controlled-provider checks as real Google verification. Reports, screenshots and retained failure traces can contain cookies, CSRF/OAuth values or synthetic identity data: keep them in ignored `dist` paths, review/redact before sharing and never commit or upload raw browser authentication state. Acceptance fixture contexts do not export storage state; custom actor contexts are closed at teardown, so use the independent inspection workflow for visual evidence rather than assuming a default-page failure screenshot captures them.

The `web-shared-api-client:check` target exports, validates and generates twice under ignored `dist`, checks determinism, then compares the specification and the entire generated directory byte for byte with source artifacts. It does not rewrite source. A failure lists added, removed and changed files and recommends `npm run api:generate`. Temporary output is removed on success or failure. Avoid running generation and drift checks concurrently.

Every `web:build` depends on this uncached check and client compilation, including when the build itself is cached. Frontend builds therefore require Docker as well. CI checks drift and compiles the client unconditionally before affected/full quality checks, so a contract change cannot escape verification because the client has no frontend consumer yet. CI uses the Linux Docker engine supplied by the GitHub-hosted Ubuntu runner; hosted execution requires separate confirmation.

In a restricted agent session that blocks Nx sockets or plugin subprocesses, set `NX_DAEMON=false` and `NX_ISOLATE_PLUGINS=false` for that session. Disabling the daemon also disables automatic server restarts on file changes.

## Commit conventions and CI

Use English Conventional Commits for commit messages and PR titles, for example `ci(workspace): add affected PR checks`. Commitlint CLI/config-conventional 21.2.3 and Husky 9.1.7 are pinned in the npm lockfile. `npm ci` installs the local `commit-msg` hook through `prepare`; Git for Windows provides the shell used by Husky. Hook files keep LF endings. The hook validates messages only; it does not run lint or tests. English wording and imperative phrasing remain review responsibilities.

Check examples in PowerShell without creating commits:

```powershell
'ci(workspace): add affected PR checks' | npm.cmd exec --no -- commitlint --strict
'update CI' | npm.cmd exec --no -- commitlint --strict
'ci(workspace): add affected PR checks' | npm.cmd exec --no -- commitlint --config commitlint.pr.config.cjs --strict
```

The first and third examples pass; the second fails. PR-title validation disables commitlint's default merge/revert ignores. Git-generated merge commits retain the preset's default handling when checking real commit history.

`.github/workflows/ci.yml` runs on PRs targeting `main` (including title edits and draft PRs), and pushes to `main`. Three jobs check conventions, quality and E2E. PR jobs check out the branch head with full history and pass the event's base/head SHA to Nx; commitlint checks from their merge base to the head. Missing history fails the check. Titles enter the command through an environment variable, not shell interpolation. Jobs use read-only repository permissions and no application secrets.

For PRs, Nx runs only affected projects and their dependents:

```powershell
$taskBase = git rev-parse origin/main
$taskHead = git rev-parse HEAD
npm exec nx -- affected -t lint test build --base=$taskBase --head=$taskHead
npm exec nx -- affected -t e2e --base=$taskBase --head=$taskHead
```

These commands compare committed revisions. For local work before committing, use `npm exec nx -- affected -t lint test build --uncommitted`. Pushes to `main` run the full `lint`, `test`, `build` and `e2e` targets. Quality currently covers web/API/E2E lint, web unit tests and both production builds. The root's obsolete failing test placeholder was removed; no API unit-test target exists yet.

The E2E job selects projects first and installs Chromium with OS dependencies only when an E2E target is selected. The existing web-to-E2E dependency includes desktop/mobile smoke when the frontend changes. The uncached `e2e` target uses the real frontend. API/database integration remains in later tasks. Reports and failure artifacts are uploaded for seven days, including failed runs.

`.node-version` pins Node.js 24.19.0. Workflow/runtime files are shared Nx inputs so their changes affect application checks too. Official checkout 7.0.1, setup-node 7.0.0 and upload-artifact 7.0.1 actions are pinned by commit SHA; npm download caching is enabled, with no Nx Cloud or persisted Nx result cache. Boundary checking remains the built-in Nx ESLint rule from F01-04. CI does not add custom metadata validation or change branch protection.
