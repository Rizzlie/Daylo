# M05-02 — Responsive shell and Daylo identity

Parent backlog item: **M05** · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: **Not started — required before implementation.**
Implementation authorization: **Not granted by this document.**
Delivery status: Pending. No implementation or verification is claimed by this task file.

## Assumptions and sources

- Use the accepted design sources, normalized tokens and supported Angular Material theming APIs. Global theme delivery is already recorded; Polish UI, accessible controls and responsive navigation remain required.
- Dependencies: F07. Confirm their delivered and verified behavior before dependent work.
- Read [product requirements](../product-requirements.md), [architecture](../architecture.md) and [backlog](../backlog.md). Apply the relevant [frontend](../frontend-architecture.md), [backend](../backend-architecture.md) and [design-system](../design/design-system.md) rules.
- This is a proposed bounded task. Inspect discoverable implementation facts; resolve material product decisions with the owner during the discussion.

## Work to perform

- [ ] Build responsive shell with approved Daylo SVG/wordmark, expanded/collapsed sidebar, bottom settings/account and mobile `Dzisiaj`, `Grupy`, `Ustawienia` navigation.
- [ ] Extract the SVG from the [original logo source](../design/daylo_logo_mark/code.html); preserve original exports.
- [ ] Compose available routes as features arrive.

## Acceptance criteria

The work above must satisfy this task-specific observable outcome:

Both themes; widths 360/390/768/1024/1440; sidebar states, keyboard labels/tooltips, 44 px targets, zoom, safe-area clearance and no overflow. Avatar uses agreed profile contract/initials fallback, never hardcoded identity.

The owner must confirm the final criteria during discussion. Applicable checks must pass, evidence and limitations must be recorded, and no blocking defect may remain. Implementation, verification and owner acceptance are tracked separately.

## Verification plan

- [ ] Both themes; widths 360/390/768/1024/1440; sidebar states, keyboard labels/tooltips, 44 px targets, zoom, safe-area clearance and no overflow.
- [ ] Avatar uses agreed profile contract/initials fallback, never hardcoded identity.

- Inspect available Nx targets and use project generators/targets where applicable; select exact commands after inspection rather than inventing flags.
- Run affected lint, meaningful tests and production builds. For API contract changes, export/validate OpenAPI, regenerate the Angular client and check drift.
- For user-facing changes, run applicable real-stack Playwright scenarios and independently inspect the running UI through an available browser tool at relevant desktop/mobile widths, including keyboard behavior and console/network errors where supported.
- Use synthetic data and keep secrets, authentication state, reports, screenshots and traces out of version control.
- Record unavailable checks as incomplete. For review/manual-only tasks, mark inapplicable automated checks with a reason; do not rerun unrelated checks solely to fill the report.

## Discussion before implementation

Discuss this task with the owner before application changes:

1. How should sidebar collapse behave across navigation/reload, and which agreed profile/avatar contract should the shell consume? Confirm the SVG logo extraction and available route behavior.
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
