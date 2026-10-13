# F06-05 — Real Google smoke verification

Parent backlog item: **F06** · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: Owner-assisted manual smoke scope discussed on 2026-10-13.
Implementation authorization: No application changes requested or performed.
Delivery status: Owner-reported real Google smoke scope accepted on 2026-10-13; independent technical inspection remains incomplete.

## Assumptions and sources

- Google backend-owned OIDC and database-backed cookie sessions are fixed architecture choices. Owner, active user, pending invitee and outsider have different access. Controlled-provider verification does not prove real Google configuration.
- Dependencies: F06-04. Confirm their delivered and verified behavior before dependent work.
- Read [product requirements](../product-requirements.md), [architecture](../architecture.md) and [backlog](../backlog.md). Apply the relevant [frontend](../frontend-architecture.md), [backend](../backend-architecture.md) and [design-system](../design/design-system.md) rules.
- This is a proposed bounded task. Inspect discoverable implementation facts; resolve material product decisions with the owner during the discussion.

## Work to perform

- [x] Perform the separate real Google sign-in smoke check with owner-configured credentials (owner-reported manual results; limitations below).

## Acceptance criteria

The work above must satisfy this task-specific observable outcome:

Record actual redirect/callback/session/sign-out outcome; controlled-provider tests cannot satisfy this task.

The owner must confirm the final criteria during discussion. Applicable checks must pass, evidence and limitations must be recorded, and no blocking defect may remain. Implementation, verification and owner acceptance are tracked separately.

## Verification plan

- [x] Record owner-reported real sign-in/session/sign-out outcomes; redirect/callback internals were not independently inspected.

- Inspect available Nx targets and use project generators/targets where applicable; select exact commands after inspection rather than inventing flags.
- Run affected lint, meaningful tests and production builds. For API contract changes, export/validate OpenAPI, regenerate the Angular client and check drift.
- For user-facing changes, run applicable real-stack Playwright scenarios and independently inspect the running UI through an available browser tool at relevant desktop/mobile widths, including keyboard behavior and console/network errors where supported.
- Use synthetic data and keep secrets, authentication state, reports, screenshots and traces out of version control.
- Record unavailable checks as incomplete. For review/manual-only tasks, mark inapplicable automated checks with a reason; do not rerun unrelated checks solely to fill the report.

## Discussion before implementation

Discuss this task with the owner before application changes:

1. Is the owner Google configuration ready, and which owner-assisted browser steps and nonsecret evidence will verify the real flow?
2. Confirm assumptions, dependencies, scope boundaries and the observable acceptance scenarios above.
3. Agree on implementation approach, affected areas, required checks and any remaining limitations; resolve material ambiguities explicitly.

Record the discussion outcome below. Agreement on documentation alone is not implementation authorization. Start implementation only after the discussion is complete and the owner explicitly requests implementation of the agreed scope. Do not interpret silence or a request to discuss as approval.

### Decision record

- Discussion date: 2026-10-13.
- Agreed assumptions and behavior: The owner confirmed Google configuration was available. Discussed real sign-in, session retention after reload, sign-out and protected-route recovery.
- Agreed scope and exclusions: Local owner-assisted real Google smoke; no application changes, commits or deployment.
- Agreed approach and verification: The owner performed sign-in and the requested reload/sign-out/back-navigation checks and reported visible outcomes in the conversation.
- Unresolved questions: Independent redirect/callback, cookie, network/console and viewport inspection remain incomplete; acceptance does not establish those checks as passed.
- Owner implementation authorization: None requested or needed for recording the manual exercise; no application implementation was performed.

## Scope boundaries

Only the work listed above belongs to this task. Follow the parent backlog boundary and approved architecture; do not implement subsequent tasks, speculative libraries or deferred MVP features. Preserve existing delivered work and original design exports. Git initialization, commits, publication and deployment require their own authorization.

## Delivery and review record

- Delivered behavior: Recorded the owner's real Google manual smoke results on 2026-10-13; no application behavior changed.
- Checks executed and outcomes: The owner reported successful sign-in with a personalized greeting, the same greeting after reload, the Google sign-in button after sign-out, and a session-expiry notice after the requested back-navigation/reload check. These visible results match the discussed scenarios. No automated checks were rerun for this documentation-only record.
- Browser scenarios and viewport coverage: Owner-operated browser; viewport and device not recorded. The agent did not independently inspect the browser.
- Known limitations / incomplete verification: Redirect/callback HTTP details, session cookies/database revocation, console/network errors and desktop/mobile coverage were not independently inspected. User-visible denial of the protected screen does not independently prove server-side revocation. Other account admission cases were outside this exercise.
- Owner acceptance: On 2026-10-13, the owner stated "tak, akceptuje, wystaw PR", accepting the recorded manual smoke scope and authorizing commit, push and PR publication. Independent technical verification limitations remain recorded.
- Retrospective and workflow improvements: Attribute manual evidence to the owner, distinguish visible behavior from internal security checks, and keep explicit acceptance separate from reported successful results.

Update this record and the parent backlog after delivery/review. Do not mark the parent item accepted until all of its criteria are met and the owner accepts it.
