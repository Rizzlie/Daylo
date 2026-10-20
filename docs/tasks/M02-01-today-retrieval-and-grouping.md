# M02-01 — Today retrieval and grouping

Parent backlog item: **M02** · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: Scope agreed on 2026-10-19.
Implementation authorization: Granted on 2026-10-19 with "zatwieedzam" in response to the concrete scope and implementation request.
Delivery status: Closed: implemented and locally verified on 2026-10-19; owner-accepted on 2026-10-20 with recorded verification limits.

## Assumptions and sources

- Today uses the configured installation timezone (default Europe/Warsaw) and the approved timed, untimed, overdue and completed-union rules. Overdue dates are never rolled over. Counters derive from visible section data.
- Dependencies: M01. Confirm their delivered and verified behavior before dependent work.
- Read [product requirements](../product-requirements.md), [architecture](../architecture.md) and [backlog](../backlog.md). Apply the relevant [frontend](../frontend-architecture.md), [backend](../backend-architecture.md) and [design-system](../design/design-system.md) rules.
- This is a proposed bounded task. Inspect discoverable implementation facts; resolve material product decisions with the owner during the discussion.

## Work to perform

- [x] Add accessible Today retrieval and pure grouping/order rules: timed, untimed, overdue and completed union without duplicates.
- [x] Backend clock uses the configured installation timezone (default `Europe/Warsaw`); counters derive from displayed data.

## Acceptance criteria

The work above must satisfy this task-specific observable outcome:

Ordering ties, original overdue dates, completed union, midnight and DST cases; inaccessible tasks excluded. Group coverage is extended in M04.

The owner must confirm the final criteria during discussion. Applicable checks must pass, evidence and limitations must be recorded, and no blocking defect may remain. Implementation, verification and owner acceptance are tracked separately.

## Verification plan

- [x] Ordering ties, original overdue dates, completed union, midnight and DST cases; inaccessible tasks excluded.
- Group coverage remains deferred to M04; personal-only filtering is verified here.

- Inspect available Nx targets and use project generators/targets where applicable; select exact commands after inspection rather than inventing flags.
- Run affected lint, meaningful tests and production builds. For API contract changes, export/validate OpenAPI, regenerate the Angular client and check drift.
- For user-facing changes, run applicable real-stack Playwright scenarios and independently inspect the running UI through an available browser tool at relevant desktop/mobile widths, including keyboard behavior and console/network errors where supported.
- Use synthetic data and keep secrets, authentication state, reports, screenshots and traces out of version control.
- Record unavailable checks as incomplete. For review/manual-only tasks, mark inapplicable automated checks with a reason; do not rerun unrelated checks solely to fill the report.

## Discussion before implementation

Discuss this task with the owner before application changes:

1. Which concrete fixture cases demonstrate the approved section ordering, completed union and configured-zone day boundaries?
2. Confirm assumptions, dependencies, scope boundaries and the observable acceptance scenarios above.
3. Agree on implementation approach, affected areas, required checks and any remaining limitations; resolve material ambiguities explicitly.

Record the discussion outcome below. Agreement on documentation alone is not implementation authorization. Start implementation only after the discussion is complete and the owner explicitly requests implementation of the agreed scope. Do not interpret silence or a request to discuss as approval.

### Decision record

- Discussion date: 2026-10-19.
- Agreed assumptions and behavior: Backend owns the reference date in DAYLO_TIME_ZONE. Unfinished tasks due today split into timed (time, creation) and untimed (creation); overdue sorts by date, time with null last, then creation. All remaining ties use ID ascending. Completed includes currently completed tasks scheduled today OR completed today, including past/future scheduled dates, once per ID, latest completion first. Original overdue dates are preserved; counts derive from the resulting sections.
- Agreed scope and exclusions: Personal tasks only, complete feed without the existing 50/100-item pagination limits. Group tasks remain M04. Existing list/editor UI stays unchanged until M02-02; automatic midnight/foreground refresh remains M02-03.
- Agreed approach and verification: Separate Today API with explicit Zod/OpenAPI contracts and generated Angular transport, handwritten data-access and framework-independent web task domain grouping. Test sorting/ties, more than 100 records, union/deduplication, complete/reopen, privacy, midnight, both Warsaw DST transitions and another installation timezone. Run relevant Nx lint/tests/builds and generated-client drift checks. No UI change is planned, so visual layout review is not applicable to this slice.
- Unresolved questions: None at authorization.
- Owner implementation authorization: "zatwieedzam", 2026-10-19, approving the proposed scope and explicitly requested implementation.

## Scope boundaries

Only the work listed above belongs to this task. Follow the parent backlog boundary and approved architecture; do not implement subsequent tasks, speculative libraries or deferred MVP features. Preserve existing delivered work and original design exports. Git initialization, commits, publication and deployment require their own authorization.

## Delivery and review record

- Delivered behavior: `GET /api/tasks/today` returns the complete private personal feed with backend reference date and installation timezone. A single parameterized PostgreSQL selection enforces ownership/personal visibility across all branches and independently resolves both local midnights for completed-day selection. Explicit mapping and Zod response serialization preserve the API boundary. Generated Angular transport feeds handwritten `TodayTasks`; pure `web-tasks-domain` grouping provides sections, stable sorting, deduplication and derived counts. The read resource exposes initial loading/error, preserves the displayed dated snapshot on refresh failure, retries and supersedes an outstanding read. Existing UI/list API is unchanged.
- Checks executed and outcomes:
  - `npm exec nx run api:test` with opt-in integration flags and an isolated migrated `daylo_f06_m02_01` database: **261 passed**, including all **35 personal-task/Today PostgreSQL HTTP cases**. Today coverage includes 130 selected records, time/date mapping, the completed union, personal/group isolation, active access, lifecycle, midnight, Warsaw's 23/25-hour DST days and Pacific/Kiritimati completion boundaries.
  - Nx tests for `api-tasks-feature`, `shared-schemas`, `web-tasks-domain`, `web-tasks-data-access`, `web-tasks-feature-today` and `web`: **84 passed** (8 + 29 + 12 + 8 + 10 + 17). Total API/library/component/router checks: **345 passed**.
  - Nx lint passed for `api`, `api-tasks-feature`, `api-tasks-data-access`, `shared-schemas`, `web-tasks-domain`, `web-tasks-data-access` and `web-e2e`. API retains ten pre-existing non-null assertion warnings; no new lint warnings remain.
  - `web-shared-api-client:generate` exported and validated OpenAPI and generated transport through the official generator. The E2E prerequisites passed API production/E2E builds, frontend production build, client and E2E typechecks and source-preserving client drift verification (two identical temporary generations).
  - `npm exec nx run web-e2e:e2e-fullstack -- --grep='Today feed follows'`: **2 passed**, desktop 1440x900 and mobile 390x844. Both run the real application/API/PostgreSQL with only Google replaced. They cover three separately authenticated browser contexts, anonymous/pending denial, another user's privacy, overdue date retention, completion/reopening, exactly-once inclusion and reload persistence.
- Browser scenarios and viewport coverage: Independent collaborative-browser inspection loaded real Swagger UI at 1280x800 and confirmed the Today operation and summary. No feature-screen layout changed, so a new layout/focus review is N/A. An additional independent fetch was attempted after the managed E2E stack had completed cleanup and failed with `TypeError: Failed to fetch`; it is not counted as endpoint verification. Authenticated endpoint coverage comes from the successful Playwright scenarios above.
- Known limitations / incomplete verification: Hosted CI/Linux, the exact pinned Node patch, deployed HTTPS and real Google sign-in were not exercised. Local runtime is Windows/Node 24.16.0. Existing component regression tests print one CDK focus warning. Group retrieval remains M04, the full screen M02-02, and automatic midnight/foreground refresh M02-03. Existing rate limits remain active. No migration/dependency was added. Managed E2E cleanup completed; the separate owned integration container/database was removed after verification.
- Owner acceptance: Granted with "akceptuje" on 2026-10-20 for the delivered M02-01 scope with the recorded verification limits. Parent M02 remains incomplete; M02-02 and M02-03 stay pending. This documentation-only acceptance update does not authorize commits, publication, deployment or subsequent implementation; no checks were rerun.
- Publication authorization: On 2026-10-20 the owner requested "wystaw gotowa pr", authorizing a task-branch commit, push and a ready-for-review PR for the accepted M02-01 changes. Existing local `nx.json` work is excluded. Merge, deployment and subsequent implementation remain outside this authorization.
- Retrospective and workflow improvements: The empty strict query DTO was unsupported by the OpenAPI cleanup path; removing the unnecessary query DTO restored export, and caller-supplied date/user/limit cannot override server selection. Controlled future clocks initially expired real test sessions; the fixture now adjusts and restores only its owned session timestamps while retaining production access checks. The resource-retention test now observes its initial successful snapshot before refreshing, matching normal signal consumption. Nx's library generator attempted unrelated global Vitest/ESLint initialization; those changes were removed while retaining the owner's existing `nx.json` SCSS preference. Keep browser checks ahead of managed-stack cleanup.

Update this record and the parent backlog after delivery/review. Do not mark the parent item accepted until all of its criteria are met and the owner accepts it.
