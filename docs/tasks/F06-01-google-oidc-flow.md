# F06-01 — Google OIDC transaction flow

Parent backlog item: **F06** · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: **Complete — scope accepted by the owner on 2026-10-12.**
Implementation authorization: **Granted by the owner on 2026-10-12 for the agreed scope.**
Delivery status: Closed — agreed scope implemented, locally verified and owner-accepted on 2026-10-12. Real Google sign-in is not claimed.

## Assumptions and sources

- Google backend-owned OIDC and database-backed cookie sessions are fixed architecture choices. Owner, active user, pending invitee and outsider have different access. Controlled-provider verification does not prove real Google configuration.
- Dependencies: F05. Confirm their delivered and verified behavior before dependent work.
- Read [product requirements](../product-requirements.md), [architecture](../architecture.md) and [backlog](../backlog.md). Apply the relevant [frontend](../frontend-architecture.md), [backend](../backend-architecture.md) and [design-system](../design/design-system.md) rules.
- The bounded scope was discussed, accepted and explicitly authorized below. Only F06-01 is implemented.

## Work to perform

- [x] Implement backend Google OIDC redirects/callback with browser-bound expiring single-use transactions and complete ID-token validation.
- [x] Do not retain provider access/refresh tokens.

## Acceptance criteria

The work above must satisfy this task-specific observable outcome:

Controlled-provider tests cover valid flow, state/nonce/browser mismatch, expiry, replay, invalid token claims/signature and unverified email.

The owner confirmed these criteria and the detailed verification scope below on 2026-10-12. Applicable checks must pass, evidence and limitations must be recorded, and no blocking defect may remain. Implementation, verification and owner acceptance are tracked separately.

## Verification plan

- [x] Controlled-provider tests cover valid flow, state/nonce/browser mismatch, expiry, replay, invalid token claims/signature and unverified email.

- Inspect available Nx targets and use project generators/targets where applicable; select exact commands after inspection rather than inventing flags.
- Run affected lint, meaningful tests and production builds. For API contract changes, export/validate OpenAPI, regenerate the Angular client and check drift.
- For user-facing changes, run applicable real-stack Playwright scenarios and independently inspect the running UI through an available browser tool at relevant desktop/mobile widths, including keyboard behavior and console/network errors where supported.
- Use synthetic data and keep secrets, authentication state, reports, screenshots and traces out of version control.
- Record unavailable checks as incomplete. For review/manual-only tasks, mark inapplicable automated checks with a reason; do not rerun unrelated checks solely to fill the report.

## Discussion before implementation

Discuss this task with the owner before application changes:

1. What authentication transaction expiry and fixed success/failure redirect routes should be used?
2. Confirm assumptions, dependencies, scope boundaries and the observable acceptance scenarios above.
3. Agree on implementation approach, affected areas, required checks and any remaining limitations; resolve material ambiguities explicitly.

Record the discussion outcome below. Agreement on documentation alone is not implementation authorization. Start implementation only after the discussion is complete and the owner explicitly requests implementation of the agreed scope. Do not interpret silence or a request to discuss as approval.

### Decision record

- Discussion date: Completed on 2026-10-12. Owner instruction: "Ok akceptuje", accepting the proposed scope below.
- Agreed assumptions and behavior: Ten-minute, browser-bound, atomically consumed single-use OIDC transactions; complete ID-token validation; no retained provider tokens. Valid provider verification temporarily ends with safe HTTP 503 without identity disclosure or session creation.
- Agreed scope and exclusions: Backend Google redirect/callback only. Admission, sessions/CSRF, frontend authentication and real Google smoke remain in F06-02 through F06-05. Fixed frontend completion redirects are deferred until session completion exists.
- Agreed approach and verification: Existing Prisma transaction model, maintained OIDC library selected and pinned during implementation, signed synthetic-token tests, HTTP integration and isolated PostgreSQL concurrency/replay checks, relevant Nx lint/tests/builds, OpenAPI/client regeneration and drift verification, and applicable browser inspection as detailed below.
- Unresolved questions: None blocking scope agreement. Concrete library and safe error-code selection are implementation details within this scope.
- Owner implementation authorization: "Implementuj F06-01", 2026-10-12. Work briefly paused for Google Cloud setup; the owner then supplied local environment configuration and requested that the existing environment validator be included. Authorization covers only the accepted F06-01 scope.

### Inspection and accepted scope — 2026-10-12

The owner accepted these proposals on 2026-10-12. Scope acceptance is not implementation authorization.

- F05 is owner-accepted; its recorded PR #13 hosted CI checks passed. The working tree was clean at inspection.
- The existing Prisma `OAuthTransaction` model already stores unique state hashes, browser-binding hashes, nonce and expiry. The auth feature currently contains only the current-session controller, which always returns 401. Frontend routes are empty; Google runtime configuration is not yet defined.
- Implement `GET /api/auth/google` and `GET /api/auth/google/callback`, with a ten-minute transaction lifetime, cryptographically random state/nonce/browser binding, hashed state and binding in PostgreSQL, and an HttpOnly, SameSite=Lax browser-binding cookie. Apply secure cookies outside local HTTP development.
- Atomically consume a matching unexpired browser-bound transaction before provider exchange, so concurrent callbacks and retries cannot reuse it. Provider refusal and validation failure terminate the matching transaction; a new attempt starts a new flow.
- Use a maintained OIDC library for code exchange and signature/claim verification, with explicit nonce and verified-email checks. Select and pin the concrete library during authorized implementation. Request only `openid email profile`; do not persist or return provider tokens.
- Keep the verified identity internal. User persistence/admission remains F06-02; session creation, CSRF and authenticated completion remain F06-03; frontend states remain F06-04; real Google smoke remains F06-05.
- Accepted intermediate HTTP behavior: after valid provider verification, return a safe 503 `SERVICE_UNAVAILABLE` response explaining that Daylo sign-in completion is not yet available, without returning identity or creating a session. Invalid transactions/provider responses use a safe stable authentication error; infrastructure failures remain 503. Fixed frontend success/failure redirects will be wired when session completion exists, rather than introducing a success page in this task.
- Verify signed synthetic ID tokens through the actual validation path, HTTP cookie/redirect behavior, state/nonce/browser mismatch, expiry, replay and concurrent callbacks, bad signature/issuer/audience/expiry, missing claims, unverified email and provider refusal. Use an isolated PostgreSQL database to verify atomic consumption. Controlled provider wiring stays test-only.
- Run relevant Nx lint/tests and API production build; export/validate OpenAPI, regenerate the client through existing targets and verify drift after endpoint documentation changes. Inspect the real API redirect and safe callback failure through an available browser. Full sign-in E2E and real Google sign-in are not claimed by this slice.

Provider reference reviewed: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect). Google documents state/nonce, backend code exchange and ID-token validation, and recommends using a pre-written authentication library.

## Scope boundaries

Only the work listed above belongs to this task. Follow the parent backlog boundary and approved architecture; do not implement subsequent tasks, speculative libraries or deferred MVP features. Preserve existing delivered work and original design exports. Git initialization, commits, publication and deployment require their own authorization.

## Delivery and review record

- Delivered behavior: Added the auth-owned Nx data-access library through the official generator and reused the existing OAuth transaction schema without a migration. Google redirect/callback now use random state, nonce and browser binding, ten-minute expiry, hashed state/binding, atomic PostgreSQL consumption and safe cookie/error policies. Official `google-auth-library` 11.2.0 exchanges codes and verifies RS256 signatures, trusted issuer/audience and token dates; Daylo additionally checks nonce, verified email, required claims and optional authorized party. Provider transport is bounded by a ten-second timeout without retries; tokens are never retained. Public callback input is defined in shared Zod schemas. The existing environment validator requires all three Google settings, matches callback origin/path and enforces HTTPS outside local non-production HTTP. Runtime values preserve accepted normalization. OpenAPI and the unmodified generated Angular client document both browser-navigation endpoints. Valid verification deliberately ends with the agreed safe 503; user/session creation remains excluded.
- Checks executed and outcomes: Relevant Nx lint/test/build commands passed without cache. Final API verification passed all 70 tests (46 controlled Google HTTP cases, four real PostgreSQL HTTP cases and 20 existing API cases); configuration passed 20 tests; shared schemas passed 11 existing tests. The separate auth persistence suite passed three real PostgreSQL cases, including eight concurrent consumes, replay, mismatches, exact expiry and cleanup. The real HTTP suite verifies one provider exchange among eight concurrent callbacks and no user/session creation. Migrations applied to a fresh isolated `daylo_f06_oidc_20261012` database. API/web production builds, Angular client compilation and existing web/client unit tests passed. Offline export/validation and official client regeneration passed. The F05-02 check verified two identical temporary generations with unchanged source artifacts; it also ran as a frontend build dependency. `git diff --check` passed after adding parameter descriptions to avoid blank generated JSDoc whitespace.
- Browser scenarios and viewport coverage: T3 collaborative preview inspected the real Angular proxy/API/PostgreSQL stack with synthetic Google credentials at 1280 × 800 and 390 × 844. Readiness returned 200 through port 4200; browser navigation reached Google, which correctly rejected the synthetic client with `invalid_client`. A malformed-state callback returned the safe 401 envelope with no identity/tokens. Console/network diagnostics were inspected: expected callback 401, no JavaScript failure in these endpoint pages. Early startup connection/proxy failures resolved after both services were ready; subsequent proxied HTTP/readiness and navigation passed. This slice adds no rendered Angular controls, so feature layout/keyboard interaction is N/A. Valid signed-token completion and consent-refusal consumption were verified through HTTP/PostgreSQL tests, not an authenticated browser.
- Known limitations / incomplete verification: Real Google credentials/sign-in remain unverified (F06-05). Full authentication Playwright E2E and UI states remain F06-04/F07 because there is no Daylo admission/session completion yet. PostgreSQL suites are opt-in and were run locally; ordinary CI skips them without explicit isolated database setup. F06-01 hosted CI has not been run. User admission, sessions, CSRF, sign-out and fixed completion redirects remain pending in their respective tasks.
- Owner acceptance: Owner instruction "ok akceptuje zmiany", 2026-10-12, accepts the delivered F06-01 implementation and closes the agreed scope. Recorded verification limitations remain unchanged; this acceptance does not authorize subsequent implementation, commits or publication.
- Cleanup: Stopped the API/frontend processes owned by verification, removed the isolated `daylo_f06_oidc_20261012` database and returned PostgreSQL to its prior stopped state. Owner environment files were preserved; no local commit or PR was created.
- Retrospective and workflow improvements: Inspect branch freshness before dependent work. During delivery the owner authorized a pull; main was fast-forwarded from `82e25a6` to `a86a5ab`, restoring the already merged F05-02 targets. Two overlapping task documents were selectively stashed/restored without conflicts, and the temporary stash was removed; owner environment changes were preserved. Review generator root changes rather than retaining an unrelated inferred Vitest plugin. Keep a narrow, documented test-only persistence override instead of loosening production boundaries. Add Swagger parameter descriptions rather than modifying generated client whitespace. Angular may inherit the API `PORT`; explicitly set 4200 in the frontend terminal and wait for both readiness paths before browser inspection.

Update this record and the parent backlog after delivery/review. Do not mark the parent item accepted until all of its criteria are met and the owner accepts it.
