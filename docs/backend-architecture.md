# Daylo — Backend Architecture and Library Boundaries

Status: Approved architecture direction, recorded 2026-10-05. F01-04 is limited by owner instruction to the built-in Nx ESLint boundary rule. Custom metadata validation and additional canonical-entrypoint checks are outside that delivery; the requirements below describe the architecture policy. This document does not authorize scaffolding.

## Modular monolith

One NestJS API composes business areas within one process and one PostgreSQL database. Areas own their use cases and persistence; shared infrastructure does not own business policies. Add new areas, such as finance, only when requested. No microservices, message broker, generic BaseRepository, or interface for every class is required.

```text
apps/api/
libs/api/
  core/
    database/
    configuration/
    transactions/contracts/
    updates/contracts/
    updates/infrastructure/
    identity/contracts/
  auth/
    feature/
    data-access/
  users/
    feature/
    data-access/
    contracts/
  groups/
    feature/
    data-access/
    domain/
    contracts/
  tasks/
    feature/
    data-access/
    domain/
libs/shared/
  schemas/
  util-date/
```

This is a responsibility map, not a list of projects to generate immediately. Start with only necessary libraries. Backend `feature` is a single library per area containing its NestJS module, controllers, and use-case services. Unlike frontend `features/name`, backend structure does not create one library per endpoint.

Example: `libs/api/tasks/feature`, project `api-tasks-feature`, public import `@daylo/api/tasks/feature`, tags `platform:api`, `scope:tasks`, `type:api-feature`.

## Responsibilities and allowed type dependencies

| Type | Responsibility | Allowed workspace target types |
| --- | --- | --- |
| app (platform:api) | Bootstrap, HTTP/global validation configuration, area-module composition and cross-area provider wiring | api-feature, api-infrastructure, api-contract, contract, util |
| api-feature | Controllers, transport mapping, use cases, resource authorization and transaction orchestration | api-data-access, api-domain, api-contract, api-infrastructure, contract, util |
| api-data-access | Area-specific Prisma queries/writes, persistence mapping, port implementations | api-domain, api-contract, api-infrastructure, util |
| api-domain | Pure business rules/models without NestJS, Prisma, HTTP, or browser dependencies | api-domain, util |
| api-contract | Narrow internal ports, injection tokens, plain input/result types | api-contract, util |
| api-infrastructure | Database lifecycle, validated configuration, transaction runner, in-process event transport | api-infrastructure, api-contract, util |
| contract (platform:shared) | Public Zod request/response schemas; transport shapes, not internal business entities | util |
| util | Pure technical helpers | util |

All matching scope/platform constraints still apply. No feature-to-feature or direct cross-area data-access imports. NestJS modules export only providers required by their public contract. Controllers remain private to their area module. Dependencies use public library entrypoints, not deep imports.

Backend domain models may differ from public DTOs and frontend models. The public schema library contains Zod only and cannot depend on NestJS, Angular, Prisma, or area internals. `nestjs-zod` integration belongs in API code. Preserve the existing OpenAPI generation and response-validation rules.

## Area ownership

- Auth owns Google provider integration, OAuth transactions, session lifecycle, admission orchestration, and session/CSRF guards. It consumes user and invitation contracts rather than duplicating their policies.
- Users owns Google-subject identity, profile and access status, and preferences. Avatar persistence/transport details must be finalized before the corresponding schema implementation.
- Groups owns groups, memberships, invitations, invitation matching/expiry, and the configured-owner restriction on creation/invitation management.
- Tasks owns task persistence, personal/group task authorization, completion/reopening, optimistic versions, Today retrieval, and task-update event publication requests.
- Database infrastructure exposes Prisma connectivity and transaction execution, not a generic business repository or cross-area query service.
- Updates infrastructure distributes invalidation events; resource policies remain in business areas. Session lifecycle must terminate expired/revoked streams. Core subscribes to contracts, not feature implementations.

## Internal collaboration contracts

Create ports only for concrete cross-area/infrastructure boundaries. Internal contracts are distinct from public Zod/OpenAPI contracts.

| Contract owner | Example port | Consumers and purpose |
| --- | --- | --- |
| groups/contracts | GroupAccess | Tasks: verify current membership; never expose all membership records |
| groups/contracts | InvitationAdmission | Auth: check a matching eligible pending invitation |
| users/contracts | UserIdentity / UserActivation | Auth resolves a verified Google identity; Groups activates access upon first accepted invitation |
| core/identity/contracts | ActorContext / SessionAccess | Features and updates receive authenticated actor/access status and validate stream/session lifecycle |
| core/transactions/contracts | TransactionRunner / TransactionContext | Features orchestrate atomic work; adapters share one transaction |
| core/updates/contracts | UpdatePublisher / UpdateSubscriber | Business features request publication; SSE consumes invalidations after access checks |

Interfaces use explicit runtime injection tokens because TypeScript interfaces do not exist at runtime. Use constructor injection. No service locator, global mutable actor, duplicate provider registration, circular `forwardRef` workaround, or indiscriminate global area module.

`apps/api` wires cross-area providers through explicit module composition/registration. For example, the Tasks module receives GroupAccess through its registration contract, with Groups' exported provider/module supplied at the application composition root. Tasks source imports the narrow groups contract, not GroupsModule or GroupsService. Registration must make providers visible in the consuming module's NestJS scope; merely importing sibling modules into AppModule does not do that. Verify provider resolution in an integration test.

Keep contracts minimal and named by capability. Do not move every domain model to shared to avoid dependency rules.

## Transactions and consistency

The use-case service owns the business transaction boundary; infrastructure executes it. Controllers do not call Prisma or manage transactions. Data-access methods explicitly participate in the provided transaction rather than opening independent nested transactions.

Pass an opaque transaction context defined by the internal transaction contract. Only infrastructure/data-access adapters translate it to Prisma's transaction client. Domain code and cross-area port signatures do not expose Prisma types. Reads/writes that must be atomic across areas use the same context and connection.

Invitation acceptance checks status, expiry, matching verified email, membership creation, first-user activation, and invitation resolution atomically. Unique constraints and conditional writes protect idempotency and concurrent acceptance. Task mutations enforce expected version and access, update completion actor/time, and increment version atomically. Group access checks participate in the mutation's transaction; concurrent membership changes must not cause an unauthorized write. Select and verify an appropriate database isolation/locking strategy during implementation rather than treating a prior guard check as sufficient.

Example task completion flow:

1. Authenticate session and enforce CSRF; validate the request through Zod.
2. Enter the task use case; load the accessible resource and verify membership/ownership and expected version.
3. Apply completion rules and perform a conditional write in the transaction.
4. Resolve the transaction successfully; only then publish an authorized invalidation event.
5. Serialize the response using the declared contract. Frontend reloads affected data after an SSE invalidation.

Rollback emits no update. No SSE publish occurs before commit. An in-process publisher is sufficient for the approved single-instance MVP; it is not durable delivery. A process failure after commit may miss an event. Foreground/reconnect reload restores state; do not promise durable/exactly-once delivery. A durable outbox is a future requirement only if delivery guarantees change.

## Tags and ESLint constraints

Every project has one platform, one scope, and one type tag. Extend the registered scopes with `auth` and `users`; preserve `groups`, `tasks`, `core`, `shared`, and `app`. Backend types use `api-*` so frontend type rules do not apply accidentally. Metadata validation checks cardinality, known values, and path consistency. No finance projects or tags are registered before that work is requested.

Merge these policies with the frontend rule at error severity:

- Platform: API depends only on API/shared; forbid Angular npm imports. Shared stays framework-neutral.
- Type: enforce the table above. Ban NestJS, Angular, and Prisma imports in api-domain/api-contract. Prisma imports are permitted only in api-data-access/api-infrastructure. Contract libraries cannot smuggle in area runtime dependencies through transitive imports.
- Scope: shared only shared; core only core/shared; each area only itself/core/shared by default. The API application composes registered backend areas/core/shared.
- Narrow exceptions: tasks may depend on groups/contracts; auth on users/contracts and groups/contracts; groups on users/contracts. Consumers never gain access to the other area's feature or persistence libraries.
- Preserve empty import allowlists, cycle detection, public-entrypoint restrictions, and the required tag check. Keep E2E/test fixture rules explicit and separate; they do not loosen production rules.

For precise exceptions, add capability tags such as `contract:group-access`, `contract:user-identity`, and `contract:user-activation` to the corresponding narrow contract projects. These are optional additional tags, not additional scopes/types. A contract project may contain more than one closely related capability, but never runtime providers.

Important: scope constraints in the frontend policy must be narrowed with `allSourceTags: ["platform:web", "scope:tasks"]` (and equivalent areas) when merging policies. A global `scope:tasks` rule would also match backend tasks and block its approved GroupAccess dependency. Backend tasks' allowed target list is `scope:tasks`, `scope:core`, `scope:shared`, `contract:group-access`; its type constraint separately ensures the exception target is `type:api-contract`. Apply the same pattern for the other approved exceptions. Matching constraints combine with AND; allowed target tags within a single list combine with OR.

This document specifies policy; F01 must produce a complete runnable ESLint configuration for created projects and exercise allowed/rejected examples. Do not claim module boundaries restrict which Prisma tables an adapter queries: that requires ownership rules, narrow interfaces, code review, and integration tests.

## Verification requirements

- Allowed: tasks feature -> own persistence/domain, groups access contract, core transaction/event contracts, shared Zod schemas.
- Rejected: tasks feature -> groups persistence/feature; domain -> Prisma/NestJS; API -> web; app -> area data-access; core -> business features; private deep imports and cycles.
- Metadata checks reject absent, duplicate, unknown, or path-inconsistent tags. Negative fixtures verify backend exceptions without letting frontend tasks import groups contracts.
- Pure domain tests cover actual business rules. API integration tests exercise validation, privacy, group access, session restrictions, concurrency, rollback, and DI wiring.
- PostgreSQL integration verifies atomic cross-area invitation acceptance, same-transaction participation, duplicate prevention, and version conflicts.
- Update tests verify publish after commit, no publish on rollback, and authorized SSE delivery. Existing real-stack frontend E2E remains mandatory for functional slices.

No library, dependency, runtime code, or migration is delivered by this document. Keep all implementation backlog statuses pending.
