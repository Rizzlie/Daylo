# F02-01 — Local PostgreSQL and runtime configuration

Parent backlog item: **F02** · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: **Completed with the owner on 2026-10-06.**
Implementation authorization: **Granted by the owner on 2026-10-06.**
Delivery status: **Implemented and verified on 2026-10-06; owner acceptance pending.**

## Assumptions and sources

- The first release runs locally. PostgreSQL uses Docker Compose; Angular proxies /api to NestJS. Development and test configuration must remain separate.
- Dependencies: F01. Confirm their delivered and verified behavior before dependent work.
- Read [product requirements](../product-requirements.md), [architecture](../architecture.md) and [backlog](../backlog.md). Apply the relevant [frontend](../frontend-architecture.md), [backend](../backend-architecture.md) and [design-system](../design/design-system.md) rules.
- This is a proposed bounded task. Inspect discoverable implementation facts; resolve material product decisions with the owner during the discussion.

## Work to perform

- [x] Add local PostgreSQL Compose service, persistent development storage, validated API configuration, `.env.example`, frontend `/api` proxy and start/stop instructions.
- [x] Keep secrets out of source.

## Acceptance criteria

The work above must satisfy this task-specific observable outcome:

Fresh local DB starts; API reaches it; missing/invalid required configuration fails clearly.

The owner must confirm the final criteria during discussion. Applicable checks must pass, evidence and limitations must be recorded, and no blocking defect may remain. Implementation, verification and owner acceptance are tracked separately.

## Verification plan

- [x] Fresh local DB starts; the API runtime host reaches the published database port and starts with its validated URL; missing/invalid required configuration fails clearly. The database-aware API probe remains F02-02.

- Inspect available Nx targets and use project generators/targets where applicable; select exact commands after inspection rather than inventing flags.
- Run affected lint, meaningful tests and production builds. For API contract changes, export/validate OpenAPI, regenerate the Angular client and check drift.
- For user-facing changes, run applicable real-stack Playwright scenarios and independently inspect the running UI through an available browser tool at relevant desktop/mobile widths, including keyboard behavior and console/network errors where supported.
- Use synthetic data and keep secrets, authentication state, reports, screenshots and traces out of version control.
- Record unavailable checks as incomplete. For review/manual-only tasks, mark inapplicable automated checks with a reason; do not rerun unrelated checks solely to fill the report.

## Discussion before implementation

Discuss this task with the owner before application changes:

1. Which local ports, database names and startup steps fit the owner environment, and how should development data be retained?
2. Confirm assumptions, dependencies, scope boundaries and the observable acceptance scenarios above.
3. Agree on implementation approach, affected areas, required checks and any remaining limitations; resolve material ambiguities explicitly.

Record the discussion outcome below. Agreement on documentation alone is not implementation authorization. Start implementation only after the discussion is complete and the owner explicitly requests implementation of the agreed scope. Do not interpret silence or a request to discuss as approval.

### Decision record

- Discussion date: 2026-10-06.
- Agreed assumptions and behavior: Use Docker Desktop with the official `postgres:17-alpine` image, container name `daylo-postgres`, and `daylo` as the development database and user. The initially agreed host port `5432` was occupied by the owner's healthy `homey-postgres` container during implementation, so Daylo uses `5433` without disturbing that service. Retain development data in a named Docker volume. Keep `.env` out of source control and provide safe local placeholders in `.env.example`.
- Agreed scope and exclusions: F02-01 includes Docker Compose, persistent development storage, validated `NODE_ENV`, `PORT`, `DATABASE_URL`, and `FRONTEND_ORIGIN` configuration, Angular `/api` proxying, and start/stop/reset instructions. Prisma, migrations, and the database-aware readiness endpoint remain in F03 and F02-02 respectively.
- Agreed approach and verification: Use `docker compose up -d` and `docker compose down`, with the destructive data reset documented separately as `docker compose down -v`. Verify Compose rendering and health, API startup with valid configuration, clear startup failure for missing or invalid required configuration, frontend proxy configuration, affected lint/tests, and production builds.
- Unresolved questions: None.
- Owner implementation authorization: Granted through the instruction “tak zróbmy to” on 2026-10-06 after confirming the proposed settings and scope.
- Follow-up decision: On 2026-10-09 the owner requested Zod for environment validation. The handwritten validation was replaced with a Zod 4 schema while preserving the agreed required fields, normalization, fail-fast startup behavior, and error clarity.

## Scope boundaries

Only the work listed above belongs to this task. Follow the parent backlog boundary and approved architecture; do not implement subsequent tasks, speculative libraries or deferred MVP features. Preserve existing delivered work and original design exports. Git initialization, commits, publication and deployment require their own authorization.

## Delivery and review record

- Delivered behavior: Added the official `postgres:17-alpine` Compose service, `daylo-postgres` container, persistent `daylo-postgres-data` volume, health check, safe example development configuration, ignored local environment files, and documented start/stop/reset commands. Daylo uses host port `5433` because the existing healthy `homey-postgres` owns `5432`. Added the `api-core-configuration` Nx infrastructure library with a Zod 4 startup schema for `NODE_ENV`, `PORT`, `DATABASE_URL`, and `FRONTEND_ORIGIN`; API bootstrap now consumes the validated port. Angular development serving proxies `/api` to NestJS. Added pinned `@nestjs/config` 4.0.2, compatible with NestJS 11 and the current CommonJS API build, and pinned Zod 4.6.5.
- Checks executed and outcomes: `docker compose --env-file .env.example config` rendered successfully. Compose created the named volume and container; `docker compose ps` reported healthy on `0.0.0.0:5433`, `pg_isready` accepted connections, and `psql` returned database/user `daylo|daylo`. Host TCP reachability to `localhost:5433` passed. After the Zod follow-up, fresh `api-core-configuration` test and lint targets passed; the suite covers normalization, every missing required field, invalid port/environment/database protocol/frontend origin. A fresh API production build passed. The built API started on port 3101 with valid Zod-parsed configuration and returned its expected endpoint-free JSON 404 at `/api`; an invalid `NODE_ENV` exited with code 1 and the expected field-specific error. Earlier F02-01 verification also passed lint for `api`, `api-core-configuration`, and `web`, both production builds, missing/invalid configuration startup checks, and the real Angular-to-NestJS proxy request. Final `git diff --check` passed after repairing a generator newline artifact.
- Browser scenarios and viewport coverage: N/A. This task changes local infrastructure and development routing without changing rendered UI. The proxy was exercised over HTTP through the real Angular development server and NestJS process; both verification processes were stopped and ports 3000/4200 released.
- Known limitations / incomplete verification: F02-01 provides and validates `DATABASE_URL`, and host/database reachability passed. The API does not yet issue a database query during normal runtime; database-aware readiness and down-database behavior are explicitly F02-02. Prisma lifecycle and migrations remain F03. The PostgreSQL development container remains running as the requested local runtime. No production secrets were used or committed.
- Owner acceptance: Pending review. F02 remains incomplete because F02-02 is pending.
- Retrospective and workflow improvements: Inspect occupied host ports before the first Compose start; the discovered `5432` collision was resolved without stopping the owner's unrelated container. Check package module format as well as peer dependency ranges: `@nestjs/config` 12 accepts NestJS 11 but is ESM-only, so the implementation pins compatible 4.0.2. The Nx generator introduced malformed newline bytes in the root ESLint file; restoring its original content before final diff validation prevented unrelated churn.

Update this record and the parent backlog after delivery/review. Do not mark the parent item accepted until all of its criteria are met and the owner accepts it.
