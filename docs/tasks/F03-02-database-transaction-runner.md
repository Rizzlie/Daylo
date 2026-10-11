# F03-02 — Database lifecycle and transaction runner

Parent backlog item: **F03** · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: **Completed on 2026-10-11.**
Implementation authorization: **Granted by the owner on 2026-10-11 for the agreed F03-02 scope.**
Delivery status: **Implemented and verified on 2026-10-11; owner acceptance pending.**

## Assumptions and sources

- Prisma owns PostgreSQL persistence and versioned migrations. UUIDs and UTC audit timestamps are required; task date/time values follow the agreed Warsaw wall-clock semantics. Internal transaction contracts must not expose Prisma.
- Dependencies: F03-01. Confirm their delivered and verified behavior before dependent work.
- Read [product requirements](../product-requirements.md), [architecture](../architecture.md) and [backlog](../backlog.md). Apply the relevant [frontend](../frontend-architecture.md), [backend](../backend-architecture.md) and [design-system](../design/design-system.md) rules.
- This is a proposed bounded task. Inspect discoverable implementation facts; resolve material product decisions with the owner during the discussion.

## Work to perform

- [x] Add database lifecycle and minimal transaction contracts/runner.
- [x] Area adapters can participate in the same transaction without exposing Prisma through public/internal contracts.
- [x] Business use cases remain in later tasks.

## Acceptance criteria

The work above must satisfy this task-specific observable outcome:

Integration checks prove same-transaction participation, commit/rollback and NestJS provider resolution. Invitation acceptance behavior is verified in M03-03.

The owner must confirm the final criteria during discussion. Applicable checks must pass, evidence and limitations must be recorded, and no blocking defect may remain. Implementation, verification and owner acceptance are tracked separately.

## Verification plan

- [x] Integration checks prove same-transaction participation, commit/rollback and NestJS provider resolution.
- [x] Invitation acceptance behavior remains assigned to M03-03 and is not claimed by this task.

- Inspect available Nx targets and use project generators/targets where applicable; select exact commands after inspection rather than inventing flags.
- Run affected lint, meaningful tests and production builds. For API contract changes, export/validate OpenAPI, regenerate the Angular client and check drift.
- For user-facing changes, run applicable real-stack Playwright scenarios and independently inspect the running UI through an available browser tool at relevant desktop/mobile widths, including keyboard behavior and console/network errors where supported.
- Use synthetic data and keep secrets, authentication state, reports, screenshots and traces out of version control.
- Record unavailable checks as incomplete. For review/manual-only tasks, mark inapplicable automated checks with a reason; do not rerun unrelated checks solely to fill the report.

## Discussion before implementation

Discuss this task with the owner before application changes:

1. What minimal transaction API and lifecycle behavior meet the approved ownership rules, and which integration fixture proves shared transaction participation?
2. Confirm assumptions, dependencies, scope boundaries and the observable acceptance scenarios above.
3. Agree on implementation approach, affected areas, required checks and any remaining limitations; resolve material ambiguities explicitly.

Record the discussion outcome below. Agreement on documentation alone is not implementation authorization. Start implementation only after the discussion is complete and the owner explicitly requests implementation of the agreed scope. Do not interpret silence or a request to discuss as approval.

### Decision record

- Discussion date: 2026-10-11.
- Agreed assumptions and behavior: The database infrastructure owns Prisma lifecycle and executes atomic work. Feature use cases receive a narrow `TransactionRunner` contract and pass an opaque transaction context to participating adapters so all required operations use the same PostgreSQL transaction without exposing Prisma through the contract.
- Agreed scope and exclusions: Add the transaction contract library, Prisma lifecycle provider and transaction runner. Prove the infrastructure with two test adapters using the existing `users` and `user_preferences` tables. Business repositories, invitation behavior, endpoints, schema or migration changes, event publication and UI remain excluded.
- Agreed approach and verification: Use a NestJS runtime token for the runner, connect and disconnect the Prisma client through Nest lifecycle hooks, and implement the runner with a Prisma interactive transaction. Verify NestJS provider resolution and real-PostgreSQL commit, rollback and shared-context participation; run affected lint/tests and the API production build. Browser and Playwright verification are not applicable because the task has no user-facing behavior.
- Unresolved questions: None.
- Owner implementation authorization: Granted on 2026-10-11 with the instruction `ok to zacznijmy implementacje` after reviewing the purpose and proposed scope.

## Scope boundaries

Only the work listed above belongs to this task. Follow the parent backlog boundary and approved architecture; do not implement subsequent tasks, speculative libraries or deferred MVP features. Preserve existing delivered work and original design exports. Git initialization, commits, publication and deployment require their own authorization.

## Delivery and review record

- Delivered behavior: Added a framework-neutral transaction contract library with an opaque `TransactionContext`, generic `TransactionRunner` and explicit NestJS token. The database infrastructure now owns a Prisma 7 client backed by the PostgreSQL adapter, connects and disconnects through NestJS lifecycle hooks, executes interactive transactions and validates that adapters use a context created by its runner. `ApiCoreDatabaseModule` exports the runner token and `PrismaService` for data-access implementations. No schema, migration, endpoint or business-use-case behavior changed.
- Checks executed and outcomes: Fresh contract/database lint and the database test target passed without cache. The final ordinary suite covers 10 non-database tests and skips the opt-in integration suite when `RUN_DATABASE_INTEGRATION` is absent. Against a newly created `daylo_f03_02_verify` PostgreSQL database with the existing migration applied, all 11 tests passed, including NestJS provider resolution, lifecycle initialization/closure, two adapters committing through one context, both writes rolling back after an error and foreign-context rejection. A fresh API production build passed. After CI exposed that the ignored generated client was absent on a clean checkout, the database test and API build targets were made dependent on `prisma-generate`; deleting the local client and rerunning the full affected lint/test/build command then passed with 10 unit tests and the API production build. `git diff --check` passed.
- Browser scenarios and viewport coverage: N/A. F03-02 changes backend infrastructure only and exposes no user-facing or HTTP behavior.
- Known limitations / incomplete verification: Business repositories and transaction orchestration remain in their feature tasks. Invitation acceptance is intentionally deferred to M03-03, and post-commit event publication remains a later updates task. The integration suite requires the explicit `RUN_DATABASE_INTEGRATION=true` flag and a migrated test database. The isolated verification database was removed and PostgreSQL was returned to its prior stopped state.
- Draft pull request: [#9 — feat(api): add database transaction runner](https://github.com/Rizzlie/Daylo/pull/9).
- Owner acceptance: Pending.
- Retrospective and workflow improvements: Gate real-database suites with an explicit opt-in flag rather than inferring intent from `DATABASE_URL`, because local configuration may be present while PostgreSQL is stopped. Keep transaction-context construction private to infrastructure and verify both compile-time contract separation and runtime context provenance. Before claiming a build that imports ignored generated code, remove the local artifact and verify that Nx regenerates it through declared target dependencies.

Update this record and the parent backlog after delivery/review. Do not mark the parent item accepted until all of its criteria are met and the owner accepts it.
