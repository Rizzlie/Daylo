# F07-02 — Authentication E2E and browser fixtures

Parent backlog item: **F07** · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: **Completed on 2026-10-14.**
Implementation authorization: **Owner approved the presented scope and explicitly requested implementation with "tak zatwierdzam".**
Delivery status: Closed: implemented, locally verified and owner-accepted on 2026-10-14, with the recorded verification limits.

## Assumptions and sources

- Acceptance E2E uses the real Angular app, Daylo API and isolated PostgreSQL. Only Google is replaced. Normal runtime excludes the controlled provider; fixtures must never reset development or production data.
- Dependencies: F07-01. Confirm their delivered and verified behavior before dependent work.
- Read [product requirements](../product-requirements.md), [architecture](../architecture.md) and [backlog](../backlog.md). Apply the relevant [frontend](../frontend-architecture.md), [backend](../backend-architecture.md) and [design-system](../design/design-system.md) rules.
- This is a proposed bounded task. Inspect discoverable implementation facts; resolve material product decisions with the owner during the discussion.

## Work to perform

- [x] Add authentication E2E and reusable multi-context/controlled-clock fixtures; document browser inspection and artifact handling.

## Acceptance criteria

The work above must satisfy this task-specific observable outcome:

Owner access, outsider denial, pending restriction, sign-out, expired session and reload pass against the real stack. Exercise the agent browser workflow separately.

The owner must confirm the final criteria during discussion. Applicable checks must pass, evidence and limitations must be recorded, and no blocking defect may remain. Implementation, verification and owner acceptance are tracked separately.

## Verification plan

- [x] Owner access, outsider denial, pending restriction, sign-out, expired session and reload pass against the real stack.
- [x] Exercise the agent browser workflow separately.

- Inspect available Nx targets and use project generators/targets where applicable; select exact commands after inspection rather than inventing flags.
- Run affected lint, meaningful tests and production builds. For API contract changes, export/validate OpenAPI, regenerate the Angular client and check drift.
- For user-facing changes, run applicable real-stack Playwright scenarios and independently inspect the running UI through an available browser tool at relevant desktop/mobile widths, including keyboard behavior and console/network errors where supported.
- Use synthetic data and keep secrets, authentication state, reports, screenshots and traces out of version control.
- Record unavailable checks as incomplete. For review/manual-only tasks, mark inapplicable automated checks with a reason; do not rerun unrelated checks solely to fill the report.

## Discussion before implementation

Discuss this task with the owner before application changes:

1. Which fixture API and clock control make authentication scenarios deterministic without bypassing Daylo access checks?
2. Confirm assumptions, dependencies, scope boundaries and the observable acceptance scenarios above.
3. Agree on implementation approach, affected areas, required checks and any remaining limitations; resolve material ambiguities explicitly.

Record the discussion outcome below. Agreement on documentation alone is not implementation authorization. Start implementation only after the discussion is complete and the owner explicitly requests implementation of the agreed scope. Do not interpret silence or a request to discuss as approval.

### Decision record

- Discussion date: 2026-10-14.
- Agreed assumptions and behavior: Real-stack OAuth/admission/session checks through controlled Google, independent contexts, deterministic session deadlines and browser-only clock control as detailed below.
- Agreed scope and exclusions: Authentication E2E, reusable fixtures and documentation; no subsequent feature, publication or deployment.
- Agreed approach and verification: The scope proposal below was approved. Run relevant Nx checks and desktop/mobile E2E plus independent browser inspection.
- Unresolved questions: Inspection found no existing active-only business API endpoint. Verify pending UI restrictions and retain existing guard unit coverage; direct active-only resource API acceptance remains deferred until such endpoints exist. Do not add a synthetic product endpoint.
- Owner implementation authorization: "tak zatwierdzam", 2026-10-14, in response to the explicit scope and implementation question.

### Scope proposal — 2026-10-14

Read-only inspection confirmed F07-01's managed stack and four controlled-provider
identities are available. Existing authentication tests mostly insert session rows
and cookies directly; the environment smoke alone exercises successful owner OAuth
login. Existing checks cover reload, sign-out/CSRF, sliding and absolute expiry,
foreground revalidation, anonymous entry and damaged PKCE recovery.

Proposed bounded delivery:

- Reuse the managed real Angular/API/PostgreSQL stack. Authenticate acceptance
  actors through controlled Google navigation, preserving real OAuth/PKCE, OIDC,
  admission, persisted cookies and CSRF. Cover owner, active member, invited pending
  account and outsider denial without adding invitation-management features.
- Extract typed reusable actor/context fixtures with independent browser storage,
  owned-resource teardown and scoped database access. Verify two authenticated
  contexts remain independent, including sign-out of one session.
- Cover reload persistence, pending-route restriction and an existing active-only
  API operation, outsider rejection without a session, explicit sign-out and
  expired-session recovery. Retain meaningful existing security regression cases.
- Make expiry deterministic by changing deadlines only for the test-owned session
  in the isolated database. Use Playwright's per-page clock for browser timers where
  needed; browser clock changes do not simulate API/PostgreSQL time. No global
  backend clock or normal-runtime authentication bypass is proposed.
- Document fixture usage, independent browser inspection and sensitive artifact
  handling. Run desktop/mobile full-stack E2E, relevant lint/typecheck and existing
  build dependencies through Nx; inspect representative access/recovery scenarios
  independently through the available browser tool and record diagnostics/limits.

The implementation is expected to stay within E2E support/tests and documentation.
No new product feature, dependency, migration, production clock control, real Google
verification, hosted CI configuration, commit, PR or deployment is included. If
inspection reveals a material runtime defect requiring broader changes, discuss
that scope with the owner. The owner approved this proposal with "tak zatwierdzam";
the decision record above records authorization and the endpoint inspection limit.

## Scope boundaries

Only the work listed above belongs to this task. Follow the parent backlog boundary and approved architecture; do not implement subsequent tasks, speculative libraries or deferred MVP features. Preserve existing delivered work and original design exports. Git initialization, commits, publication and deployment require their own authorization.

## Delivery and review record

- Delivered behavior: Controlled-provider OAuth acceptance scenarios and typed actor/browser-clock fixtures implemented; see the dated evidence below.
- Checks executed and outcomes: E2E lint/typecheck passed without warnings; all 40 real-stack desktop/mobile E2E cases passed. Nx production builds and contract/client checks passed, with applicable unchanged build outputs reused from cache.
- Browser scenarios and viewport coverage: Independent browser inspection passed for invited restriction/sign-out, outsider denial, owner login/reload and expiry recovery at 1280x800 and 390x844, with dark/light appearances.
- Known limitations / incomplete verification: No active-only business API endpoint exists yet. Hosted CI/Linux, real Google, deployed HTTPS and pinned Node 24.19.0 are unverified; local Node is 24.16.0. Keyboard navigation/activation worked; complete focus-ring appearance review remains outside this auth-fixture delivery.
- Owner acceptance: "jak skończysz masz moją akceptacje, wystaw i opublikuj PR (nie jako draft, ale jako ready for review)", 2026-10-14. Final verification completed successfully; this accepts the delivered scope with the recorded limits and authorizes task-branch commit, push and ready-for-review PR publication.
- Retrospective and workflow improvements: Use browser-origin fetch for Secure loopback session checks, account for HTML quota-recovery redirects, keep deadlines and cleanup scoped to exact sessions, and compile fixture support before stack startup.

Update this record and the parent backlog after delivery/review. Do not mark the parent item accepted until all of its criteria are met and the owner accepts it.

### Implementation and verification evidence — 2026-10-14

- Added `access.spec.ts` with eight scenarios per desktop/mobile project and
  `support/authentication.fixture.ts`. The existing provider environment smoke
  now consumes the same fixture and checks isolation from an anonymous context.
  Existing direct-session expiry, PKCE and quota regression tests remain intact.
- Each actor uses its project's browser/device settings, fresh cookies and browser
  storage, real controlled-provider OAuth admission and database-backed sessions.
  Fixtures check Secure/HttpOnly/SameSite cookie properties and consumption of the
  exact OAuth transaction. Each persisted-session operation uses the exact hash
  obtained from that actor's real cookie; teardown attempts all context/session
  cleanup even if an individual cleanup fails, then closes the database pool.
- Coverage includes owner/member access; pending identity and `/today` restriction;
  outsider denial without a session cookie; reload; real-CSRF sign-out and persisted
  revocation; two sessions of the same account with independent sign-out; sliding
  expiry through reload/foreground and absolute expiry; durable error recovery;
  and preservation of another actor's session when one expires.
- `browserClock` installs/advances only page JavaScript time. Tests prove that an
  eight-day browser advance does not invalidate a backend session, then change
  only the owned database deadline and invoke normal session validation. No
  production clock injection, endpoint, schema, dependency or migration was added.
- The first complete run exposed fixture errors: Secure cookies on trustworthy
  loopback were sent by Chromium but not by APIRequestContext, and HTML quota
  rejection redirected instead of returning raw 429. Replaced the session probe
  with browser-origin fetch and bounded quota retry with `Retry-After`, including
  the existing HTML recovery redirect. An intermediate typecheck also rejected
  `AggregateError` under the E2E TS library configuration; cleanup uses settled
  promises without widening that configuration. These were test-support fixes,
  not product authentication changes. The final clean-stack rerun passed all cases.
- Independent inspection used a separate managed stack with its own PostgreSQL.
  Keyboard Tab/Enter started provider navigation; invited login led to invitations,
  direct `/today` returned to invitations, and sign-out returned to a clean login.
  Outsider denial displayed the Polish access message. Owner login survived page
  navigation/reload; updating the single inspected session deadline and revisiting
  `/today` displayed the durable expiry message. Desktop dark and mobile light
  layouts fit without horizontal overflow; local/session storage and readable
  cookies were empty. Diagnostics showed only expected session 401 responses and
  no JavaScript exception. This does not certify every focus state or component.
- The browser-inspection runner's stop-file cleanup completed successfully. The
  first failing E2E runner also recorded successful cleanup; neither left a running
  owned container. Final run `84884167f939f1734f3c5f44` recorded successful cleanup;
  Docker listed no running `daylo.e2e.run` containers after completion.
- README documents fixture use, clock limits, independent browser inspection and
  sensitive artifact handling. Generated client/public API and normal runtime are
  unchanged; frontend/backend behavior was not modified. No subsequent backlog task
  was started.
- Final commands: `npm exec nx -- run-many -t lint,typecheck -p web-e2e --output-style=static`
  passed with no warnings. `npm exec nx -- run web-e2e:e2e-fullstack --output-style=stream`
  passed 40/40 cases in 8.3 minutes with one worker. The managed target applied all
  three migrations to a fresh isolated PostgreSQL 17 database. Normal API and E2E
  API builds passed freshly in the initial run; the final run reused their unchanged
  outputs and the frontend production build from Nx cache. OpenAPI validation,
  two-generation determinism/drift and generated-client compilation passed through
  existing dependencies. No API contract changed. F07-01 infrastructure tests and
  unrelated API unit tests were not repeated because their implementation was
  unchanged. Local checks used Windows, Chromium and Node 24.16.0.

### Acceptance and publication authorization — 2026-10-14

The owner accepted completion in advance of publication with "jak skończysz masz
moją akceptacje, wystaw i opublikuj PR (nie jako draft, ale jako ready for review)".
The final full-stack run and cleanup passed, fulfilling that condition. F07-02 and
parent F07 are closed with the recorded limits. Publication is explicitly
authorized as ready for review, overriding the default draft preference. No merge,
deployment or later task is authorized. The resulting PR will be recorded here.
