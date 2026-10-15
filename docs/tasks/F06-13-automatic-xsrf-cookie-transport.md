# F06-13 — Automatic XSRF cookie transport

Parent backlog item: **F06** · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: Completed on 2026-10-15.
Implementation authorization: Granted with "no to do it" after the agreed flow.
Delivery status: Closed: implemented, locally verified and owner-accepted on 2026-10-15.

## Assumptions and agreed decisions

- Reuse database-backed sessions, session-bound HMAC CSRF values and stored hashes,
  constant-time validation and exact Origin checks. No new CSRF/session library,
  dependency, migration, task UI, commit, PR or deployment.
- Issue a JavaScript-readable, host-only `daylo_xsrf` cookie with Path=/,
  SameSite=Lax and the same expiry/Secure policy as the session. Its stable name
  works with Angular's built-in extractor across development and managed tests.
  The authentication cookie retains HttpOnly and its existing secure __Host- name.
  The server validates against the session's stored hash, never against the
  request's readable XSRF cookie; injecting that cookie cannot forge valid proof.
- Sign-in and successful GET /api/auth/session issue/repair the XSRF cookie.
  HEAD and ordinary requests do not renew or reissue cookies. Successful sign-out
  and rejected anonymous/expired sessions clear both cookies; failed revocation
  must preserve them. Existing GET /api/auth/csrf stays compatible for direct clients.
- Angular's built-in XSRF interceptor reads the cookie and attaches X-CSRF-Token
  to eligible same-origin mutation requests. Sign-out no longer fetches JSON proof.
- OpenAPI declares cookie session AND header CSRF as security requirements for
  authenticated mutations, rather than ordinary operation parameters. Regenerate
  the official Angular client; never edit generated files manually.

## Scope and acceptance criteria

- [x] Generated task/sign-out methods need no xCSRFToken argument.
- [x] Angular attaches current proof automatically, skips reads/foreign origins,
      and observes cookie changes without keeping stale proof in application memory.
- [x] Backend still rejects absent/invalid/cross-session proof and invalid Origin.
- [x] Cookie issuance, reload/repair, multi-tab stability, expiry and sign-out work
      without exposing the session token to JavaScript or storing raw tokens in DB.
- [x] Existing authentication states, rate-limit/retry behavior and task privacy
      are preserved. No manual token argument or extra CSRF retrieval is needed for
      the UI's sign-out flow.

## Approach and verification

Use existing authentication providers/guards and supported Angular HTTP APIs.
Run affected lint/unit/HTTP tests, production builds, OpenAPI validation, official
generation/drift and client/E2E typechecks. Exercise real browser-cookie sign-out
and XSRF lifecycle through managed desktop/mobile Playwright and independent
browser inspection against synthetic Google and isolated PostgreSQL.

## Discussion and delivery record

The owner examined OWASP, Angular and NestJS guidance with the agent, confirmed
that generated API calls should omit the CSRF argument, and explicitly requested
implementation. Backend token validation remains the approved existing mechanism;
Angular automates transport. A readable-cookie name is an implementation detail;
host-only scope, Secure policy and session-bound verification remain required.

- Delivered behavior: Cookie issuance/repair/clearing, native Angular transport,
  direct sign-out and generated methods without CSRF parameters are implemented.
  OpenAPI uses session AND CSRF security schemes. All generated artifacts were
  produced by `web-shared-api-client:generate`; none were edited manually.
- Verification: 254 API cases passed against isolated PostgreSQL with Nx cache
  disabled; 34 frontend-auth and 16 application/router cases passed. Affected
  lint, client/E2E typechecks, API/web production builds, OpenAPI validation,
  generation and source-preserving generated-client drift checks passed.
  Existing ten API lint warnings remain. All 48 distinct real-stack desktop/mobile
  scenarios passed across the full regression and focused correction runs: the
  first run passed 44, with a premature cookie assertion, overly precise expiry
  comparison and two shared trace-directory collisions corrected/verified by
  six expiry cases, two XSRF cases and one mobile privacy case. No clean single
  48-case run is claimed. Changed-file formatting and whitespace checks passed.
  Disposable API/browser databases and managed service processes were cleaned up.
- Browser inspection: Desktop/mobile inspection against synthetic Google and
  isolated PostgreSQL passed: only the XSRF cookie is JavaScript-readable,
  reload repairs a removed cookie, and account-menu sign-out returns to login,
  clears cookies and makes no `/api/auth/csrf` request. No new application errors
  appeared; anonymous session reads correctly return 401. Earlier diagnostics
  from a stopped inspection stack were excluded.
- Limitations: Hosted CI, real Google sign-in and deployed HTTPS were not checked
  for this change. Secure cookie attributes are covered by API and browser tests.
- Owner acceptance: Granted with "Akceptuje zmiany" on 2026-10-15 for the delivered scope, including the personal-task type simplification and automatic XSRF transport. Recorded verification limitations remain. No publication or subsequent implementation is authorized.
- Retrospective: Model CSRF as OpenAPI security to keep generated method arguments
  focused on operation data. Use positional E2E file filters on Windows rather
  than shell-sensitive pipe expressions. Disable Nx cache when integration-test
  environment variables change so a database-free result cannot replace a real
  PostgreSQL run.
  Wait for session revalidation before asserting cleared browser cookies and
  compare browser cookie expiries at meaningful precision. Run managed E2E
  commands sequentially because their report/trace directory is shared.

### Publication authorization — 2026-10-15

After accepting the delivered changes, the owner requested "super, wystaw gotową PR".
This authorizes selective staging, task-branch commits, push and a ready-for-review
pull request containing M01-01, its type simplification and F06-13. Recorded
verification limits remain; merge, deployment and subsequent tasks are not authorized.
