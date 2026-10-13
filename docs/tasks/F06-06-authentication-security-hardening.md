# F06-06 — Authentication security hardening

Parent backlog item: F06 · [Task index](../tasks.md)

## Assumptions

The [2026-10-13 audit](../security/auth-audit-2026-10-13.md) identified AUTH-01
through AUTH-04. Google OIDC, database-backed cookie sessions, Zod and the existing
Nx architecture remain fixed. Preserve existing work and the owner's greeting.

## Discussion and decision record

The owner requested "ok to naprawmy te rzeczy" after the four main findings.
On 2026-10-13 the owner explicitly selected rejecting non-authoritative Google
emails for new admission while preserving existing active identities by Google
subject, and an absolute session lifetime of 30 days with the current seven-day
sliding window. Implementation of that bounded scope is authorized.

Scope correction on 2026-10-13: The owner requested removing auth-only throttling
and registering global API protection as a separate pending task, F06-07. The
three other hardening changes remain authorized and delivered.

## Scope

- Carry verified email authority into admission; deny new owner/invitation access
  for external email without Google authority, preserving active subject identity.
- Enforce 30-day absolute session expiry in both lookup and atomic renewal.
- Remove the temporary auth-only limiter and defer rate limiting to F06-07.
- Use host-prefixed session and OAuth cookies on HTTPS, with Secure, HttpOnly,
  Lax, Path=/ and no Domain. Local development HTTP retains compatible cookie names;
  HTTPS does not accept legacy unprefixed credentials.
- Update contracts/docs and regenerate the client if specification changes.

PKCE, independent mailbox verification, a session-management UI, account-wide
revocation, general dependency upgrades and deployment infrastructure are outside
this bounded delivery. Record remaining audit recommendations rather than treating
them as fixed. No commit or publication is authorized.

## Acceptance criteria

- Non-authoritative new owner/invitee identities cannot write a profile or receive
  a session; valid Gmail/Workspace and active-subject flows remain available.
- A valid cookie cannot authenticate or renew at/after 30 days from creation;
  renewal before that deadline is capped at it. Concurrent revocation remains safe.
- Ordinary start/callback/sign-out work after removal of auth-only infrastructure;
  no runtime quota or 429 contract is claimed before F06-07.
- Production/HTTPS session binding ignores legacy Domain-injectable cookie names;
  set/clear attributes match, duplicate rejection and local development work.

## Verification

Meaningful HTTP, provider/admission and real PostgreSQL tests; affected Nx lint,
API/web builds, OpenAPI validation/client regeneration and drift checks. Real-stack
desktop/mobile E2E and independent browser inspection use isolated synthetic data.
No destructive load test, production secrets or live user data. Real Google smoke
is tracked separately.

## Delivery record

Implemented, locally verified and owner-accepted on 2026-10-13. The final agreed
scope (email authority, absolute session expiry and HTTPS cookies, with auth-only
throttling removed) is closed.

Acceptance record: The owner stated "a okej, akceptuje zakres prac" after the
AUTH-01/02/04 explanations and opaque-session-token discussion. Acceptance applies
to the final delivered scope and documented verification limits. AUTH-03/global
rate limiting and the other planned security tasks remain pending; acceptance
does not authorize their implementation or publication.

The initial verification below is historical. The subsequent owner-requested
limiter removal supersedes its quota/dependency statements.

- Admission now carries the Google-verified authority decision without persisting
  it as user data. New owner/invitation admission rejects non-authoritative email;
  existing active subjects and collision checks are preserved.
- Lookup and atomic renewal use the existing session creation timestamp for an
  exclusive 30-day limit. Both stored expiry and cookie renewal are capped, without
  a schema migration or changing the seven-day window.
- Pinned supported `@nestjs/throttler` 6.7.1 is the sole added dependency. OAuth
  start/callback share client and global quotas. The global quota runs first and
  bounds creation of client tracker entries. No trust-proxy override or forwarding
  header trust is enabled. JSON/HTML quota failures retain 429 and safe diagnostics.
- HTTPS uses `__Host-` session/browser-binding cookies with matching set/clear
  attributes. Legacy unprefixed cookies are ignored, requiring one new sign-in on
  an HTTPS rollout. Local development names and OAuth path remain compatible.
- Checks passed: 186 API tests with all isolated PostgreSQL acceptance cases
  enabled, three persistence integration tests, 21 configuration tests, 11 schema
  tests, 55 frontend tests and one generated-client artifact test (277 total).
  Affected lint and E2E lint passed; API fixtures retain ten pre-existing non-null
  assertion warnings. API/web production builds, OpenAPI export/validation,
  official client regeneration/compilation and two-generation drift checks passed.
  All fourteen real-stack desktop/mobile E2E cases passed, including absolute
  expiry with an otherwise valid sliding deadline. No real Google success is
  inferred from controlled-provider tests.
- Independent T3 DOM/resource checks showed real foreground rejection after the
  synthetic session reached 30 days, then durable login error and no mobile overflow.
  Initial snapshots on the previous tab failed; a new tab restored snapshots and
  console inspection. Desktop dark (1280x800) and mobile light (390x844) login
  were readable and unclipped, with development logs only in the fresh tab.
  All four Playwright login theme/viewport screenshots were visually inspected.
  Production TLS/domain routing was not available; secure-cookie acceptance,
  legacy rejection and set/clear attributes were verified through HTTP tests.
- Cleanup: Verification-owned API/frontend and disposable PostgreSQL were stopped
  and removed. Owner development servers/database were preserved. Existing ignored
  synthetic helpers were reused; no new authentication bypass or runtime test flag
  was added. No commit, publication or later task was performed.
- Remaining recommendations: cluster-wide/edge quotas and explicit proxy trust,
  account-wide revocation, PKCE, deployed security headers, expired-record retention,
  redacted auth event logging and separate reviewed dependency remediation.

## Discussion topics

Resolved: account support and session maximum lifetime. Deployment proxy topology,
multi-instance quotas and remaining audit hardening will require their own scope.

## Owner-requested limiter removal — 2026-10-13

- Removed auth ThrottlerModule/guard registration, the sole throttler dependency,
  three quota-specific tests, the storage resets used by those tests, rate-specific
  error handling and OAuth 429 contract entries. Existing email authority, absolute
  expiry and HTTPS cookie protections are preserved.
- F06-07 is registered in the task index/backlog, with proposed scope, acceptance
  criteria, verification and unresolved budget/proxy/storage discussion topics.
  It is pending and not implementation-authorized. AUTH-03 remains open.
- API/auth/schema lint and 135 tests passed (124 API and 11 schema); 59 opt-in
  database cases were skipped. Persistence code was unchanged by this removal;
  its earlier real PostgreSQL evidence remains historical. OpenAPI was exported
  and validated and the Angular client regenerated through official targets.
  API/web builds and contract drift checks passed. UI code/layout was unchanged;
  browser/E2E checks were not repeated for this backend-infrastructure rollback.
- Package manifest/lockfile no longer differ from their original state. No new
  dependency, application module, commit or publication was added.

## Retrospective

Keep email authority at the provider/admission boundary rather than spreading
verification metadata into database seed entities. HTTPS cookie fixtures must use
consistent frontend/callback origins. Force fresh Nx execution for opt-in database
tests because the opt-in environment is not part of their cache key. Distinguish
per-process abuse protection from deployment-wide rate limiting, and browser
snapshots from automated screenshots. Record the owner's product-policy choices
before changing account eligibility or session lifetime.

## Pull request publication — 2026-10-13

The owner requested publication after accepting the delivered scope. Draft
[PR #18](https://github.com/Rizzlie/Daylo/pull/18) includes the final AUTH-01,
AUTH-02 and AUTH-04 fixes alongside F06-04. AUTH-03 and additional hardening
remain pending backlog work. Hosted CI and PR review are not claimed as passed.
