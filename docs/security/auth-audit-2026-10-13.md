# Daylo authentication security audit — 2026-10-13

Scope: the current uncommitted implementation of Google OIDC, application admission,
PostgreSQL-backed sessions, API guards, CSRF, frontend authentication and lifecycle.
The owner explicitly requested an audit. This report does not authorize fixes,
dependency upgrades, deployment or acceptance of later backlog tasks.

## Result and priorities

F06-11 follow-up: On 2026-10-14, the owner-authorized periodic expired-record
cleanup was implemented and locally verified using NestJS scheduling, bounded
PostgreSQL batches, session sliding/absolute cutoffs and concurrency protection.
The owner accepted the reviewed scope on 2026-10-14. See
[F06-11](../tasks/F06-11-expired-auth-record-cleanup.md) for evidence and operational
limits. Historical findings below describe the audited baseline; this is a delivery
follow-up, not a new security audit or production verification.

F06-07 follow-up: the owner-discussed local global rate-limit scope was explicitly
authorized, implemented, locally verified and owner-accepted on 2026-10-13.
Common per-peer-IP API quotas, separate Google quotas, bounded in-memory storage
and pre-persistence rejection address AUTH-03's missing application quota in this
local single-instance scope. This does not establish hosted/distributed abuse
protection or complete the pending expired-record cleanup. See
[F06-07](../tasks/F06-07-global-api-rate-limiting.md). Earlier deferred-state
statements below preserve the audit/delivery history; no new audit is claimed.

Follow-up: The owner authorized and selected the bounded remediation recorded in
[F06-06](../tasks/F06-06-authentication-security-hardening.md). On 2026-10-13
email-authority admission, the 30-day absolute cap and HTTPS host-prefixed cookies
were implemented and locally verified. The initial auth-only quota was subsequently
removed at the owner's request; AUTH-03 remains open and global rate limiting is
pending in [F06-07](../tasks/F06-07-global-api-rate-limiting.md). Findings
below preserve the audited baseline. Rate limiting, account-wide
revocation and the separately listed hardening/dependency recommendations remain
open. The owner accepted the final delivered F06-06 scope on 2026-10-13; this
does not close the pending recommendations or imply deployment verification.

The owner subsequently requested separate pending backlog tasks for the additional
recommendations: [PKCE](../tasks/F06-08-pkce-for-google-oidc.md),
[production headers](../tasks/F06-09-production-security-headers.md),
[security events](../tasks/F06-10-auth-security-event-logging.md),
[expired-record cleanup](../tasks/F06-11-expired-auth-record-cleanup.md) and
[dependency review](../tasks/F06-12-security-dependency-review.md). Registration
does not resolve the findings or authorize implementation.

No unconditional authentication bypass was demonstrated in the reviewed flows.
There is a high-impact conditional admission weakness and several production
hardening gaps. Passing regression tests does not establish that authentication is
free of vulnerabilities. Findings below distinguish code evidence, attack
preconditions and checks that were not performed.

| ID | Assessment | Finding | Recommended priority |
| --- | --- | --- | --- |
| AUTH-01 | High, conditional | Email authority is not checked before email-based admission | Resolve before admitting external email identities |
| AUTH-02 | Medium, confirmed policy risk | Stolen sessions can be renewed indefinitely | Decide an absolute lifetime and revocation policy before production |
| AUTH-03 | Medium, missing abuse control | Public OAuth start creates database work without throttling | Add bounded rate limits before public exposure |
| AUTH-04 | Medium, conditional | Unprefixed cookies permit sibling-domain injection | Protect production cookies before hosting on a shared parent domain |

Additional recommendations: PKCE, deployment security headers, security-event
logging and expired-record cleanup. These are not claimed as demonstrated login
bypasses. Dependency advisories are assessed separately below.

## AUTH-01 — Verified Google email is not always authoritative

Evidence: `google-oidc.provider.ts:33` accepts `email_verified: true` but does not
retain or evaluate `hd`. `application-admission.service.ts:48` grants active access
when the email equals `INITIAL_OWNER_EMAIL`; otherwise invitations are matched
by email. Users are correctly keyed by Google subject, but first admission is an
email-ownership decision.

Google states that an external email without `hd` may remain verified on a Google
account after ownership of the mailbox changes. Gmail and verified Workspace
accounts have different authority guarantees. See [Google's token verification
guidance](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

Attack conditions: a person controls a valid Google account whose externally
hosted email was verified in the past, but the mailbox now belongs to someone
else. If Daylo invites the new mailbox owner, the former owner can authenticate
using a genuinely Google-signed token and be admitted to pending access. If an
unclaimed configured owner email is affected, the same decision grants active
access. This is not token forgery or a signature bypass.

The existing subject/email uniqueness check prevents replacing an already
persisted different subject with the same email; the finding does not imply
takeover of every existing owner account. It affects the email-based admission
boundary, especially first owner bootstrap and new invitations.

Evidence check: the existing signed-token HTTP success test uses
`synthetic@example.test`, `email_verified: true` and no `hd`, and successfully
issues a session. This passed during the audit using controlled Google transport
and the real verifier. It establishes acceptance of this claim shape; it does
not prove that a real recycled mailbox was exploited against Google.

Remediation: preserve verified email authority metadata and require appropriate
proof for email-based admission. Options include allowing Gmail/authoritative
Workspace identities, independently verifying the invitation mailbox, and
pinning the initial owner's Google subject after a trusted bootstrap. Do not
infer Workspace authority from an email suffix alone. Resolve which supported
account types the product must accept before implementing a restriction.

Suggested regression: a valid signed token with external email and no `hd`
cannot gain first owner/invitation access without additional proof; existing
subject identity continuity and email-collision rejection still hold.

## AUTH-02 — Session theft has no absolute expiration boundary

Evidence: `session.service.ts:71` and `session.store.ts:48` extend the same token
by seven days on current-session GET. Session `createdAt` exists but is not used
to cap lifetime. There is no periodic token rotation or account-wide session
revocation operation. Current-device sign-out correctly deletes its database row.

An attacker must first obtain a valid bearer cookie. After that, periodic calls
to `/api/auth/session` can keep the stolen session alive indefinitely. Frontend
rules against background polling do not constrain a direct HTTP client. Google
password changes or provider logout are not checked during local session renewal.

This matches the previously approved seven-day sliding policy; it is a security
tradeoff in that policy, not an accidental implementation deviation. A database
read leak containing only session hashes does not itself provide the cookie.

Remediation: retain the sliding window if desired, but add a server-enforced
absolute expiration from session creation and a way to revoke all sessions after
an account compromise. Evaluate rotation/re-authentication for sensitive actions
when those actions exist. Choose actual durations according to product risk.
[OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
explains the role of absolute expiry and renewal.

Suggested regression: activity cannot extend a session beyond the absolute cap;
account-wide revocation prevents replay and renewal on every device.

## AUTH-03 — OAuth endpoint permits unbounded unauthenticated database work

Evidence: `google-oidc.controller.ts:65`, `google-oidc.service.ts:29` and
`oauth-transaction.store.ts:15`. Every public OAuth start deletes expired rows
and inserts a transaction, even when the caller never follows the redirect to
Google. No application throttler, request quota or concurrency budget is configured
in `apps/api/src/main.ts` or the auth module. Each fresh browser attempt replaces
the cookie but does not remove the previous unexpired transaction.

An unauthenticated caller can cause row accumulation and database work with
repeated requests. Cleanup queries use expiry; the existing transaction indexes
start with state or browser binding rather than expiry alone. Amplification and
actual service exhaustion were not benchmarked. No load attack was performed on
the owner's running development stack. Deployment proxy limits were unavailable
and cannot be credited as an existing defense.

Remediation: bound start/callback request rates and concurrency, account for
trusted-proxy configuration, add global protection beyond a single IP limit and
cap transaction storage. Schedule cleanup and consider an expiry index. Public
readiness endpoints also need deployment-level abuse controls.

Suggested regression: excessive starts return a bounded response such as 429,
create no excess rows and do not prevent normal callbacks from completing.

## AUTH-04 — Cookie names do not prevent sibling-domain injection

Evidence: `session.service.ts:9,34` and `google-oidc.service.ts:15`. Session and
OAuth cookies are host-only when issued, with HttpOnly, Lax and production Secure.
However, their names have no browser-enforced host prefix.

If an attacker controls a sibling subdomain under the deployment's parent domain,
they can set an identically named Domain cookie for that parent. For a browser
without an existing host cookie, an injected valid attacker-session cookie can
make the app operate as the attacker's admitted account; victims may put data
into that account. If both cookies are sent, duplicate rejection blocks
authentication, producing a denial of service instead. Host-only issuance does
not prohibit a different host from issuing its own parent-domain cookie.

This requires a sibling-host or insecure-cookie-injection opportunity; no such
deployment was inspected. It does not reveal a victim's HttpOnly cookie, and
fresh session issuance already resists reuse of a presented token at login.

Remediation: use a production `__Host-` session cookie (Secure, Path=/, no Domain).
Protect the OAuth binding similarly, accounting for its current narrower path
and migration of existing cookies. Prefix requirements and deployment HTTPS must
be satisfied together. [OWASP's cookie prefix guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
describes the browser-enforced boundary.

## Additional hardening and limits

- PKCE is absent: authorization URLs do not include a challenge and code exchange
  does not send a verifier. The client is confidential and already checks random
  transaction-bound nonce plus state/browser binding. No code-injection bypass
  was demonstrated. [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html) recommends
  PKCE for confidential clients and describes qualified nonce-based alternatives.
  Add S256 PKCE as defense in depth, preserving single-use transaction semantics.
- No application CSP, frame protection or HSTS configuration was found. The
  frontend has no identified auth-related unsafe HTML sink; this is not a finding
  of current XSS. Inspect production response headers, TLS and proxy configuration
  before exposure. HttpOnly does not stop injected same-origin script from invoking
  authenticated APIs and fetching CSRF proof.
- Expired session rows have no scheduled cleanup in the inspected store. They
  remain unusable because server expiry is checked, but accumulate retained data.
  Bound retention and avoid logging raw cookies, codes, CSRF proof or provider tokens.
- There is no structured auth security-event trail for repeated failures or
  revocation. Existing generic error responses appropriately hide provider/database
  diagnostics. Add redacted events and operational alerts without exposing credentials.
- Group/task APIs and event streams are not implemented in this slice. The global
  session guard proves authentication and active/pending eligibility, not ownership
  of an individual resource. Future resource authorization and SSE expiry/revocation
  require independent checks; frontend guards are never an authorization boundary.

## Dependency advisory assessment

`npm audit --omit=dev --json` reported nine affected package entries (six high,
three moderate, zero critical) in the resolved workspace tree. Parent packages and
their transitive dependencies are counted separately, so this is not nine distinct
exploitable auth bugs. No automatic fix or downgrade was applied.

| Packages | Advisory surface | Reachability assessment |
| --- | --- | --- |
| `@angular/router` 22.1.8 | GHSA-ff3f-86qr-9cv3, SSR numeric matrix-parameter DoS | The app is client-rendered, without an SSR target. The [maintainer advisory](https://github.com/angular/angular/security/advisories/GHSA-ff3f-86qr-9cv3) explicitly excludes pure SPAs. Upgrade hygiene, not a demonstrated auth/server exploit here. |
| `lodash`, `@nestjs/config` | Template-import code injection and omit/unset prototype pollution | Inspected configuration calls use fixed internal keys; no attacker-controlled template imports or omit/unset paths were found in auth. Swagger also uses lodash with application metadata. Update, but remote auth reachability is unproven. |
| `js-yaml`, `@nestjs/swagger` | Merge-source CPU exhaustion | Swagger publishes the application's specification; no endpoint accepting arbitrary YAML was found. Remote auth reachability is unproven. |
| `deepmerge-ts`, `@prisma/config`, `prisma` | Recursive-object stack exhaustion | Primarily configuration/tooling; no auth request reaches an attacker-controlled recursive configuration object in the inspected code. |
| `mysql2`, `prisma` | MySQL auth-plugin credential disclosure and compressed-protocol DoS | Daylo uses PostgreSQL and `@prisma/adapter-pg`, not a MySQL server/adapter. Not a demonstrated runtime auth path. |

Registry-generated fixes include a Prisma major downgrade and a Swagger major
upgrade. They require reviewed compatibility work, not blind `npm audit fix --force`.
Advisory reachability should be reevaluated against actual production artifacts.

## Verified protections and execution evidence

- Session/state/browser-binding/nonce values use independent 32-byte CSPRNG output.
  Session tokens and CSRF proof are stored as hashes; cookies are strictly parsed,
  unknown/ambiguous tokens rejected, and sign-in replaces the presented session.
- Google signature, RS256, issuer, audience, nonce, issue/expiry dates and optional
  authorized party are validated using the official library and additional checks.
  Provider access/refresh/ID tokens are not retained or returned. Provider requests
  have a timeout and retry is disabled.
- Database transaction consumption is atomic and browser-bound; replay/concurrent
  callbacks cannot exchange the same attempt twice. SQL inputs are parameterized.
- API protection is deny-by-default through an application guard. Pending sessions
  have explicit exceptions. Mutations require exact frontend Origin and session-bound
  CSRF proof with timing-safe comparison. Logout revokes the row, not just the cookie.
- Sensitive auth responses use no-store; callback referrer policy is no-referrer.
  Redirect destinations/reasons are fixed. Frontend uses escaped interpolation,
  fixed notices and no local/session storage of authentication tokens.

Executed fresh Nx tests for `api`, `api-auth-data-access`, `api-core-configuration`
and `web-core-auth-data-access`: **223 passed**, including all enabled database
integration cases (170 + 3 + 21 + 29). The suite used a migrated disposable
PostgreSQL 17 database `daylo_f06_auth_audit`, replacing only external Google
transport where applicable. Serializer rejection tests intentionally emitted error
logs; their assertions passed. No production code or dependency was changed.

Limitations: no successful real Google attack/sign-in was attempted, no deployed
TLS/proxy/domain posture was available, no destructive load test was run, and
future resource/event-stream authorization is outside current implementation.
The audit is a focused source/test review, not a certification or exhaustive
penetration test. The disposable audit container/database was removed after checks;
the owner's running development services and data were left untouched.

Next action: resolve AUTH-01 account support, then approve a bounded remediation
scope for abuse controls, session lifetime/revocation and production cookie/header
hardening. This report does not change delivery acceptance or start another task.
