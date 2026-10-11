# F02-02 — Database-aware API readiness

Parent backlog item: **F02** · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: **Completed with the owner on 2026-10-09.**
Implementation authorization: **Granted by the owner on 2026-10-09.**
Delivery status: **Implemented and verified on 2026-10-11; owner acceptance pending.**

## Assumptions and sources

- The first release runs locally. PostgreSQL uses Docker Compose; Angular proxies /api to NestJS. Development and test configuration must remain separate.
- Dependencies: F02-01. Confirm their delivered and verified behavior before dependent work.
- Read [product requirements](../product-requirements.md), [architecture](../architecture.md) and [backlog](../backlog.md). Apply the relevant [frontend](../frontend-architecture.md), [backend](../backend-architecture.md) and [design-system](../design/design-system.md) rules.
- This is a proposed bounded task. Inspect discoverable implementation facts; resolve material product decisions with the owner during the discussion.

## Work to perform

- [x] Add API readiness including a database probe and explicit unavailable response; document the endpoint.

## Acceptance criteria

The work above must satisfy this task-specific observable outcome:

Readiness succeeds with DB available and fails when DB is down; recovery succeeds after DB returns.

The owner must confirm the final criteria during discussion. Applicable checks must pass, evidence and limitations must be recorded, and no blocking defect may remain. Implementation, verification and owner acceptance are tracked separately.

## Verification plan

- [x] Readiness succeeds with DB available and fails when DB is down; recovery succeeds after DB returns.

- Inspect available Nx targets and use project generators/targets where applicable; select exact commands after inspection rather than inventing flags.
- Run affected lint, meaningful tests and production builds. For API contract changes, export/validate OpenAPI, regenerate the Angular client and check drift.
- For user-facing changes, run applicable real-stack Playwright scenarios and independently inspect the running UI through an available browser tool at relevant desktop/mobile widths, including keyboard behavior and console/network errors where supported.
- Use synthetic data and keep secrets, authentication state, reports, screenshots and traces out of version control.
- Record unavailable checks as incomplete. For review/manual-only tasks, mark inapplicable automated checks with a reason; do not rerun unrelated checks solely to fill the report.

## Discussion before implementation

Discuss this task with the owner before application changes:

1. What exact readiness path, response contract, timeout and unavailable status should consumers use?
2. Confirm assumptions, dependencies, scope boundaries and the observable acceptance scenarios above.
3. Agree on implementation approach, affected areas, required checks and any remaining limitations; resolve material ambiguities explicitly.

Record the discussion outcome below. Agreement on documentation alone is not implementation authorization. Start implementation only after the discussion is complete and the owner explicitly requests implementation of the agreed scope. Do not interpret silence or a request to discuss as approval.

### Decision record

- Discussion date: 2026-10-09.
- Agreed assumptions and behavior: Expose `GET /api/health/ready`. Return HTTP 200 with `{"status":"ok","checks":{"database":"up"}}` when a PostgreSQL `SELECT 1` probe succeeds. Return HTTP 503 with `{"status":"error","checks":{"database":"down"}}` when the probe fails or exceeds 1000 ms. Do not expose connection details or raw database errors.
- Agreed scope and exclusions: Add only database-aware readiness and its endpoint documentation. Prisma, migrations, database lifecycle/transaction support, liveness, Swagger/OpenAPI and rendered UI changes remain in later tasks.
- Agreed approach and verification: Add a focused `api-core-database` infrastructure library, integrate it into the API composition root, and cover the response contract and failure mapping with meaningful tests. Verify the real runtime sequence database available, unavailable and available again, plus affected lint, tests and the API production build.
- Unresolved questions: None.
- Owner implementation authorization: Granted through the instruction “tak, zatwierdzam” on 2026-10-09 after reviewing the proposed contract, scope and verification.

## Scope boundaries

Only the work listed above belongs to this task. Follow the parent backlog boundary and approved architecture; do not implement subsequent tasks, speculative libraries or deferred MVP features. Preserve existing delivered work and original design exports. Git initialization, commits, publication and deployment require their own authorization.

## Delivery and review record

- Delivered behavior: Added `GET /api/health/ready` through the focused `api-core-database` infrastructure library. The endpoint runs `SELECT 1` with a 1000 ms overall deadline and returns the agreed stable 200/503 bodies without connection details or raw database errors. The API composition root imports the module, and the README documents the endpoint and scope boundary.
- Checks executed and outcomes: Fresh `api-core-database:test` passed three service and two controller tests covering success, query failure, timeout and 503 mapping. Fresh lint passed for `api-core-database` and `api`; the API production build passed. A real API and PostgreSQL sequence returned 200 with `{"status":"ok","checks":{"database":"up"}}`, then 503 with `{"status":"error","checks":{"database":"down"}}` while PostgreSQL was stopped, then the same 200 response after PostgreSQL became healthy again. All Nx checks ran without cache.
- Browser scenarios and viewport coverage: Not applicable. This backend-only endpoint has no rendered UI change; the real HTTP contract was exercised directly.
- Known limitations / incomplete verification: Swagger/OpenAPI export and Angular client generation remain intentionally deferred to F04/F05 under the agreed scope. The local API and PostgreSQL processes started for verification were stopped afterward.
- Owner acceptance: Pending.
- Retrospective and workflow improvements: The restricted session again blocked Nx plugin subprocesses, so verification used the documented daemon/plugin-isolation settings outside the sandbox. Docker Desktop was initially stopped; checking engine readiness before Compose reduced ambiguity, and the final sequence restored the database before cleanup.

Update this record and the parent backlog after delivery/review. Do not mark the parent item accepted until all of its criteria are met and the owner accepts it.
