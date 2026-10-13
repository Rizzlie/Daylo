# F06-07 — Global API rate limiting

Parent backlog item: F06 · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: Complete for the local single-instance scope on 2026-10-13.
Implementation authorization: Granted on 2026-10-13 for the agreed scope. Delivery status: Closed: implemented, locally verified and owner-accepted on 2026-10-13.

## Assumptions and sources

- The owner requested a separate backlog task for global API protection, then
  explicitly requested removal of the auth-only throttler while this task remains
  pending. AUTH-03 in the [auth audit](../security/auth-audit-2026-10-13.md) remains open.
- Use the supported NestJS `@nestjs/throttler` module/guard from the
  [official guidance](https://docs.nestjs.com/security/rate-limiting), with existing
  Nx boundaries, Zod contracts and backend-owned sessions.
- Depends on the F06 authentication implementation. Review current API composition,
  runtime deployment/proxy assumptions, architecture and contracts before implementation.

## Scope

- Configure a baseline limit centrally for the API, covering authenticated and
  public controller routes by default, including authentication routes.
- Retain stricter route-specific policies for OAuth and other expensive operations
  through supported overrides, rather than independent auth-owned infrastructure.
- Apply baseline rejection before session/database/provider work where feasible;
  prevent repeated unauthorized traffic from exhausting persistence.
- Define trustworthy client tracking and bounded storage. Never trust arbitrary
  forwarding headers, raw cookies or caller-supplied identity as a trusted tracker.
- Choose in-memory versus shared counters according to the agreed deployment
  model; describe restart and multi-instance behavior. Configure trusted proxy
  hops explicitly and consider edge/global budgets for distributed abuse.
- Define narrow monitoring/preflight exceptions and an explicit policy for Swagger,
  OpenAPI and middleware endpoints; a Nest guard alone does not cover middleware.
- Return consistent 429 errors and Retry-After; specify browser-navigation recovery,
  no-store behavior and safe/redacted diagnostics. Update OpenAPI and regenerate
  the Angular client through existing targets.

The initial planning request did not authorize implementation. The later explicit
authorization recorded below covers the agreed local implementation and its
required throttler dependency. Redis, deployment, commits and unrelated dependency
upgrades remain outside scope. Resource authorization remains mandatory and
must not be replaced by rate limiting.

## Acceptance criteria

- A newly added controller route is protected by default without adding its own
  rate-limit guard. Public and authenticated API routes are demonstrably covered.
- OAuth and expensive-route overrides are enforced while normal entry, session
  refresh, CSRF, sign-out and expected application traffic remain usable.
- Over-limit requests produce 429 with Retry-After and the agreed safe contract;
  rejected requests do not enter protected session/database/provider operations.
- Forged forwarding headers cannot bypass counters. Client isolation, concurrent
  requests, quota recovery and storage bounds match the agreed policy.
- Exceptions and middleware coverage are explicit and tested. Multiple instances
  cannot silently multiply a deployment-wide quota when shared protection is required.

## Verification

- Meaningful real HTTP tests for ordinary/public/authenticated routes, stricter
  overrides, automatic protection of a new fixture route, rejection before costly
  work, forwarded-header spoofing, recovery and parallel requests.
- Verify counter sharing/atomicity for the chosen deployment/storage model, using
  isolated synthetic infrastructure where needed rather than the owner's database.
- Appropriate Nx lint/tests/builds, OpenAPI validation, official generation and
  client drift checks. Browser/E2E scenarios exercise actual auth recovery and
  ordinary navigation under limits, including desktop/mobile where UI changes.
- No destructive production load tests. Record deployment, real-provider or
  browser checks that are unavailable as incomplete.

## Discussion topics

The local budgets, tracker/storage policy, full API/middleware coverage and browser
recovery were agreed before implementation. Future hosting, proxy trust and
multiple instances require a separate deployment discussion.

## Decision record

### Discussion started — 2026-10-13

The owner requested starting the scope discussion. This authorizes planning only;
application implementation remains unauthorized.

Inspection confirms that the approved MVP runs locally with one backend instance.
The current bootstrap has no explicit trusted-proxy configuration; authentication
is enforced by a global session guard, while Swagger/OpenAPI are middleware.

Initial proposal, not yet accepted: use bounded expiring in-memory counters for
the single-instance MVP, apply IP-based admission before session/database work,
and configure forwarding-header trust only for an explicitly identified proxy.
Counters reset on restart and do not coordinate across instances. Confirm the
intended deployment before choosing budgets, exceptions and browser recovery.

### Deployment clarification — 2026-10-13

The owner confirmed that hosting is not currently planned. Keep the approved
local, single-backend-instance MVP as the deployment scope. Shared storage and
production proxy configuration are not currently required. This confirmation
does not approve counter implementation, numerical budgets or later hosting.

Budget proposal for discussion, not accepted: aggregate ordinary API requests
per client IP across routes with both 120 requests per 60 seconds and 20 per
10 seconds; add separate per-IP OAuth-start (5 per 60 seconds) and OAuth-callback
(10 per 60 seconds) budgets, also subject to the common admission budgets.
Reject excess traffic without extending the wait indefinitely on each rejected
attempt. Test normal multiple-tab and shared-IP use before delivery; monitoring,
documentation, preflight and browser recovery policies remain to be agreed.

The owner requested "dodaj zadanie w backlogu zeby dodac globalnie" on 2026-10-13.
This authorizes planning only. Rate values and implementation approach remain to
be agreed; the removed auth-only limits are not implicitly approved global defaults.

### Approved budgets and recovery — 2026-10-13

The owner explicitly accepted the proposed per-IP budgets: 120 requests per
60 seconds across API routes, with an additional 20-per-10-second burst budget.
OAuth start has a separate additional 5-per-60-second budget; callback has a
separate additional 10-per-60-second budget. Both remain subject to common API
budgets. Exhausting the start-specific budget does not consume the callback's
separate budget. These are initial values to verify with ordinary navigation,
multiple tabs and shared-IP scenarios, not measured capacity guarantees.

The owner then explicitly accepted this recovery behavior:

- JSON API rejection returns HTTP 429, stable `RATE_LIMIT_EXCEEDED`,
  and `Retry-After`.
- Polish UI copy means "Too many requests. Try again in a moment."
  The exact approved Polish text is preserved in the conversation; documentation
  and identifiers remain English.
- A 429 response does not revoke a session or treat it as expired.
- Retry follows an explicit user action, without an automatic request loop.
- HTML Google navigation recovers to the fixed login page with the rate-limit
  notice; JSON callers retain HTTP 429. The redirect response must communicate
  the applicable wait where feasible, without exposing provider data.
- Rejected attempts do not extend the waiting period indefinitely.

These approvals settle policy only. Counter storage bounds, client/proxy policy,
exceptions, middleware coverage and final verification scope remain to be agreed.
No application implementation has been requested.

## Delivery record

### Final policy and implementation authorization — 2026-10-13

The owner accepted readiness, Swagger/OpenAPI and OPTIONS sharing the common
budgets; direct-peer IP tracking without forwarding-header trust (including
shared counters behind the local Angular proxy); bounded expiring in-memory
counters reset on restart. The owner confirmed use of `@nestjs/throttler`, then
explicitly requested implementation: "okej, zaimplementuj".

Implement common admission before persistence, separate Google budgets, the
agreed 429/HTML recovery, and the contract/client updates. Verify quotas and
recovery, header spoofing, concurrency, automatic new-route coverage, middleware,
storage bounds, normal multiple-tab traffic, real-stack E2E and desktop/mobile
browser inspection. No hosting, Redis, later backlog tasks or Git publication.

### Implemented and verified — 2026-10-13

- Installed exact `@nestjs/throttler` 6.7.1. Application composition owns its
  global guard, common API admission and separate Google budgets; auth has no
  separate rate-limit module. Common keys intentionally omit controller/handler
  names. Requests are counted once across middleware and controller admission.
- All `/api` traffic, including public/protected/new routes, readiness, unknown
  routes and OPTIONS, receives common admission before persistence. Swagger and
  OpenAPI are explicitly admitted before their middleware handlers using the
  same guard/store. Google GET/HEAD start and callback have independent quotas.
- The direct socket peer selects the tracker; IPv4-mapped IPv6 addresses are
  normalized. Forged forwarding headers and untrusted cookies do not change it.
  Hash counter keys, cap storage at 10,000 entries, clean expired entries using
  one timer, and reject new keys at capacity without evicting live counters.
  Capacity rejection has a one-second cleanup retry hint. Fixed counter
  deadlines are not renewed by rejected traffic. Restart clears the store.
- JSON rejections use 429/`RATE_LIMIT_EXCEEDED`, standard integer `Retry-After`
  and no-store. Google HTML navigation redirects to the fixed rate-limit notice
  with Retry-After/no-store/no-referrer. Rejection does not clear OAuth/session
  cookies or revoke sessions. Session-check recovery and sign-out recovery use
  the agreed Polish notice and explicit user retry, without automatic retry.
- Declared default 429 responses on all OpenAPI operations, exported/validated
  the specification and ran official Angular generation. Generated client source
  did not change because the existing error model already represents the code.

Verification:

- Fresh Nx API suite: **195 passed**, including all enabled real-PostgreSQL OIDC,
  admission and session/CSRF suites. Eleven new HTTP/storage scenarios cover
  cross-route budgets, default route protection, pre-persistence rejection,
  separate Google quotas, safe HTML recovery, documentation/preflight/unknown
  routes, real peer-IP isolation, spoofing, parallel requests, recovery and
  bounded cleanup. A signed-provider-flow regression proves a valid callback
  still succeeds after exhausting the start-specific budget.
- Fresh Angular/auth/login/shell and shared-schema suites: **53 passed**.
- Affected Nx lint passed (API retains ten pre-existing non-null-assertion
  warnings); API and web production builds passed. OpenAPI validation, official
  generation, generated-client typecheck and source-preserving drift checks passed.
- Real-stack Nx Playwright: **20 passed**, once, across Chromium desktop
  1440 x 900 and mobile 390 x 844, with real API and disposable PostgreSQL.
  Includes existing auth regression, limited Google navigation/no excess rows,
  cookie/database preservation during rejected sign-out, explicit recovery and
  normal two-tab navigation. No API response mocks or runtime test-auth endpoint.
  Tests serialize their shared local IP and wait for observed quota recovery
  instead of disabling protection. Reports/traces remain in ignored `dist`.
- Independent browser inspection passed: rate-limit notice on desktop and
  mobile in light/dark themes; no horizontal overflow; real 20-admitted/21st-429
  readiness burst; protected-entry rate-limit recovery; explicit retry after
  recovery. Network/console inspection showed expected synthetic 429 and normal
  anonymous-session 401 responses, with no unexpected script or resource errors.
  The recovery screen made no repeated API requests while awaiting user action.

Limits: local single-instance protection only; no hosted proxy/distributed abuse
verification, hosted CI or fresh real Google sign-in was claimed. This task does
not deliver PKCE, production headers, event logging, auth-record cleanup or
dependency-review tasks. Owner acceptance was recorded on 2026-10-13; parent F06 remains
incomplete. The temporary stack uses synthetic credentials/data and the owner's
running services/database are left intact. No commit or publication.
The isolated API/frontend processes and disposable database container were stopped
after verification. Restart an already running owner API process to load the
updated backend code; its previous process was not replaced during verification.

## Retrospective

### Publication authorization — 2026-10-13

Published: [draft PR #20](https://github.com/Rizzlie/Daylo/pull/20), branch
`feat/f06-07-global-api-rate-limiting`, targeting `main`. Existing local verification is preserved; hosted CI
was not assessed as part of publication.

After accepting F06-07, the owner requested publishing the current work as a PR.
This authorizes selective staging, Conventional Commits on a dedicated task
branch, push and draft PR creation for the accepted F06-07 implementation and
records. Earlier no-publication statements describe the preceding delivery and
acceptance stages. No merge, deployment or later task implementation is authorized.

### Owner acceptance — 2026-10-13

The owner explicitly accepted the delivered F06-07 scope with "zatwierdzam"
after the implementation report. This closes the agreed local single-instance
task and supersedes earlier pending-acceptance statements. Recorded verification
limits remain unchanged; F06-08 through F06-12 and parent F06 remain incomplete.
Acceptance does not authorize commits, publication or subsequent implementation.
This record changes documentation only and requires no test rerun.

Own common API abuse protection at application composition, with explicit feature
overrides. Keep a deferred security finding open when its temporary mitigation
is removed; do not confuse backlog registration with delivery.

Implementation retrospective: Swagger registration after `app.init()` put its
handlers behind Nest's final 404 handler; preserve its registration order and
attach admission immediately before Swagger. Reset shared counters between
isolated HTTP test cases and pace real-stack browser scenarios against genuine
quotas. Do not weaken runtime protection to make tests faster.
