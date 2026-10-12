# F04-02 — Current-session contract and Swagger

Parent backlog item: **F04** · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: **Completed with the owner on 2026-10-12.**
Implementation authorization: **Granted on 2026-10-12: "Ok, w takim razie zróbmy to".**
Delivery status: Closed — implemented, verified and owner-accepted on 2026-10-12.

## Assumptions and sources

- Zod 4 public schemas are distinct from Prisma models and internal contracts. nestjs-zod provides runtime validation/serialization and Swagger integration. Authenticated session behavior belongs to F06.
- Dependencies: F04-01. Confirm their delivered and verified behavior before dependent work.
- Read [product requirements](../product-requirements.md), [architecture](../architecture.md) and [backlog](../backlog.md). Apply the relevant [frontend](../frontend-architecture.md), [backend](../backend-architecture.md) and [design-system](../design/design-system.md) rules.
- This is a proposed bounded task. Inspect discoverable implementation facts; resolve material product decisions with the owner during the discussion.

## Work to perform

- [x] Define the current-session contract as the first contract-to-client example; provide Swagger UI and OpenAPI JSON with stable operation IDs and OpenAPI 3.0.
- Authenticated session behavior remains in F06.

## Acceptance criteria

The work above must satisfy this task-specific observable outcome:

Specification validates and endpoints work; response-schema validation is exercised without fabricating authenticated runtime access.

The owner must confirm the final criteria during discussion. Applicable checks must pass, evidence and limitations must be recorded, and no blocking defect may remain. Implementation, verification and owner acceptance are tracked separately.

## Verification plan

- [x] Specification validates and endpoints work; response-schema validation is exercised without fabricating authenticated runtime access.

- Inspect available Nx targets and use project generators/targets where applicable; select exact commands after inspection rather than inventing flags.
- Run affected lint, meaningful tests and production builds. For API contract changes, export/validate OpenAPI, regenerate the Angular client and check drift.
- For user-facing changes, run applicable real-stack Playwright scenarios and independently inspect the running UI through an available browser tool at relevant desktop/mobile widths, including keyboard behavior and console/network errors where supported.
- Use synthetic data and keep secrets, authentication state, reports, screenshots and traces out of version control.
- Record unavailable checks as incomplete. For review/manual-only tasks, mark inapplicable automated checks with a reason; do not rerun unrelated checks solely to fill the report.

## Discussion before implementation

Discuss this task with the owner before application changes:

1. What are the exact anonymous, pending and active current-session response shapes, and which behavior remains deferred to F06?
2. Confirm assumptions, dependencies, scope boundaries and the observable acceptance scenarios above.
3. Agree on implementation approach, affected areas, required checks and any remaining limitations; resolve material ambiguities explicitly.

Record the discussion outcome below. Agreement on documentation alone is not implementation authorization. Start implementation only after the discussion is complete and the owner explicitly requests implementation of the agreed scope. Do not interpret silence or a request to discuss as approval.

### Decision record

- Discussion date: 2026-10-12.
- Agreed assumptions and behavior: `GET /api/auth/session`, operation ID `getCurrentSession`. Missing, expired or revoked sessions produce HTTP 401 with the existing `AUTHENTICATION_REQUIRED` envelope. The HTTP 200 contract contains `status: pending | active` and `user: { id, email, displayName }`; there is no anonymous 200 variant.
- Agreed scope and exclusions: Public Zod session contract, Swagger UI at `/api/docs`, OpenAPI 3.0 JSON at `/api/openapi.json`, stable operation IDs and response/error documentation. Runtime always rejects session requests with 401 until F06 implements real session lookup. No fabricated authenticated runtime access, OAuth, CSRF enforcement or Angular client generation. Cookie/header names remain a F06-03 decision.
- Agreed approach and verification: Use nestjs-zod DTOs, response serialization and `cleanupOpenApiDoc`; exercise pending/active response serialization only through test fixtures. Validate OpenAPI and endpoint behavior, run relevant lint/tests/API build, and inspect Swagger UI in a browser.
- Unresolved questions: None for this bounded scope.
- Owner implementation authorization: "Ok, w takim razie zróbmy to", 2026-10-12, after agreeing to 401 instead of anonymous 200.

## Scope boundaries

Only the work listed above belongs to this task. Follow the parent backlog boundary and approved architecture; do not implement subsequent tasks, speculative libraries or deferred MVP features. Preserve existing delivered work and original design exports. Git initialization, commits, publication and deployment require their own authorization.

## Delivery and review record

- Delivered behavior: Added the Nx-generated `api-auth-feature` library and shared Zod current-session/user schemas. The runtime session endpoint always returns the existing 401 envelope and `Cache-Control: no-store`. Declared 200 responses expose only pending/active status and public identity. Swagger UI and OpenAPI 3.0 document both readiness and session operations with stable IDs, output schemas and explicit error examples. Pinned `@nestjs/swagger` 11.4.7 for NestJS 11 and the test-only OpenAPI validator `@apidevtools/swagger-parser` 13.1.0. API conventions and README are aligned.
- Checks executed and outcomes: Fresh `npm exec nx -- run-many -t lint,test -p api,shared-schemas,api-auth-feature --skipNxCache` passed (17 API tests and 11 shared-schema tests; all three lint targets). Fresh `npm exec nx -- run api:build --skipNxCache` passed, including its Prisma generation dependency. Tests validate the served OpenAPI using Swagger Parser, stable paths/operation IDs, output schemas, error examples, Swagger HTML/assets, 401 with/without a synthetic cookie, pending/active serialization, hidden internal fields and safe rejection of an invalid response. Test fixtures are absent from runtime composition.
- Browser scenarios and viewport coverage: Inspected the real API with local PostgreSQL through Chrome DevTools at desktop 1440 × 900. Readiness returned 200; Swagger UI and OpenAPI loaded; session execution through Try it out returned the exact expected 401 envelope. Keyboard Tab navigation reached the Clear button. Documentation assets loaded successfully; console/network inspection showed only the expected 401 from executing the session operation. The owner explicitly excluded mobile documentation requirements on 2026-10-12; a proposed viewport customization was withdrawn. Product frontend E2E is inapplicable: no Angular UI or authentication flow changed; API HTTP integration tests cover this developer-documentation slice.
- Known limitations / incomplete verification: Real authentication, pending/active session resolution, expiry/revocation enforcement, cookie scheme/header names and CSRF remain F06. OpenAPI export, committed artifacts, generated Angular client and drift targets remain F05. Browser checks do not establish authenticated behavior or real Google sign-in. Nx required execution outside the sandbox because of blocked subprocesses. No formatter is installed; `nx format:write` reported that limitation and made no edits.
- Owner acceptance: Granted on 2026-10-12: "akceptuje F04-02. Nie commituj jeszcze nic, zaktualizuj tylko docsy". F04-01 was already accepted; this acceptance completes F04. No commit or subsequent implementation is authorized by this instruction.
- Owner scope clarification: On 2026-10-12, "dla dokumentacji nie potrzebujemy widoku mobilnego". Keep standard Swagger UI; no mobile customization or mobile acceptance requirement for this documentation slice.
- Publication authorization: On 2026-10-12, the owner explicitly requested staging, committing, pushing and opening a PR using the yeet skill. This supersedes the earlier request to defer commits.
- Verification cleanup: Stopped the API verification processes and returned the local PostgreSQL container to its prior stopped state. No database data or volumes were deleted. After withdrawing the viewport-only change, the application code matches the previously passing test/build version; no identical rerun was needed.
- Retrospective and workflow improvements: Test Swagger against the installed Zod version before relying on generated names. `nestjs-zod` 5.5 and Zod 4.6 can collide on named root output schemas; DTO-local metadata clears the root ID while preserving shared/nested schemas and runtime validation. Dedupe NestJS in Vitest so app/library exceptions share constructor identity. Browser review caught misleading auto-generated error examples; explicit examples now describe real responses. Preserve unrelated owner edits in the task index.

Update this record and the parent backlog after delivery/review. Do not mark the parent item accepted until all of its criteria are met and the owner accepts it.
