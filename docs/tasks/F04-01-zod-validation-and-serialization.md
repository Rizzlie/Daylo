# F04-01 — Zod validation and response serialization

Parent backlog item: **F04** · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: **Completed with the owner on 2026-10-12.**
Implementation authorization: **Granted by the owner on 2026-10-12.**
Delivery status: **Closed — implemented, verified and owner-accepted on 2026-10-12.**

## Assumptions and sources

- Zod 4 public schemas are distinct from Prisma models and internal contracts. nestjs-zod provides runtime validation/serialization and Swagger integration. Authenticated session behavior belongs to F06.
- Dependencies: F03. Confirm their delivered and verified behavior before dependent work.
- Read [product requirements](../product-requirements.md), [architecture](../architecture.md) and [backlog](../backlog.md). Apply the relevant [frontend](../frontend-architecture.md), [backend](../backend-architecture.md) and [design-system](../design/design-system.md) rules.
- This is a proposed bounded task. Inspect discoverable implementation facts; resolve material product decisions with the owner during the discussion.

## Work to perform

- [x] Configure Zod 4 and `nestjs-zod` validation/serialization; introduce explicit public schemas and stable English error codes.
- [x] Document cookie/CSRF requirements and 400/401/403/404/409 semantics.

## Acceptance criteria

The work above must satisfy this task-specific observable outcome:

Invalid inputs are rejected; declared responses conform; Prisma/internal fields are not exposed.

The owner must confirm the final criteria during discussion. Applicable checks must pass, evidence and limitations must be recorded, and no blocking defect may remain. Implementation, verification and owner acceptance are tracked separately.

## Verification plan

- [x] Invalid inputs are rejected; declared responses conform; Prisma/internal fields are not exposed.

- Inspect available Nx targets and use project generators/targets where applicable; select exact commands after inspection rather than inventing flags.
- Run affected lint, meaningful tests and production builds. For API contract changes, export/validate OpenAPI, regenerate the Angular client and check drift.
- For user-facing changes, run applicable real-stack Playwright scenarios and independently inspect the running UI through an available browser tool at relevant desktop/mobile widths, including keyboard behavior and console/network errors where supported.
- Use synthetic data and keep secrets, authentication state, reports, screenshots and traces out of version control.
- Record unavailable checks as incomplete. For review/manual-only tasks, mark inapplicable automated checks with a reason; do not rerun unrelated checks solely to fill the report.

## Discussion before implementation

Discuss this task with the owner before application changes:

1. What exact public error envelope and optional-value normalization should schemas guarantee?
2. Confirm assumptions, dependencies, scope boundaries and the observable acceptance scenarios above.
3. Agree on implementation approach, affected areas, required checks and any remaining limitations; resolve material ambiguities explicitly.

Record the discussion outcome below. Agreement on documentation alone is not implementation authorization. Start implementation only after the discussion is complete and the owner explicitly requests implementation of the agreed scope. Do not interpret silence or a request to discuss as approval.

### Decision record

- Discussion date: 2026-10-12.
- Agreed assumptions and behavior: Use a public error envelope containing `statusCode`, stable English `code`, English `message` and optional validation `details`. Each validation detail contains a field `path`, issue `code` and message. Establish the generic codes `VALIDATION_ERROR`, `AUTHENTICATION_REQUIRED`, `ACCESS_FORBIDDEN`, `RESOURCE_NOT_FOUND`, `VERSION_CONFLICT`, `INTERNAL_SERVER_ERROR` and `SERVICE_UNAVAILABLE`; feature-specific codes remain owned by later features. Normalize absent or empty optional text/time values to `null` in declared responses, while required text rejects empty values. F03-01 and F03-02 are implemented and verified, so the F03 dependency is satisfied.
- Agreed scope and exclusions: Add the platform-neutral shared schema library, configure `nestjs-zod` request validation and declared-response serialization globally, provide consistent HTTP error mapping, and migrate the existing readiness response to an explicit public schema. Swagger/current-session work, OpenAPI export, generated Angular client work, authentication and feature contracts remain assigned to F04-02, F05 and F06.
- Agreed approach and verification: Generate the shared contract library with Nx, use Zod 4 schemas independently of Prisma, keep NestJS DTO integration in API code, and test the configured request and response boundaries. Verify invalid input rejection, invalid declared-response rejection, stable error envelopes and stripping of undeclared response fields; then run affected lint/tests and the API production build. Browser verification is not applicable because F04-01 has no UI. OpenAPI/client generation checks remain unavailable until their explicitly assigned tasks.
- Unresolved questions: None.
- Owner implementation authorization: Granted through “F03-02 jest już skończone, zatwierdzam zakres” on 2026-10-12 after reviewing the proposed behavior, scope, approach and checks.

## Scope boundaries

Only the work listed above belongs to this task. Follow the parent backlog boundary and approved architecture; do not implement subsequent tasks, speculative libraries or deferred MVP features. Preserve existing delivered work and original design exports. Git initialization, commits, publication and deployment require their own authorization.

## Delivery and review record

- Delivered behavior: Added the generated, platform-neutral `shared-schemas` Nx library with Zod 4 schemas for the public error envelope, validation details, readiness responses, required text and nullable optional text/time response values. Added pinned `nestjs-zod` 5.5.0 and registered strict global Zod request validation, declared-response serialization and a global error filter. Invalid requests now return stable English codes and safe field details; invalid declared responses return a generic 500 while server logs retain diagnostics; undeclared response properties are removed. The existing readiness controller now declares its public response DTO and was moved from database infrastructure to the API composition layer so infrastructure does not depend on transport contracts. Added [API conventions](../api-conventions.md) for the error envelope, status semantics and approved cookie/CSRF requirements.
- Checks executed and outcomes: Fresh Nx test and lint targets passed without cache for `shared-schemas`, `api` and `api-core-database`; 22 ordinary tests passed in total (4 schema, 10 API HTTP/readiness and 8 database unit tests), while the four existing opt-in real-database integration cases remained skipped by design. API contract tests exercised invalid input details, stripping an internal response field, hiding invalid-response diagnostics and stable 401/403/404/409/503 mappings. The fresh API production build and its Prisma-generation dependency passed. `git diff --check` passed before the final documentation update and is repeated in the final workspace check.
- Browser scenarios and viewport coverage: N/A. F04-01 changes backend HTTP contracts and documentation without rendered UI. The HTTP boundary is exercised through a real ephemeral NestJS listener in the API test target.
- Known limitations / incomplete verification: Swagger/current-session contracts are assigned to F04-02, so Swagger UI and OpenAPI JSON are not yet available. OpenAPI export, validation, Angular client generation and drift checks remain assigned to F05 and could not be run for this slice. Cookie/CSRF names and enforcement remain assigned to F06-03. No Prisma entity is used as a public response; feature-specific mappings will be verified as those endpoints are implemented.
- Owner acceptance: Accepted through the instruction `akceptuje` on 2026-10-12. This closes F04-01 only; F04 remains incomplete until F04-02 is delivered and accepted.
- Retrospective and workflow improvements: The Nx library generator added a workspace-wide inferred Vitest plugin that was unnecessary beside the existing explicit target convention; generated root changes must be reviewed and minimized. Applying the shared response schema exposed an existing boundary mismatch because the readiness controller lived in database infrastructure; moving only the HTTP adapter to the application layer preserved the strict dependency policy instead of weakening it. Production tsconfig files must explicitly exclude colocated specs when a new application test target is added.

Update this record and the parent backlog after delivery/review. Do not mark the parent item accepted until all of its criteria are met and the owner accepts it.
