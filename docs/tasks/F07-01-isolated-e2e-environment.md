# F07-01 — Isolated real-stack E2E environment

Parent backlog item: **F07** · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: **Completed on 2026-10-14.**
Implementation authorization: **Owner explicitly requested implementation with "tak" after the scope discussion.**
Delivery status: Closed: implemented, locally verified and owner-accepted on 2026-10-14.

## Assumptions and sources

- Acceptance E2E uses the real Angular app, Daylo API and isolated PostgreSQL. Only Google is replaced. Normal runtime excludes the controlled provider; fixtures must never reset development or production data.
- Dependencies: F06-04, F01-03. Confirm their delivered and verified behavior before dependent work.
- Read [product requirements](../product-requirements.md), [architecture](../architecture.md) and [backlog](../backlog.md). Apply the relevant [frontend](../frontend-architecture.md), [backend](../backend-architecture.md) and [design-system](../design/design-system.md) rules.
- This is a proposed bounded task. Inspect discoverable implementation facts; resolve material product decisions with the owner during the discussion.

## Work to perform

- [x] Build isolated real Angular/API/PostgreSQL E2E stack with controlled Google adapter, synthetic owner/invited/member/outsider fixtures, readiness and owned-service cleanup.

## Acceptance criteria

The work above must satisfy this task-specific observable outcome:

Tests cannot reset development/production DBs; independent test data/browser state; ordinary development/production cannot enable the provider adapter.

The owner must confirm the final criteria during discussion. Applicable checks must pass, evidence and limitations must be recorded, and no blocking defect may remain. Implementation, verification and owner acceptance are tracked separately.

## Verification plan

- [x] Tests cannot reset development/production DBs; independent test data/browser state; ordinary development/production cannot enable the provider adapter.

- Inspect available Nx targets and use project generators/targets where applicable; select exact commands after inspection rather than inventing flags.
- Run affected lint, meaningful tests and production builds. For API contract changes, export/validate OpenAPI, regenerate the Angular client and check drift.
- For user-facing changes, run applicable real-stack Playwright scenarios and independently inspect the running UI through an available browser tool at relevant desktop/mobile widths, including keyboard behavior and console/network errors where supported.
- Use synthetic data and keep secrets, authentication state, reports, screenshots and traces out of version control.
- Record unavailable checks as incomplete. For review/manual-only tasks, mark inapplicable automated checks with a reason; do not rerun unrelated checks solely to fill the report.

## Discussion before implementation

Discuss this task with the owner before application changes:

1. Which explicit database safety checks, isolated configuration and cleanup rules should the test stack enforce?
2. Confirm assumptions, dependencies, scope boundaries and the observable acceptance scenarios above.
3. Agree on implementation approach, affected areas, required checks and any remaining limitations; resolve material ambiguities explicitly.

Record the discussion outcome below. Agreement on documentation alone is not implementation authorization. Start implementation only after the discussion is complete and the owner explicitly requests implementation of the agreed scope. Do not interpret silence or a request to discuss as approval.

### Decision record

- Discussion date: 2026-10-14.
- Agreed assumptions and behavior: One Nx target owns PostgreSQL, migrations, API and frontend readiness and cleanup. Each run has independent configuration, data and browser state. Occupied ports fail rather than reusing unrelated services. Only run-owned resources may be removed; development/production databases are never reset.
- Agreed scope and exclusions: Reuse existing checks, add controlled Google and synthetic owner/invited/member/outsider fixtures. Keep real OAuth/PKCE, admission and sessions. Full authentication scenarios and clock/multi-context abstractions remain F07-02. No commit, publication or deployment requested.
- Agreed approach and verification: Separate test-only API bundle; ordinary API excludes provider replacement. Serve production frontend assets. Verify clean startup, partial-start failure, isolation, cleanup, real controlled-provider login and normal-runtime exclusion; run relevant Nx lint/tests/builds and browser inspection.
- Unresolved questions: None at authorization; implementation details are agent-owned within this scope.
- Owner implementation authorization: "tak", 2026-10-14, in direct response to the agreed scope and implementation request.

## Scope boundaries

Only the work listed above belongs to this task. Follow the parent backlog boundary and approved architecture; do not implement subsequent tasks, speculative libraries or deferred MVP features. Preserve existing delivered work and original design exports. Git initialization, commits, publication and deployment require their own authorization.

## Delivery and review record

- Delivered behavior: Managed isolated stack and controlled-provider login implemented; see the dated record below.
- Checks executed and outcomes: Six infrastructure tests, 24 desktop/mobile E2E cases, lint, builds, typecheck and contract/client checks passed.
- Browser scenarios and viewport coverage: Independent controlled-provider sign-in/sign-out inspection at 1280x800 and 390x844; see the dated record below.
- Known limitations / incomplete verification: Hosted CI, real Google/deployed HTTPS and exact pinned Node patch verification are not claimed.
- Owner acceptance: "ok akceptuje", 2026-10-14, accepts the delivered F07-01 scope with the recorded verification limits.
- Retrospective and workflow improvements: Resolve tool paths from package metadata, preserve actual cookie policy and scope database assertions to the current transaction.

Update this record and the parent backlog after delivery/review. Do not mark the parent item accepted until all of its criteria are met and the owner accepts it.

### Implementation and verification record — 2026-10-14

- Added `web-e2e:e2e-fullstack`, its `inspect` configuration, `environment-test` and E2E `typecheck`, plus a separate `api:e2e-build`. No dependencies or migrations were added. Normal API/runtime source and public contracts are unchanged.
- The runner creates a PostgreSQL 17 container with a random run label/name, temporary data storage, random credentials and kernel-assigned loopback ports. Docker's run-private container ID file plus exact name/label checks constrain cleanup; no external DB reset/drop operation exists. Existing listeners are not reused or stopped.
- Applies all three existing migrations through Nx, seeds synthetic owner/member/group/invitation data and exposes four controlled-provider identities. The real runtime module (including auth cleanup scheduling) runs with only the Google OAuth client endpoints replaced in the separate test entrypoint. RS256 verification, nonce/state/browser binding, encrypted PKCE, admission, CSRF and sessions remain production code.
- Production frontend assets run behind a test-owned same-origin HTTP proxy. Test API binds port zero and supplies a run-bound readiness address. Readiness and subprocess operations are bounded. Success, test failure and startup failure invoke owned-resource cleanup; the inspect stop-file path also cleaned up successfully.
- The ordinary shell-only target remains available; the former manual F06 environment variables are replaced by runner-generated `DAYLO_E2E_*` configuration. Retained direct-session checks now inject valid Secure `__Host-` cookies using a secure source URL, matching the real test-mode policy. Chromium's trustworthy loopback handling is used; this does not verify deployed HTTPS.
- `npm exec nx -- run web-e2e:environment-test --output-style=static`: six tests passed, including rejected DB destinations, rejected foreign-container cleanup, occupied-port preservation, provider PKCE/callback/replay checks, failure after DB/API startup, simultaneous-stack data isolation, ordinary API redirect to real Google despite test variables, production-bundle exclusion and refusal of the E2E entrypoint in development/production mode.
- Relevant API/E2E lint passed (ten pre-existing API warnings; no new E2E warnings). E2E typecheck passed. Normal API, separate E2E API and production frontend builds passed; source-preserving OpenAPI/client validation, two-generation determinism and client compilation passed through existing build dependencies. The existing API regression suite was not rerun because handwritten runtime behavior did not change.
- Independent browser inspection completed controlled-owner sign-in, authenticated greeting, sign-out and login recovery at 1280x800 and 390x844. Dark-mode layouts fit without horizontal overflow; local/session storage and readable cookies were empty. Diagnostics contained expected anonymous 401 responses only. Automated shell coverage checks both themes; no new theme implementation or full component review is claimed.
- Final complete desktop/mobile E2E result: all 24 cases passed in 3.2 minutes through `npm exec nx -- run web-e2e:e2e-fullstack --output-style=static`. This includes successful controlled-provider sign-in with a real persisted session, isolated anonymous browser access, retained session/expiry/CSRF checks, real quota recovery and login layout checks. The final run recorded successful cleanup; no run-owned containers remained.
- Local execution used Windows, Docker Desktop's Linux engine and Node 24.16.0; the repository pins Node 24.19.0. Hosted CI/Linux execution, real Google sign-in and deployment verification were not performed. Forced process termination or Docker failure can prevent cleanup; the run label/ID and `cleanup.json` support diagnosis. No application secrets, browser state, traces or credentials were added to version control.
- Initial verification found the changed Nx CLI package layout, legacy-cookie fixture mismatch and an overbroad OAuth-row assertion. Fixed CLI discovery through package metadata, secure host-cookie injection and transaction-specific SQL assertions; reruns were limited to these concrete corrections and lifecycle changes. Full authentication acceptance fixtures/clock control remain F07-02.
- Owner acceptance: "ok akceptuje", 2026-10-14. F07-01 is closed; recorded verification limits remain unchanged. No commit, publication, deployment or subsequent task was requested.

### Owner acceptance — 2026-10-14

The owner accepted the delivered scope with "ok akceptuje" after reviewing its
behavior and operating instructions. F07-01 is closed. F07-02 and parent F07 remain
incomplete. Acceptance does not turn hosted CI, real Google/deployed HTTPS or
exact pinned Node patch verification into passing checks. This documentation-only
record required no application changes or test reruns and authorizes no publication
or subsequent implementation.

### Publication authorization - 2026-10-14

After acceptance, the owner requested "oh smart, wystaw PR", authorizing selective
staging, a task-branch commit, push and draft PR publication of F07-01. This
supersedes the earlier publication-pending record only; merge, deployment and
F07-02 implementation remain unauthorized. Existing verification evidence remains
applicable because subsequent edits concern documentation only.

Publication: [draft PR #26](https://github.com/Rizzlie/Daylo/pull/26) contains the
accepted F07-01 scope and is registered with the task thread. Hosted CI results
are not claimed; no merge, deployment or later task was performed.
