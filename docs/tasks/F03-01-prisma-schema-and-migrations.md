# F03-01 — Prisma schema and migrations

Parent backlog item: **F03** · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: **Completed with the owner on 2026-10-11.**
Implementation authorization: **Granted by the owner on 2026-10-11.**
Delivery status: **Closed — implemented, verified and owner-accepted on 2026-10-12.**

## Assumptions and sources

- Prisma owns PostgreSQL persistence and versioned migrations. UUIDs and UTC audit timestamps are required; task date/time values follow the agreed Warsaw wall-clock semantics. Internal transaction contracts must not expose Prisma.
- Dependencies: F02. Confirm their delivered and verified behavior before dependent work.
- Read [product requirements](../product-requirements.md), [architecture](../architecture.md) and [backlog](../backlog.md). Apply the relevant [frontend](../frontend-architecture.md), [backend](../backend-architecture.md) and [design-system](../design/design-system.md) rules.
- This is a proposed bounded task. Inspect discoverable implementation facts; resolve material product decisions with the owner during the discussion.

## Work to perform

- [x] Add Prisma schema/migrations/client targets for the agreed User, Preferences, Session, OAuthTransaction, Group, Membership, Invitation and Task entities, UUIDs, date/time fields and constraints.
- [x] Resolve avatar persistence/transport with the owner before adding avatar fields.

## Acceptance criteria

The work above must satisfy this task-specific observable outcome:

Apply migrations to an empty isolated DB; identity, token and membership uniqueness and required relations hold.

The owner must confirm the final criteria during discussion. Applicable checks must pass, evidence and limitations must be recorded, and no blocking defect may remain. Implementation, verification and owner acceptance are tracked separately.

## Verification plan

- [x] Apply migrations to an empty isolated DB; identity, token and membership uniqueness and required relations hold.

- Inspect available Nx targets and use project generators/targets where applicable; select exact commands after inspection rather than inventing flags.
- Run affected lint, meaningful tests and production builds. For API contract changes, export/validate OpenAPI, regenerate the Angular client and check drift.
- For user-facing changes, run applicable real-stack Playwright scenarios and independently inspect the running UI through an available browser tool at relevant desktop/mobile widths, including keyboard behavior and console/network errors where supported.
- Use synthetic data and keep secrets, authentication state, reports, screenshots and traces out of version control.
- Record unavailable checks as incomplete. For review/manual-only tasks, mark inapplicable automated checks with a reason; do not rerun unrelated checks solely to fill the report.

## Discussion before implementation

Discuss this task with the owner before application changes:

1. Should the Google avatar be persisted or omitted, and what exact profile transport contract is required? Confirm nullable fields and deletion behavior before writing migrations.
2. Confirm assumptions, dependencies, scope boundaries and the observable acceptance scenarios above.
3. Agree on implementation approach, affected areas, required checks and any remaining limitations; resolve material ambiguities explicitly.

Record the discussion outcome below. Agreement on documentation alone is not implementation authorization. Start implementation only after the discussion is complete and the owner explicitly requests implementation of the agreed scope. Do not interpret silence or a request to discuss as approval.

### Decision record

- Discussion date: 2026-10-11.
- Agreed assumptions and behavior: Omit Google avatar persistence and transport in the MVP; later profile contracts expose `id`, `email`, `displayName` and `accessStatus`, while the UI may render initials. Require Google subject, email, display name, group name, task title and scheduled date. Keep task description/time/group/completion fields and invitation resolution time nullable. Use UUID identifiers, native PostgreSQL `date`/`time` values and UTC `timestamptz` instants. Enforce unique user identity/email, session and OAuth state hashes, and group/user membership. Business relations restrict deletion; owned preferences and sessions may cascade with their user. User and group deletion remain outside the MVP.
- Agreed scope and exclusions: F03-01 adds the Prisma schema, initial versioned migration, Prisma client generation and Nx-owned Prisma targets for the eight agreed entities. F03-02 transaction lifecycle/runner, business repositories, API contracts, OpenAPI/client generation, application endpoints and UI remain excluded.
- Agreed approach and verification: Keep persistence artifacts with the existing `api-core-database` infrastructure project, use official Prisma tooling through Nx targets, and commit the deterministic schema and migration. Apply the migration to an empty isolated PostgreSQL database, generate the client, exercise required relations and uniqueness with synthetic data, then run affected lint/tests and the API production build.
- Unresolved questions: None.
- Owner implementation authorization: Granted through the instruction “tak” on 2026-10-11 after reviewing the proposed persistence behavior, scope, approach and acceptance checks.

## Scope boundaries

Only the work listed above belongs to this task. Follow the parent backlog boundary and approved architecture; do not implement subsequent tasks, speculative libraries or deferred MVP features. Preserve existing delivered work and original design exports. Git initialization, commits, publication and deployment require their own authorization.

## Delivery and review record

- Delivered behavior: Added pinned Prisma 7.10 CLI/client and PostgreSQL adapter dependencies; a Prisma 7 configuration; the eight agreed models with UUID identifiers, native PostgreSQL date/time types, UTC timestamps, indexes, foreign keys and explicit deletion rules; and the initial versioned migration. Database checks enforce normalized emails, coherent invitation resolution, coherent task completion and positive task versions. Added Nx targets for reproducible client generation, migration deployment and schema verification. The generated Prisma client remains reproducible ignored output. Google avatar storage and transport are omitted as agreed.
- Checks executed and outcomes: Prisma format and schema validation passed. Fresh `api-core-database:prisma-generate` produced Prisma Client 7.10.0. The initial migration applied successfully to a newly created isolated `daylo_f03_01_verify` PostgreSQL database. `api-core-database:prisma-verify` passed with synthetic, rolled-back records and confirmed all eight tables, all ten required foreign keys and deletion rules, unique Google subject/email, session token/CSRF hashes, OAuth state/nonce and group membership, normalized email and task completion checks. Prisma migrate diff reported no schema/database drift. Fresh Nx checks without cache passed for five database-library tests, database/API lint and the API production build; final database-library lint also passed after the verification script was extended. `git diff --check` passed.
- Browser scenarios and viewport coverage: N/A. F03-01 changes persistence tooling and database structure without rendered UI or an HTTP contract.
- Known limitations / incomplete verification: Prisma database lifecycle, a runtime client provider, opaque transaction participation and invitation transaction behavior remain F03-02. Business repositories, API schemas/endpoints, OpenAPI generation and frontend client/UI remain later tasks. The isolated verification database was removed and the PostgreSQL container returned to its prior stopped state. Nx formatting reported that no workspace formatter is configured; Prisma's own formatter handled the schema, and lint/diff checks passed.
- Owner acceptance: Granted on 2026-10-12 through the owner's blanket acceptance of previously implemented tasks: "zrobiliśmy je, ale nie zaakceptowałem po implementacji, akceptuje je oczywiscie". Acceptance covers the delivered scope; recorded verification limitations remain unchanged. No fresh verification, commit or subsequent implementation is claimed or authorized.
- Retrospective and workflow improvements: Prisma 7 loads `prisma.config.ts` even for formatting/help, so non-connection commands require an explicit synthetic `DATABASE_URL` when no local `.env` exists. Treat sandboxed Nx `spawn EPERM` output as failure even if the wrapper reports exit code zero, then rerun the affected target with approved expanded permissions. Verify hand-authored database checks and relation deletion rules against an empty real database rather than relying only on Prisma schema validation.

Update this record and the parent backlog after delivery/review. Do not mark the parent item accepted until all of its criteria are met and the owner accepts it.
