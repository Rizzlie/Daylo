# M02-01 — Today retrieval and grouping

Parent backlog item: **M02** · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: **Not started — required before implementation.**
Implementation authorization: **Not granted by this document.**
Delivery status: Pending. No implementation or verification is claimed by this task file.

## Assumptions and sources

- Today uses Europe/Warsaw and the approved timed, untimed, overdue and completed-union rules. Overdue dates are never rolled over. Counters derive from visible section data.
- Dependencies: M01. Confirm their delivered and verified behavior before dependent work.
- Read [product requirements](../product-requirements.md), [architecture](../architecture.md) and [backlog](../backlog.md). Apply the relevant [frontend](../frontend-architecture.md), [backend](../backend-architecture.md) and [design-system](../design/design-system.md) rules.
- This is a proposed bounded task. Inspect discoverable implementation facts; resolve material product decisions with the owner during the discussion.

## Work to perform

- [ ] Add accessible Today retrieval and pure grouping/order rules: timed, untimed, overdue and completed union without duplicates.
- [ ] Backend clock uses `Europe/Warsaw`; counters derive from displayed data.

## Acceptance criteria

The work above must satisfy this task-specific observable outcome:

Ordering ties, original overdue dates, completed union, midnight and DST cases; inaccessible tasks excluded. Group coverage is extended in M04.

The owner must confirm the final criteria during discussion. Applicable checks must pass, evidence and limitations must be recorded, and no blocking defect may remain. Implementation, verification and owner acceptance are tracked separately.

## Verification plan

- [ ] Ordering ties, original overdue dates, completed union, midnight and DST cases; inaccessible tasks excluded.
- [ ] Group coverage is extended in M04.

- Inspect available Nx targets and use project generators/targets where applicable; select exact commands after inspection rather than inventing flags.
- Run affected lint, meaningful tests and production builds. For API contract changes, export/validate OpenAPI, regenerate the Angular client and check drift.
- For user-facing changes, run applicable real-stack Playwright scenarios and independently inspect the running UI through an available browser tool at relevant desktop/mobile widths, including keyboard behavior and console/network errors where supported.
- Use synthetic data and keep secrets, authentication state, reports, screenshots and traces out of version control.
- Record unavailable checks as incomplete. For review/manual-only tasks, mark inapplicable automated checks with a reason; do not rerun unrelated checks solely to fill the report.

## Discussion before implementation

Discuss this task with the owner before application changes:

1. Which concrete fixture cases demonstrate the approved section ordering, completed union and Warsaw day boundaries?
2. Confirm assumptions, dependencies, scope boundaries and the observable acceptance scenarios above.
3. Agree on implementation approach, affected areas, required checks and any remaining limitations; resolve material ambiguities explicitly.

Record the discussion outcome below. Agreement on documentation alone is not implementation authorization. Start implementation only after the discussion is complete and the owner explicitly requests implementation of the agreed scope. Do not interpret silence or a request to discuss as approval.

### Decision record

- Discussion date: Pending.
- Agreed assumptions and behavior: Pending.
- Agreed scope and exclusions: Pending.
- Agreed approach and verification: Pending.
- Unresolved questions: The task-specific discussion topic above; further questions may emerge from inspection.
- Owner implementation authorization: Pending; record the actual instruction and date when provided.

## Scope boundaries

Only the work listed above belongs to this task. Follow the parent backlog boundary and approved architecture; do not implement subsequent tasks, speculative libraries or deferred MVP features. Preserve existing delivered work and original design exports. Git initialization, commits, publication and deployment require their own authorization.

## Delivery and review record

- Delivered behavior: Pending.
- Checks executed and outcomes: Pending.
- Browser scenarios and viewport coverage: Pending or N/A with a reason.
- Known limitations / incomplete verification: Pending.
- Owner acceptance: Pending.
- Retrospective and workflow improvements: Pending.

Update this record and the parent backlog after delivery/review. Do not mark the parent item accepted until all of its criteria are met and the owner accepts it.
