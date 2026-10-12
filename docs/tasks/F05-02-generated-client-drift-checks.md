# F05-02 — Generated-client drift checks

Parent backlog item: **F05** · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: **Completed with the owner on 2026-10-12.**
Implementation authorization: **Granted on 2026-10-12: "Zatwierdzam ten zakres", confirming the proposed scope and implementation request.**
Delivery status: Closed — implemented, locally verified and owner-accepted on 2026-10-12. Hosted CI execution remains unverified.

## Assumptions and sources

- OpenAPI 3.0 and a pinned typescript-angular generator are the approved pipeline. Export must not require a live database. Generated files are never edited manually.
- Dependencies: F05-01. Confirm their delivered and verified behavior before dependent work.
- Read [product requirements](../product-requirements.md), [architecture](../architecture.md) and [backlog](../backlog.md). Apply the relevant [frontend](../frontend-architecture.md), [backend](../backend-architecture.md) and [design-system](../design/design-system.md) rules.
- This is a proposed bounded task. Inspect discoverable implementation facts; resolve material product decisions with the owner during the discussion.

## Work to perform

- [x] Add temporary-output drift checking and build/CI dependencies.
- [x] Keep handwritten orchestration outside generated code.

## Acceptance criteria

The work above must satisfy this task-specific observable outcome:

Two generations are identical; an intentional contract drift is detected without rewriting tracked source; current-session client compiles.

The owner must confirm the final criteria during discussion. Applicable checks must pass, evidence and limitations must be recorded, and no blocking defect may remain. Implementation, verification and owner acceptance are tracked separately.

## Verification plan

- [x] Two generations are identical; an intentional contract drift is detected without rewriting tracked source; current-session client compiles.

- Inspect available Nx targets and use project generators/targets where applicable; select exact commands after inspection rather than inventing flags.
- Run affected lint, meaningful tests and production builds. For API contract changes, export/validate OpenAPI, regenerate the Angular client and check drift.
- For user-facing changes, run applicable real-stack Playwright scenarios and independently inspect the running UI through an available browser tool at relevant desktop/mobile widths, including keyboard behavior and console/network errors where supported.
- Use synthetic data and keep secrets, authentication state, reports, screenshots and traces out of version control.
- Record unavailable checks as incomplete. For review/manual-only tasks, mark inapplicable automated checks with a reason; do not rerun unrelated checks solely to fill the report.

## Discussion before implementation

Discuss this task with the owner before application changes:

1. Which generated paths and specification files form the drift boundary, and what diagnostic should a drift failure provide?
2. Confirm assumptions, dependencies, scope boundaries and the observable acceptance scenarios above.
3. Agree on implementation approach, affected areas, required checks and any remaining limitations; resolve material ambiguities explicitly.

Record the discussion outcome below. Agreement on documentation alone is not implementation authorization. Start implementation only after the discussion is complete and the owner explicitly requests implementation of the agreed scope. Do not interpret silence or a request to discuss as approval.

### Decision record

- Discussion date: 2026-10-12.
- Agreed assumptions and behavior: Compare `docs/api/openapi.json` and the complete `libs/web/shared/api-client/src/generated` tree with temporary output. Report added, removed and changed paths and recommend `npm run api:generate`. Checks never rewrite source artifacts.
- Agreed scope and exclusions: Add drift enforcement to frontend builds and CI using the existing pinned Docker generator. No UI, authentication, additional features, commits or publication.
- Agreed approach and verification: Export and generate into temporary directories, verify identical consecutive generations, detect intentional drift, verify source preservation, compile the current-session client and run relevant lint/tests/builds. Frontend builds require Docker; hosted CI execution cannot be established locally.
- Unresolved questions: None.
- Owner implementation authorization: "Zatwierdzam ten zakres", 2026-10-12, in response to the concrete scope and implementation question.

## Scope boundaries

Only the work listed above belongs to this task. Follow the parent backlog boundary and approved architecture; do not implement subsequent tasks, speculative libraries or deferred MVP features. Preserve existing delivered work and original design exports. Git initialization, commits, publication and deployment require their own authorization.

## Delivery and review record

- Delivered behavior: Added uncached `web-shared-api-client:check`: offline export, Swagger Parser validation and pinned Docker generation run twice into isolated temporary directories. Byte comparisons enforce determinism and report added/removed/changed paths across `docs/api/openapi.json` and the entire generated client directory, including unexpected files. Diagnostics recommend `npm run api:generate`. Source preservation is checked; temporary directories are cleaned on success/failure. Generation and checking share handwritten generator orchestration outside generated code, with a read-only workspace mount and separate writable output mount. Git attributes enforce LF for artifacts on Windows and Linux. No API contract or generated TypeScript content changed.
- Build and CI integration: `web:build` depends on drift verification and generated-client Angular compilation. The uncached check runs even when other tasks use cache. CI explicitly checks drift and compiles the client before affected/full checks, including contract-only changes before a frontend consumer exists. Existing Docker and npm tooling is reused; no dependency was added.
- Checks executed and outcomes: Fresh client lint and Node test passed; the test covers changed specification/models, missing files, unexpected files, absent artifact trees and source preservation. Official `npm run api:generate` passed after LF rules were added. Fresh frontend production build passed with two identical generations, source preservation and Angular client compilation. API lint, all 20 API tests and production build passed; web lint/unit test passed. Temporarily changing the backend OpenAPI version to `0.1.0-drift-test` caused the ordinary frontend build to fail at the drift dependency, list the specification difference and suggest regeneration; SHA-256 hashes of all 20 source artifacts were preserved. The backend file was restored byte for byte in `finally`. CI YAML parsed successfully and includes the unconditional drift step. `git diff --check` passed.
- Browser scenarios and viewport coverage: N/A: no rendered UI or product behavior changed. No E2E/browser inspection is claimed; build/contract enforcement is verified through Nx targets.
- Cache and cleanup verification: After restoring the contract, the normal build passed. A subsequent build restored `web:build:production`, client typechecking and exporter build from local cache, while `check` ran both real generations again and passed. Temporary check/generator directories were empty after completion. `git diff --exit-code` confirmed no content changes to the specification/generated client or temporary backend contract edit. Logs remain in ignored `dist/f05-02-*.log`.
- Known limitations / incomplete verification: GitHub-hosted CI execution remains unverified locally. Frontend builds now require a running Docker engine with Linux containers; the pinned image's first pull needs network access. Do not run generation concurrently with checking. No commit, publication or subsequent task is authorized by acceptance.
- Owner acceptance: Granted on 2026-10-12: "wygląda ok, akceptuje". Closes F05-02 and the parent F05, whose two task scopes are now accepted. Hosted CI execution remains unverified; acceptance does not establish that check as passed.
- Publication authorization: On 2026-10-12, the owner requested "wystaw PR", authorizing publication of the accepted F05-02 changes through a dedicated task branch and draft pull request.
- Draft pull request: [#13 — build(api): enforce generated client drift checks](https://github.com/Rizzlie/Daylo/pull/13), registered with the current task thread.
- Retrospective and workflow improvements: The first strict byte comparison exposed Git's Windows CRLF checkout conversion for all generated artifacts. Explicit artifact-only LF attributes plus official regeneration resolved it without editing generated content. Keep platform line-ending policy part of deterministic generation. Verify both negative contract drift and cache behavior when introducing build gates.

Update this record and the parent backlog after delivery/review. Do not mark the parent item accepted until all of its criteria are met and the owner accepts it.
