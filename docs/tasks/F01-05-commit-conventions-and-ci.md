# F01-05 — Commit conventions and foundation CI

Parent backlog item: **F01** · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: **Completed on 2026-10-05; PR checks use Nx affected from the first implementation.**
Implementation authorization: **Owner requested the discussed scope with affected PR checks on 2026-10-05.**
Delivery status: Implemented and locally verified on 2026-10-05; GitHub-hosted execution and owner acceptance pending.

## Assumptions and sources

- The existing shells should be inspected and reused. F01 does not include authentication, database migrations or product features. Libraries are created only when necessary for shell and boundary verification.
- Dependencies: F01-03, F01-04; owner-created repository for Git-dependent verification. Confirm their delivered and verified behavior before dependent work.
- Read [product requirements](../product-requirements.md), [architecture](../architecture.md) and [backlog](../backlog.md). Apply the relevant [frontend](../frontend-architecture.md), [backend](../backend-architecture.md) and [design-system](../design/design-system.md) rules.
- This is a proposed bounded task. Inspect discoverable implementation facts; resolve material product decisions with the owner during the discussion.

## Work to perform

- [x] Add Conventional Commit configuration, commit-message hook, CI PR-title/commit-range validation, and required workspace checks.
- [x] Document chosen versions and all foundation commands.

## Acceptance criteria

The work above must satisfy this task-specific observable outcome:

Valid/invalid commit/title examples pass/fail correctly; CI includes affected lint (with the built-in Nx boundary rule), applicable unit tests, builds and shell E2E. Custom metadata validation remains excluded per F01-04. Discover target branch/history. Git initialization and publication remain owner-authorized actions.

The owner must confirm the final criteria during discussion. Applicable checks must pass, evidence and limitations must be recorded, and no blocking defect may remain. Implementation, verification and owner acceptance are tracked separately.

## Verification plan

- [x] Valid/invalid commit/title examples pass/fail correctly; CI includes affected lint (with the built-in Nx boundary rule), applicable unit tests, builds and shell E2E. Custom metadata validation remains excluded per F01-04.
- [x] Discover target branch/history.
- [x] Git was not initialized. The owner subsequently authorized commit, push and PR publication using `yeet`.

- Inspect available Nx targets and use project generators/targets where applicable; select exact commands after inspection rather than inventing flags.
- Run affected lint, meaningful tests and production builds. For API contract changes, export/validate OpenAPI, regenerate the Angular client and check drift.
- For user-facing changes, run applicable real-stack Playwright scenarios and independently inspect the running UI through an available browser tool at relevant desktop/mobile widths, including keyboard behavior and console/network errors where supported.
- Use synthetic data and keep secrets, authentication state, reports, screenshots and traces out of version control.
- Record unavailable checks as incomplete. For review/manual-only tasks, mark inapplicable automated checks with a reason; do not rerun unrelated checks solely to fill the report.

## Discussion before implementation

Discuss this task with the owner before application changes:

1. Which repository target branch and CI events apply, and how should missing history or invalid commit/title checks be reported?
2. Confirm assumptions, dependencies, scope boundaries and the observable acceptance scenarios above.
3. Agree on implementation approach, affected areas, required checks and any remaining limitations; resolve material ambiguities explicitly.

Record the discussion outcome below. Agreement on documentation alone is not implementation authorization. Start implementation only after the discussion is complete and the owner explicitly requests implementation of the agreed scope. Do not interpret silence or a request to discuss as approval.

### Decision record

- Discussion date: 2026-10-05.
- Agreed assumptions and behavior: GitHub Actions for PRs targeting main and pushes to main; Conventional Commits in English. Keep existing shells and the built-in Nx boundary rule.
- Agreed scope and exclusions: Commitlint with conventional preset, Husky commit-msg hook, PR title/commit validation and three CI jobs (conventions, quality, e2e). Document versions and commands. No custom boundary validators, Nx Cloud, runtime features, database setup, branch protection or publication.
- Agreed approach and verification: PR jobs use nx affected with event base/head SHA and full Git history; push jobs run the full relevant targets. Validate titles on PR edits and commit ranges against the actual merge base. Verify valid/invalid examples, hook execution without creating commits, affected selection, lint/unit/build and desktop/mobile smoke. Missing history fails explicitly.
- Unresolved questions: None for this scope. GitHub-hosted execution remains unverified until publication and a real workflow run.
- Owner implementation authorization: After discussing the proposed checks, the owner said `Zróbmy od razu affected dla PR` on 2026-10-05.

## Scope boundaries

Only the work listed above belongs to this task. Follow the parent backlog boundary and approved architecture; do not implement subsequent tasks, speculative libraries or deferred MVP features. Preserve existing delivered work and original design exports. Git initialization, commits, publication and deployment require their own authorization.

## Delivery and review record

- Delivered behavior: Three GitHub Actions jobs validate conventions, quality and E2E. PR checks use Nx affected with event base/head SHA and full history; main pushes run full target sets. PR title edits trigger validation, default commit-ignore bypasses are disabled for titles, and commits are checked from the actual merge base. Shared workflow/runtime inputs affect all projects. E2E selection skips Chromium installation when no E2E project is affected. Node/actions/development dependencies are pinned; npm ci activates the Husky commit-msg hook, with LF endings for Windows compatibility. Removed the root failing test placeholder. No custom boundary tooling, runtime features, existing dependency upgrades, publication or branch-protection changes.
- Checks executed and outcomes: Clean npm ci passed and activated the hook. Valid/invalid Conventional Commit and PR-title examples behaved as expected, including breaking-change syntax, invalid type/scope/terminal punctuation and merge-style title rejection. Real git hook execution accepted a valid message and rejected an invalid one without creating commits. Commit-range validation from a real merge base passed. Affected selection matched web -> web + web-e2e, API -> API, docs -> root only, and shared workflow/runtime/ESLint -> all projects. E2E filtering selected web-e2e for web changes and none for API-only changes. An empty SHA diff ran no targets; missing history failed. Fresh affected lint/test/build passed six tasks across three projects; affected E2E in CI mode passed two desktop/mobile cases. The test server stopped afterward. actionlint 1.7.12 validated the workflow (ShellCheck unavailable/disabled). Existing locked package versions were unchanged and git diff --check passed.
- Browser scenarios and viewport coverage: Independent browser inspection is inapplicable to CI/hook configuration with no UI change. Existing automated Chromium desktop/mobile smoke passed; this does not resolve F01-03 independent browser review.
- Known limitations / incomplete verification: GitHub-hosted Ubuntu execution, uploaded artifacts and event-trigger behavior require a real workflow run after publication; local Windows checks and actionlint do not establish that result. ShellCheck was not available. Hooks can be bypassed locally, and this task does not configure required status checks or branch protection. English wording and imperative phrasing remain review responsibilities. Existing shell E2E exercises only the frontend; API/PostgreSQL integration belongs to later tasks. Custom metadata validation remains excluded per F01-04.
- Owner acceptance: Pending.
- Retrospective and workflow improvements: Verify affected selection rather than assuming global workflow changes select application targets. Remove inherited failing script placeholders before using run-many. Use npm.cmd for piped commitlint commands in PowerShell to preserve CLI arguments. Nx uncommitted/untracked flags are mutually exclusive; select tracked configuration changes with uncommitted for local verification. Keep execution evidence distinct from workflow configuration.

Update this record and the parent backlog after delivery/review. Do not mark the parent item accepted until all of its criteria are met and the owner accepts it.
