# F05-01 — OpenAPI export and Angular client generation

Parent backlog item: **F05** · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: **Completed with the owner on 2026-10-12.**
Implementation authorization: **Granted on 2026-10-12: "tak zatwierdzam", confirming the proposed scope and implementation request.**
Delivery status: Closed — implemented, verified and owner-accepted on 2026-10-12.

## Assumptions and sources

- OpenAPI 3.0 and a pinned typescript-angular generator are the approved pipeline. Export must not require a live database. Generated files are never edited manually.
- Dependencies: F04. Confirm their delivered and verified behavior before dependent work.
- Read [product requirements](../product-requirements.md), [architecture](../architecture.md) and [backlog](../backlog.md). Apply the relevant [frontend](../frontend-architecture.md), [backend](../backend-architecture.md) and [design-system](../design/design-system.md) rules.
- This is a proposed bounded task. Inspect discoverable implementation facts; resolve material product decisions with the owner during the discussion.

## Work to perform

- [x] Add Nx OpenAPI export/validation/generation targets; pin `typescript-angular` generator and matching Angular configuration.
- [x] Store specification and generated client at the approved location.

## Acceptance criteria

The work above must satisfy this task-specific observable outcome:

Export works without HTTP server or live DB; output has no timestamps/machine paths; generated client compiles.

The owner must confirm the final criteria during discussion. Applicable checks must pass, evidence and limitations must be recorded, and no blocking defect may remain. Implementation, verification and owner acceptance are tracked separately.

## Verification plan

- [x] Export works without HTTP server or live DB; output has no timestamps/machine paths; generated client compiles.

- Inspect available Nx targets and use project generators/targets where applicable; select exact commands after inspection rather than inventing flags.
- Run affected lint, meaningful tests and production builds. For API contract changes, export/validate OpenAPI, regenerate the Angular client and check drift.
- For user-facing changes, run applicable real-stack Playwright scenarios and independently inspect the running UI through an available browser tool at relevant desktop/mobile widths, including keyboard behavior and console/network errors where supported.
- Use synthetic data and keep secrets, authentication state, reports, screenshots and traces out of version control.
- Record unavailable checks as incomplete. For review/manual-only tasks, mark inapplicable automated checks with a reason; do not rerun unrelated checks solely to fill the report.

## Discussion before implementation

Discuss this task with the owner before application changes:

1. Which compatible generator version and deterministic options should be pinned after inspecting installed tool versions?
2. Confirm assumptions, dependencies, scope boundaries and the observable acceptance scenarios above.
3. Agree on implementation approach, affected areas, required checks and any remaining limitations; resolve material ambiguities explicitly.

Record the discussion outcome below. Agreement on documentation alone is not implementation authorization. Start implementation only after the discussion is complete and the owner explicitly requests implementation of the agreed scope. Do not interpret silence or a request to discuss as approval.

### Decision record

- Discussion date: 2026-10-12.
- Agreed assumptions and behavior: Export OpenAPI 3.0 from existing controllers without an HTTP listener, live database or secrets. Store the specification at `docs/api/openapi.json` and the generated Angular client at `libs/web/shared/api-client`. Pin OpenAPI Generator 7.26.0 with Angular 22.1.8 configuration.
- Agreed scope and exclusions: Nx export, validation and client-generation targets, committed deterministic artifacts, and client compilation. CI drift enforcement remains F05-02; UI and authentication behavior remain unchanged. No commit or publication is requested.
- Agreed approach and verification: Reuse the existing Swagger document builder and controller metadata; generate an internal Nx Angular library. Verify export without database/server, compare two generations, compile the generated client, and run relevant lint/tests/builds. Use the official pinned Docker generator image because the installed Java 8 cannot run the generator; Docker is already available.
- Unresolved questions: None for this bounded scope.
- Owner implementation authorization: "tak zatwierdzam", 2026-10-12, in response to the concrete scope and implementation question.
- Owner tooling clarification: "Aaa bo jeśli ktos nie ma javy, ok, zostańmy ze spawnem dockera", 2026-10-12. Keep direct Docker invocation; do not add the npm Java wrapper or require host Java.

## Scope boundaries

Only the work listed above belongs to this task. Follow the parent backlog boundary and approved architecture; do not implement subsequent tasks, speculative libraries or deferred MVP features. Preserve existing delivered work and original design exports. Git initialization, commits, publication and deployment require their own authorization.

## Delivery and review record

- Delivered behavior: Added Nx `api:openapi-build`, `api:openapi-export`, `api:openapi-validate`, `web-shared-api-client:generate` and `web-shared-api-client:typecheck`. The Nx-generated non-buildable Angular library has the approved public import and platform/scope/type tags. OpenAPI 3.0 is stored in `docs/api/openapi.json`; 19 unmodified generated TypeScript files include current-session/readiness services and public models. The official Docker image is pinned to 7.26.0 plus digest; options match installed Angular/RxJS/TypeScript. Only TypeScript output is published from staging; bookkeeping/docs/scripts remain outside source. Generated-only lint style exceptions retain Nx boundary enforcement. No npm dependency was added.
- Implementation approach: The runtime composition root loads validated configuration through `RuntimeAppModule`; offline export scans the same `AppModule` in NestJS preview mode without provider construction or lifecycle hooks. Database infrastructure explicitly imports `ConfigModule` for its existing DI dependencies. Normal startup remains database-backed; there is no test authentication or runtime export flag. API tests now depend on Prisma generation because the export tests inspect the actual application graph.
- Checks executed and outcomes: The full generation/export/Swagger Parser validation chain passed. Three new export tests verify real operations, valid schemas, no HTTP listener/PG connection/Prisma lifecycle, repeatable output and canonical serialization; all 20 API tests passed. Fresh lint passed for API, database and client; generated services/models passed Angular `ngc --noEmit`. Fresh production builds passed for API/web, and ordinary tests passed for API/database/configuration/web. Existing opt-in database integration cases remained skipped by design. SHA-256 comparison confirmed identical specification and all 19 client files across two generations, with no machine paths or timestamps. Export from an empty working directory with runtime variables removed, no `.env`, and stopped PostgreSQL matched the artifact. Normal API startup against real PostgreSQL returned readiness 200, session 401, and a served specification equal to the offline export. `git diff --check` passed for tracked changes.
- Browser scenarios and viewport coverage: N/A: no product UI, Swagger layout or HTTP contract changed. Runtime/offline specification equality and HTTP smoke checks verify the composition-root change; no new browser verification is claimed.
- Known limitations / incomplete verification: Generation requires Docker with Linux containers; the first image pull requires network access. Future frontend wiring must configure the client for same-origin requests; current generator default is `http://localhost`. The client is not yet connected to a frontend workflow. CI drift enforcement and build/CI integration remain F05-02; authentication remains F06. No hosted CI execution is claimed. No commit or publication was requested.
- Verification cleanup: Removed generator staging directories, stopped the owned API process and returned `daylo-postgres` to its previous stopped state; unrelated containers/data were unchanged. Verification hash snapshots and offline files remain under ignored `dist`.
- Owner acceptance: Granted on 2026-10-12: "ok super, akceptuje zmiany". Covers F05-01 including `npm run api:generate`. F05-02 remains pending; no commit or publication is authorized by this acceptance.
- Publication authorization: On 2026-10-12, the owner requested staging, committing, pushing and opening a PR using `yeet`: "super, wystaw PR przy uzyciu $yeet". This explicitly authorizes publication of the accepted F05-01 changes.
- Follow-up verification: Fresh `npm exec nx -- run-many -t lint --skipNxCache` passed for all nine workspace projects, including the generated client, on 2026-10-12.
- Owner-requested convenience command: Added `npm run api:generate` in `package.json`, delegating to the existing Nx generation target and its export/validation dependencies. The complete command passed on 2026-10-12; README documents it. No extra export or duplicated target chain is needed.
- Retrospective and workflow improvements: NestJS preview suppresses construction but still requires resolvable provider tokens. Keep environment loading outside the export graph and import existing DI dependencies explicitly. Treat generated templates as owned by the generator: scope style exceptions rather than rewriting their output. Avoid persisting generator bookkeeping or machine-specific staging paths. Explain the Java/Docker dependency early and preserve the owner's final tooling preference.

Update this record and the parent backlog after delivery/review. Do not mark the parent item accepted until all of its criteria are met and the owner accepts it.
