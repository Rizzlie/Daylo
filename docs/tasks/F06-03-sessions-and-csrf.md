# F06-03 — Database sessions and CSRF

Parent backlog item: **F06** · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: **Completed on 2026-10-12.**
Implementation authorization: **Granted by the owner on 2026-10-12 for the agreed scope below.**
Delivery status: Implemented, locally verified and owner-accepted on 2026-10-12. Browser behavior checked with synthetic sessions; visual/console inspection remains incomplete.

## Assumptions and sources

- Google backend-owned OIDC and database-backed cookie sessions are fixed architecture choices. Owner, active user, pending invitee and outsider have different access. Controlled-provider verification does not prove real Google configuration.
- Dependencies: F06-02. Confirm their delivered and verified behavior before dependent work.
- Read [product requirements](../product-requirements.md), [architecture](../architecture.md) and [backlog](../backlog.md). Apply the relevant [frontend](../frontend-architecture.md), [backend](../backend-architecture.md) and [design-system](../design/design-system.md) rules.
- This is a proposed bounded task. Inspect discoverable implementation facts; resolve material product decisions with the owner during the discussion.

## Work to perform

- [x] Implement hashed opaque DB sessions, seven-day sliding expiry, secure cookie policy, current session, session-bound CSRF/origin checks and revoking sign-out.
- [x] Restrict pending sessions.

## Acceptance criteria

The work above must satisfy this task-specific observable outcome:

Reload, seven-day sliding renewal, absence of renewal on other requests, exact expiry, revocation, missing/invalid CSRF/origin proof and forbidden pending-user operations are checked; OAuth callback retains its separate transaction protections.

The owner confirmed the scope and sliding-expiry policy during discussion. Implementation, verification and owner acceptance are tracked separately; limitations below remain explicit.

## Verification plan

- [x] Reload, sliding renewal, exact expiry, revocation, missing/invalid CSRF/origin proof and forbidden pending-user operations are checked; OAuth callback retains its separate transaction protections.

- Inspect available Nx targets and use project generators/targets where applicable; select exact commands after inspection rather than inventing flags.
- Run affected lint, meaningful tests and production builds. For API contract changes, export/validate OpenAPI, regenerate the Angular client and check drift.
- For user-facing changes, run applicable real-stack Playwright scenarios and independently inspect the running UI through an available browser tool at relevant desktop/mobile widths, including keyboard behavior and console/network errors where supported.
- Use synthetic data and keep secrets, authentication state, reports, screenshots and traces out of version control.
- Record unavailable checks as incomplete. For review/manual-only tasks, mark inapplicable automated checks with a reason; do not rerun unrelated checks solely to fill the report.

## Discussion before implementation

Discuss this task with the owner before application changes:

1. What exact cookie name, CSRF exchange/header and expiry behavior should the frontend consume while preserving the seven-day session policy?
2. Confirm assumptions, dependencies, scope boundaries and the observable acceptance scenarios above.
3. Agree on implementation approach, affected areas, required checks and any remaining limitations; resolve material ambiguities explicitly.

Record the discussion outcome below. Agreement on documentation alone is not implementation authorization. Start implementation only after the discussion is complete and the owner explicitly requests implementation of the agreed scope. Do not interpret silence or a request to discuss as approval.

### Decision record

- Discussion date: 2026-10-12.
- Agreed assumptions and behavior: Use the opaque `daylo_session` cookie with HttpOnly, SameSite=Lax, path `/` and Secure outside local HTTP development. The owner selected sliding expiration: sessions initially last seven days; a successful `GET /api/auth/session` renews a still-valid session and its cookie for seven days from that request. Expired or revoked sessions cannot be renewed. CSRF retrieval and other requests do not renew sessions; background streams must not keep them alive. There is no absolute lifetime cap or separate refresh token in this scope. Sign-out revokes only the current session immediately. Pending sessions remain restricted to identity, CSRF, sign-out and future invitation inspection/resolution. OAuth keeps its separate transaction protections.
- Agreed scope and exclusions: Implement DB-backed session issuance after admission, current-session lookup/renewal, `GET /api/auth/csrf`, `X-CSRF-Token` plus exact FRONTEND_ORIGIN checks on unsafe methods, `POST /api/auth/sign-out`, and default session/application-access enforcement. Callback redirects to fixed `/today` or `/invitations` routes; their frontend implementation remains F06-04. No invitation resolution, SSE, refresh-token mechanism, token rotation, Google token persistence, commits or publication.
- Agreed approach and verification: Reuse existing Prisma session fields and Auth libraries; use only necessary internal identity contracts for access metadata and request actors. Store only session/CSRF hashes, use no-store responses, preserve explicit public endpoint exceptions. Check issued cookies, reload, sliding renewal, exact expiry, revocation, concurrent renewal/sign-out, session-bound CSRF/origin failures, pending restrictions and OAuth regression with synthetic data and isolated PostgreSQL. Run affected Nx lint/tests/builds, official OpenAPI/client regeneration and drift checks; inspect the real API/proxy through the available browser. Full frontend login E2E and real Google smoke remain later tasks.
- Unresolved questions: None for this bounded scope.
- Owner implementation authorization: Initial request "No to co, implementujemy F06-03", followed by discussion of expiry and refresh tokens and final instruction "Okej, to zróbmy tak" on 2026-10-12 approving seven-day sliding renewal through current-session retrieval.

## Scope boundaries

Only the work listed above belongs to this task. Follow the parent backlog boundary and approved architecture; do not implement subsequent tasks, speculative libraries or deferred MVP features. Preserve existing delivered work and original design exports. Git initialization, commits, publication and deployment require their own authorization.

## Delivery and review record

- Delivered behavior: Successful admitted callbacks now issue a fresh opaque `daylo_session` cookie and redirect to fixed `/today` or `/invitations`. PostgreSQL stores only session/CSRF hashes using the existing schema. The presented previous browser session is replaced transactionally. Current-session retrieval projects live user identity/access and atomically renews only still-valid sessions and cookies for seven days, with a monotonic deadline. Other requests, including CSRF reads, business reads/mutations and HEAD probes, do not renew. Stable domain-separated HMAC CSRF values can be retrieved across tabs/restarts without plaintext storage. The global guard requires sessions and active access by default, permits pending access only explicitly, verifies exact Origin plus session-bound CSRF on unsafe methods, and supplies an actor context. Sign-out deletes only the current session, clears its cookie and returns 204. Persistence failures return safe 503. Added one necessary generator-created core identity contract library; no migrations, npm dependencies, frontend workflows or runtime test-provider flags were added. OpenAPI and the official Angular client include session security, CSRF retrieval and sign-out.
- Checks executed and outcomes: On 2026-10-12, all 166 api:test cases passed with isolated PostgreSQL enabled, including 31 session HTTP cases against the production session adapter, 31 ordinary HTTP policy cases, seven signed-provider/PostgreSQL callback cases and 17 admission/PostgreSQL cases. Session coverage includes exclusive expiry, reload, sliding renewal, no renewal through other requests/HEAD, session-bound CSRF, exact Origin failures, pending restrictions/live access changes, secure cookies, session replacement, safe persistence errors, concurrent renewal/sign-out and out-of-order deadlines. The initial migration applied to a disposable PostgreSQL 17 daylo_f06_03_verify database on loopback port 5446. Three real PostgreSQL OAuth-store tests and all shared-schema tests passed. Ordinary API and generated-client tooling tests passed again after the Origin documentation adjustment. Affected lint, API/web production builds, Angular client compilation, official OpenAPI export/validation/regeneration and two-generation source-preserving drift checks passed. Final header documentation was regenerated through the official pipeline to eliminate generator-created trailing whitespace; no generated source was edited manually. The tracked diff check passed before staging. The full staged whitespace check then flagged upstream trailing spaces and a final blank line in the newly added generated csrf-token-response-output.ts model; this output is retained unmodified under the generated-client policy. The staged handwritten/documentation whitespace check passed.
- Browser scenarios and viewport coverage: The T3 collaborative browser used the actual Angular proxy, Nest runtime API and isolated PostgreSQL with synthetic environment overrides on ports 4207/3007. Runtime configuration resolved from an empty ignored temporary directory, without reading the owner's secret files. At 1280x800, Swagger DOM listed all six operations and resource diagnostics initially contained no failures. Seeded one synthetic session with a one-day initial expiry; browser current-session retrieval returned 200 and converted the fixture cookie to HttpOnly (not readable through document.cookie), CSRF retrieval returned 200, and sign-out without proof returned 403. Reloading Swagger retained the session and returned the same safe identity with 200. At 390x844, a browser-origin POST with the retrieved CSRF token returned 204 with an empty body; subsequent current-session retrieval returned the expected safe 401. This exercises native cookie/Origin handling through the real stack, but is not a Google sign-in or an authentication UI test. Temporary servers and the disposable database/container were cleaned up after inspection.
- Known limitations / incomplete verification: Both image and text-only T3 snapshots failed, so visual/screenshot verification and snapshot-provided console inspection remain incomplete. Browser evaluation/navigation worked and observed only the expected post-sign-out 401 in final resource diagnostics. No authentication UI exists in this scope: entry/foreground calls, route screens and full Playwright authentication fixtures remain F06-04/F07. Real Google sign-in remains F06-05. Resource-level feature permissions beyond pending/active enforcement remain their own tasks. PostgreSQL acceptance suites remain opt-in in ordinary CI; hosted CI was not executed. Sliding renewal intentionally has no absolute lifetime cap or periodic token rotation.
- Owner acceptance: Granted on 2026-10-12 through "Wygląda dobrze, akceptuje. zaktualizuj docsy i wystaw PR" after the owner reviewed the delivered behavior and manual test instructions. The owner reported that the result looks good; this does not establish detailed independent Google smoke evidence or resolve the recorded visual/console limitations. The same instruction separately authorizes commit, push and draft PR publication. F06-04 remains pending.
- Cleanup limitation: Temporary server sessions were stopped and the owned PostgreSQL container/database removed. Automatic command approval rejected deletion of the four explicitly named verification files with `blocked by policy`; those synthetic-only helpers remain in ignored `tmp/f06-03-browser` and are not part of the delivery or version control.
- Retrospective and workflow improvements: Existing admission tests counted all sessions in a shared isolated DB; newly concurrent session suites exposed the invalid assumption. Assertions now target only each suite's synthetic users and cleanup runs before assertions. Express routes HEAD through GET handlers, so renewal now checks the actual method and has regression coverage. Document browser-managed Origin in prose rather than a generated service parameter; browser JavaScript cannot set it. Provide header descriptions before generation to avoid empty generated JSDoc/trailing whitespace. Nx's Node loader also preloads code in worker threads, so the temporary verification-only working-directory preload now checks isMainThread. Do not report successful browser DOM/API checks as visual verification when snapshots fail.

Update this record and the parent backlog after delivery/review. Do not mark the parent item accepted until all of its criteria are met and the owner accepts it.
