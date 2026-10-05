# F01-01 — Angular shell review and completion

Parent backlog item: **F01** · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: **Completed on 2026-10-05; owner agreed to the reviewed completion scope.**
Implementation authorization: **Granted on 2026-10-05: `Tak, zróbmy to`.**
Delivery status: Agreed F01-01 scope implemented, checked and accepted by the owner on 2026-10-05. F01-01 is closed for that scope; automated shell smoke coverage (F01-03) and full F01 completion remain pending.

## Assumptions and sources

- The existing shells should be inspected and reused. F01 does not include authentication, database migrations or product features. Libraries are created only when necessary for shell and boundary verification.
- Dependencies: None. Confirm their delivered and verified behavior before dependent work.
- Read [product requirements](../product-requirements.md), [architecture](../architecture.md) and [backlog](../backlog.md). Apply the relevant [frontend](../frontend-architecture.md), [backend](../backend-architecture.md) and [design-system](../design/design-system.md) rules.
- This is a proposed bounded task. Inspect discoverable implementation facts; resolve material product decisions with the owner during the discussion.

## Work to perform

- [x] Review and complete the Angular shell: compatible pinned Nx/Angular/Material versions, required tags, documented serve/lint/build targets, no sample product features.

## Acceptance criteria

The work above must satisfy this task-specific observable outcome:

The root page displays a semantic main region, one `Daylo` heading and a short Polish preparation message, using the existing Daylo theme. The document title is `Daylo` and document language is `pl`. Following the owner's 2026-10-05 correction, retain the Material Symbols Outlined stylesheet and Google Fonts preconnect links for planned icon use. Direct frontend framework/tool dependencies are pinned to their existing locked versions without upgrades. README documents prerequisites, versions and web serve/lint/test/build commands. Existing required project tags remain present. Relevant Nx checks and desktop/mobile browser inspection pass; automated smoke coverage remains a separately pending F01-03 task.

The owner must confirm the final criteria during discussion. Applicable checks must pass, evidence and limitations must be recorded, and no blocking defect may remain. Implementation, verification and owner acceptance are tracked separately.

## Verification plan

- [x] Existing web shell and theme are documented; F01-01 scope accepted on 2026-10-05. Full F01 compliance review remains pending.
- [x] Start the shell and verify its targets/version record.

- Inspect available Nx targets and use project generators/targets where applicable; select exact commands after inspection rather than inventing flags.
- Run affected lint, meaningful tests and production builds. For API contract changes, export/validate OpenAPI, regenerate the Angular client and check drift.
- For user-facing changes, run applicable real-stack Playwright scenarios and independently inspect the running UI through an available browser tool at relevant desktop/mobile widths, including keyboard behavior and console/network errors where supported.
- Use synthetic data and keep secrets, authentication state, reports, screenshots and traces out of version control.
- Record unavailable checks as incomplete. For review/manual-only tasks, mark inapplicable automated checks with a reason; do not rerun unrelated checks solely to fill the report.

## Discussion before implementation

Discuss this task with the owner before application changes:

1. Which gaps remain in the existing shell after inspecting it, and what minimum shell content should the smoke test observe?
2. Confirm assumptions, dependencies, scope boundaries and the observable acceptance scenarios above.
3. Agree on implementation approach, affected areas, required checks and any remaining limitations; resolve material ambiguities explicitly.

Record the discussion outcome below. Agreement on documentation alone is not implementation authorization. Start implementation only after the discussion is complete and the owner explicitly requests implementation of the agreed scope. Do not interpret silence or a request to discuss as approval.

### Decision record

- Discussion date: 2026-10-05, following the recorded existing-shell review.
- Agreed assumptions and behavior: Retain the standalone shell and existing theme; show a minimal Daylo heading and Polish preparation message. Use that heading as the later F01-03 smoke-test anchor.
- Agreed scope and exclusions: Page markup/styles and metadata, removal of unused external icon-font links, frontend documentation and exact frontend dependency pins. No task data, product navigation, authentication, new libraries or backend changes. F01-03 E2E, F01-04 boundaries and F01-05 CI remain pending.
- Agreed approach and verification: Edit the existing shell directly; preserve locked package resolutions and pin frontend dependencies to those versions. Run Nx lint/test/production build and inspect desktop/mobile in the browser, including console/network checks. No API contracts are changed. Automated acceptance smoke verification remains incomplete until F01-03 is requested.
- Unresolved questions: None for the authorized completion scope; owner acceptance recorded below.
- Owner implementation authorization: `Tak, zróbmy to`, 2026-10-05, in response to the proposed minimal screen, metadata, documentation and exact-version scope.
- Subsequent owner correction: `zostaw te czcionki, będę używał ikon`, 2026-10-05. Restore Material Symbols Outlined and its preconnect links; this supersedes the earlier removal decision. Plus Jakarta Sans remains local.

## Scope boundaries

Only the work listed above belongs to this task. Follow the parent backlog boundary and approved architecture; do not implement subsequent tasks, speculative libraries or deferred MVP features. Preserve existing delivered work and original design exports. Git initialization, commits, publication and deployment require their own authorization.

## Delivery and review record

### Existing-shell review — 2026-10-05

Owner instruction: `ok sprawdźmy`, following the proposal to inspect F01-01 and present findings for discussion. This authorizes review, not application changes. No application files were changed; implementation authorization and owner acceptance remain pending.

Observed configuration:

- Resolved `nx show project web --json` reports `apps/web`, tags `platform:web`, `scope:app`, `type:app`, and `lint`, `build`, `test`, `serve`, `serve-static` targets. Production is the default build configuration; development is the default serve configuration.
- Installed baseline: Node 24.19.0, npm 11.17.0, Nx and `@nx/angular` 23.2.1, Angular core/compiler/compiler-cli 22.1.8, Angular build 22.1.9, Material/CDK 22.2.1, TypeScript 6.0.3, Analog test integration 2.6.4, Vite 8.3.2 and Vitest 4.1.11. Inspected package peer/engine declarations accept the relevant installed combinations; `npm ls` for the selected top-level packages reported no errors. This is not a complete transitive-dependency audit.
- `package-lock.json` version 3 records exact resolutions, but several direct tool/framework dependencies in `package.json` use `^` or `~`. Agree on exact direct version pins before completing the task's pinned-version criterion; no upgrade is required by this review.
- The app bootstraps a standalone component containing only `router-outlet`; routes are empty. There is no visible text, sample product data or feature implementation. Document metadata still uses title `web` and language `en`.
- Global Daylo themes use public Material Sass APIs and locally bundled Plus Jakarta Sans. The document additionally requests an external Material Symbols stylesheet despite rendering no icons.
- README documents API commands but lacks corresponding web commands and a consolidated frontend version/prerequisite record. Serve has no API proxy configured; record that gap for the agreed runtime/integration scope before API-consuming features.
- The existing E2E sample expects an absent `Welcome` heading. It was inspected, not executed, and provides no acceptance evidence. Replace it under F01-03 after agreeing on an observable shell. The unit test checks component creation only.

Checks and browser evidence:

- `NX_DAEMON=false`, `NX_ISOLATE_PLUGINS=false`, `npm exec nx -- run-many -t lint build test -p web --skipNxCache`: all three targets passed. The first restricted execution failed with process-spawn `EPERM`; the approved expanded-permission run passed without application changes.
- `web:serve` encountered occupied port 4200. The review-owned `npm exec nx -- run web:serve --port=4300` started successfully. The existing service on 4200 was left untouched.
- Chrome DevTools inspection at 1440 × 900 with light system appearance confirmed Angular 22.1.8 bootstrap, an empty outlet, canvas `rgb(255, 248, 244)`, loaded local font and no horizontal overflow. All 14 listed requests returned HTTP 200; there were no console errors or warnings.
- Mobile viewport emulation at 390 × 844 with dark system appearance confirmed canvas `rgb(24, 24, 27)`, empty content and no horizontal overflow. No console errors/warnings appeared during inspection. There are no controls, navigation or feature layouts to exercise; Material overlays, keyboard interactions and feature responsiveness remain unverified.
- Browser inspection is exploratory evidence, not a passing automated E2E smoke test. F01-03, F01-04 boundary verification and F01-05 CI are separate pending tasks.

Completion scope proposed during review and subsequently authorized on 2026-10-05:

1. Retain the existing shell/theme and add a semantic minimal landing surface with the Daylo heading and short Polish preparation message, without product navigation, task fixtures or authentication controls.
2. Set the page title to `Daylo` and document language to `pl`; remove the currently unused external icon-font request if icons remain absent.
3. Record frontend prerequisites, installed versions and Nx serve/lint/test/build commands in README; agree on exact pins for the directly used frontend tooling/framework dependencies.
4. Verify the approved changes with relevant Nx checks and independent desktop/mobile browser inspection. Agree on the visible heading as the later F01-03 smoke-test anchor.

Owner decision: the subsequent instruction `Tak, zróbmy to` approved and authorized this bounded scope. Final behavior acceptance remains pending.

Review retrospective: inspect resolved Nx configuration and installed peer declarations before proposing upgrades. Use device viewport emulation for mobile checks: resizing the desktop window to 390 px was clamped to 500 px, so the actual 390 px check used emulation. Existing passing lint/build cannot prove a useful visible shell or valid E2E coverage.

### Authorized completion delivery — 2026-10-05

- Delivered behavior: Root page has one semantic main region, the `Daylo` heading and `Twój planer zadań jest w przygotowaniu.` message in a responsive surface using existing Daylo theme tokens. Document title is `Daylo`, language is `pl`; unused Google icon-font/preconnect links were removed. README records prerequisites, versions and Nx commands. Direct frontend framework/test/lint dependencies were pinned to their existing locked versions, synchronizing only root manifest specifications in the lockfile; no package upgrade or new dependency was introduced.
- Checks executed and outcomes: `npm exec nx -- run-many -t lint build test -p web --skipNxCache`, with daemon/plugin isolation disabled, passed all three targets in expanded-permission execution. A read-only manifest/lock check passed: root dependency metadata matches and all 47 exact direct pins resolve to the recorded versions. This check does not replace a clean `npm ci`, which was not run. Existing web tags and target definitions were retained. API/OpenAPI/generated-client checks are inapplicable because no contracts or backend files changed.
- Browser scenarios and viewport coverage: Review-owned Nx serve at port 4300 started and was stopped afterward. Chrome DevTools inspected 1440 × 900 desktop and emulated 390 × 844 mobile, each with light and dark system appearance. All four checks confirmed one main region, one Daylo heading, the Polish message, title/language, correct theme surfaces and no horizontal overflow. Screenshots of desktop/light and mobile/dark were visually reviewed. No console errors/warnings or failed network requests occurred; all listed responses were 200/304 and resource inspection found no external URLs. No interactive controls exist, so control keyboard/focus checks are inapplicable.
- Known limitations / incomplete verification: Automated shell smoke E2E is pending F01-03; the existing `Welcome` sample was not changed or executed. Real API/database E2E, product navigation, Material controls/overlays, theme preference persistence and a physical-phone check remain outside this delivery. This does not complete F01 or authorize a subsequent task.
- Owner acceptance: Granted on 2026-10-05: `Akceptuje aktualny zakres`. This closes the agreed F01-01 scope, including restored Material Symbols. Automated smoke coverage remains in F01-03; acceptance does not complete F01 or authorize another task.
- Retrospective and workflow improvements: Reuse existing locked resolutions to avoid unnecessary dependency churn. Distinguish a successful build/component-creation test from visible-page acceptance; record browser evidence and the pending E2E task separately. Restricted process startup remained unreliable, so required checks used approved expanded permissions.

Update this record and the parent backlog after delivery/review. Do not mark the parent item accepted until all of its criteria are met and the owner accepts it.

### Material Symbols restoration — 2026-10-05

Restored the original Material Symbols Outlined Google Fonts stylesheet and preconnect links at the owner's explicit request for planned icon use. README and current acceptance criteria reflect that decision. The earlier delivery's no-external-resource observation applies only to the version checked before this restoration. No visible icons or other product features were added.

Verification: Nx development serve compiled successfully. Chrome DevTools network inspection confirmed the restored Google Fonts stylesheet returned HTTP 200; console inspection found no errors or warnings. The review-owned server and browser tab were stopped afterward. Broad lint/unit/production checks were not repeated for this link-only restoration; rendered-icon verification belongs to the future icon-using UI slice.

### Publication record — 2026-10-05

- Owner authorization: explicitly invoked `yeet` to commit F01-01 changes using Conventional Commits, push a task branch and create a draft PR with English descriptions.
- Branch: `f01-01-angular-shell-completion`, targeting `main`.
- Implementation commit: `db0ab99` — `feat(web): complete the initial Daylo shell`.
- Draft pull request: [#1 — feat(web): complete the initial Daylo shell](https://github.com/Rizzlie/Daylo/pull/1).
- Scope: nine reviewed F01-01 files only; F01-02 was not modified. Existing verification evidence was reused without routine duplicate runs.
