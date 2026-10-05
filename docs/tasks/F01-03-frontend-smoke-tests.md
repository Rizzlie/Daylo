# F01-03 — Frontend shell E2E smoke coverage

Parent backlog item: **F01** · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: **Completed on 2026-10-05 for the bounded shell smoke scope.**
Implementation authorization: **Owner explicitly requested implementation of the agreed scope on 2026-10-05.**
Delivery status: Implemented; fresh Chromium desktop/mobile E2E and lint verified on 2026-10-05. Independent browser inspection incomplete; owner acceptance pending.

## Assumptions and sources

- The existing shells should be inspected and reused. F01 does not include authentication, database migrations or product features. Libraries are created only when necessary for shell and boundary verification.
- Dependencies: F01-01. Confirm their delivered and verified behavior before dependent work.
- Read [product requirements](../product-requirements.md), [architecture](../architecture.md) and [backlog](../backlog.md). Apply the relevant [frontend](../frontend-architecture.md), [backend](../backend-architecture.md) and [design-system](../design/design-system.md) rules.
- This is a proposed bounded task. Inspect discoverable implementation facts; resolve material product decisions with the owner during the discussion.

## Work to perform

- [x] Establish `web-e2e` smoke coverage for the actual initial frontend shell; replace the obsolete `Welcome` expectation.
- [x] Document the Nx test/debug/report targets and ignore generated artifacts.

## Acceptance criteria

The work above must satisfy this task-specific observable outcome:

Fresh Chromium desktop 1440 × 900 and emulated mobile 390 × 844 smoke runs open the real shell and assert the visible level-one `Daylo` heading, `Daylo` document title and Polish preparation message. Reports and traces remain outside version control. Independent browser inspection must be recorded separately from automated E2E.

The owner must confirm the final criteria during discussion. Applicable checks must pass, evidence and limitations must be recorded, and no blocking defect may remain. Implementation, verification and owner acceptance are tracked separately.

## Verification plan

- [x] Fresh Chromium desktop/mobile smoke run opens the real shell; reports and traces remain outside version control.
- [ ] Independent desktop/mobile browser inspection, including console/network checks: blocked by unavailable browser control in this session.

- Inspect available Nx targets and use project generators/targets where applicable; select exact commands after inspection rather than inventing flags.
- Run affected lint, meaningful tests and production builds. For API contract changes, export/validate OpenAPI, regenerate the Angular client and check drift.
- For user-facing changes, run applicable real-stack Playwright scenarios and independently inspect the running UI through an available browser tool at relevant desktop/mobile widths, including keyboard behavior and console/network errors where supported.
- Use synthetic data and keep secrets, authentication state, reports, screenshots and traces out of version control.
- Record unavailable checks as incomplete. For review/manual-only tasks, mark inapplicable automated checks with a reason; do not rerun unrelated checks solely to fill the report.

## Discussion before implementation

Discuss this task with the owner before application changes:

1. Which observable shell element is the stable smoke assertion, and which desktop/mobile viewports should this foundation test cover?
2. Confirm assumptions, dependencies, scope boundaries and the observable acceptance scenarios above.
3. Agree on implementation approach, affected areas, required checks and any remaining limitations; resolve material ambiguities explicitly.

Record the discussion outcome below. Agreement on documentation alone is not implementation authorization. Start implementation only after the discussion is complete and the owner explicitly requests implementation of the agreed scope. Do not interpret silence or a request to discuss as approval.

### Decision record

- Discussion date: 2026-10-05.
- Agreed assumptions and behavior: The stable smoke assertions are the visible level-one `Daylo` heading, `Daylo` document title and Polish preparation message. Cover Chromium desktop 1440 × 900 and emulated mobile 390 × 844.
- Agreed scope and exclusions: Replace the obsolete generated test, configure desktop/mobile smoke coverage, document Nx test/debug/report commands and ignore generated artifacts. Use the real frontend without mocks. The current shell makes no API/database calls; real-stack feature acceptance remains in later tasks. No application features or new dependencies.
- Agreed approach and verification: Reuse the existing Nx/Playwright project and frontend serve target; use semantic locators and retrying assertions. Run fresh E2E and affected lint, inspect the running shell independently with a browser tool, record evidence and stop owned services.
- Unresolved questions: None for this scope.
- Owner implementation authorization: On 2026-10-05 the owner confirmed the proposed scope and instructed implementation, first switching to `main` and pulling. The checkout and fast-forward pull completed at `792c6ad` before changes.

## Scope boundaries

Only the work listed above belongs to this task. Follow the parent backlog boundary and approved architecture; do not implement subsequent tasks, speculative libraries or deferred MVP features. Preserve existing delivered work and original design exports. Git initialization, commits, publication and deployment require their own authorization.

## Delivery and review record

- Delivered behavior: Replaced `src/example.spec.ts` with `src/shell.spec.ts`, using retrying title/visibility assertions and semantic heading/text locators. Configured Chromium desktop 1440 × 900 and Pixel 7 mobile emulation with viewport 390 × 844. Reused the Nx preset, existing frontend serve target and inferred readiness gate. Disabled cache on the normal E2E target; added headed/debug/UI configurations and an `e2e-report` target. Added E2E application tags for the existing boundary policy. README documents commands, browser installation, local port ownership, output paths and this frontend-only scope. Added ignore rules for report/results/blob/auth artifacts; no application UI, dependencies or API behavior changed.
- Checks executed and outcomes: Fresh `npm exec nx -- run web-e2e:lint --skipNxCache` passed. Initial E2E failed before page creation because Chromium v1243 was missing; failure traces were produced under ignored `dist`. After `npm exec playwright -- install chromium`, fresh `npm exec nx -- run web-e2e:e2e --skipNxCache` passed both projects (2 tests, 5.5 seconds, no retries). Nx started the real `web:serve`, waited for readiness and stopped its E2E-owned server. `npm exec nx -- run web-e2e:e2e-report` served the generated HTML report at loopback port 9323; HTTP 200 and HTML content verified. Resolved Nx configuration confirmed serve/readiness dependencies, cache disabled, debug commands and report path. `git check-ignore` confirmed reports, traces, direct-CLI results and nested authentication state are ignored. `git diff --check` passed. Independent review/report servers were stopped; ports 4200 and 9323 released. Production build and unit tests were not repeated because application code and dependencies did not change; real development compilation passed during E2E startup.
- Browser scenarios and viewport coverage: Automated Playwright opened the actual shell at desktop 1440 × 900 and emulated mobile 390 × 844 and verified heading/title/message. Independent browser control could not open the app: Chrome DevTools MCP reported its profile already running, and CUA reported no available in-app browser or browser providers. Chrome DevTools CLI was not installed. Visual layout, keyboard, console and network inspection remain incomplete; automated smoke does not replace those checks.
- Known limitations / incomplete verification: Headed, Inspector and UI configurations were inspected in resolved Nx metadata but not interactively exercised. The report server was checked through HTTP. No physical phone check or Firefox/WebKit coverage is claimed. API/PostgreSQL/provider fixtures remain later tasks because this shell has no backend calls. Environment color warnings were emitted by Node; application console/network checks were unavailable. Verification used expanded process permissions with Nx daemon/plugin isolation disabled. Inferred CI targets remain cacheable; fresh evidence commands must use `--skipNxCache` as documented.
- Owner acceptance: Pending. Independent browser inspection remains incomplete; F01 is not complete and subsequent work remains pending.
- Retrospective and workflow improvements: Check installed browser revisions before a first run; keep failure artifacts under ignored output. The Nx plugin did not recognize the `npm exec nx -- run` web-server command, so use its recognized package-manager-prefixed `npx nx run` form and inspect resolved readiness dependencies. Verify nested ignore patterns with `git check-ignore`. Check owned child processes after Ctrl+C; interactive Nx wrappers can exit while their servers remain alive. Keep browser availability limits explicit rather than inferring visual acceptance from smoke assertions.

Update this record and the parent backlog after delivery/review. Do not mark the parent item accepted until all of its criteria are met and the owner accepts it.
