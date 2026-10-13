# F06-08 — PKCE for Google OIDC

Parent: F06 · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: Scope agreed on 2026-10-13.
Implementation authorization: Granted on 2026-10-13.
Delivery status: Implemented, locally verified and owner-accepted on 2026-10-13.

## Assumptions and sources

The [auth audit](../security/auth-audit-2026-10-13.md) recommends PKCE as additional
protection, without claiming a demonstrated code-injection bypass. Reuse F06-01
OIDC and F06-06 admission/cookie protections, the official Google client, Prisma
and existing Nx targets. Backend-owned sessions remain unchanged.

## Scope

- Generate a fresh verifier/challenge per attempt and use S256 with Google.
- Bind the verifier to the existing browser-bound, expiring OAuth transaction.
  Protect its recoverable server-side storage; a hash alone cannot supply the
  verifier required at exchange. Never place it in browser storage or logs.
- Send the verifier during code exchange. Retain state, nonce, signature/claims
  validation, atomic single-use consumption, timeouts and disabled retries.
- Add only the required migration/configuration and update authentication docs.

## Acceptance criteria

Every start has a transaction-specific S256 challenge; exchange uses its matching
verifier. Missing/mismatched verifier, expired or replayed attempts issue no
session. Concurrent callbacks still allow only one exchange. Verifiers are absent
from public responses, URLs and logs; normal admission and sign-out remain valid.

## Verification

Meaningful signed-token/HTTP tests and isolated PostgreSQL concurrency/expiry
tests; appropriate Nx lint/tests/builds and migration checks. Update contracts
through official generation if affected. Real Google PKCE smoke is recorded
separately from controlled-provider evidence, with browser inspection when available.

## Discussion topics and decision record

Agree verifier storage/encryption or secure derivation, key management/rotation,
old in-flight transaction handling and provider verification before implementation.
The owner requested backlog registration on 2026-10-13; planning alone is authorized.

### Agreed implementation — 2026-10-13

The owner answered "tak, zgadzam sie" to the proposed scope and request to implement.
Implement only F06-08, sequentially, without publication or subsequent tasks.

- Generate an independent random 32-byte base64url verifier for each attempt;
  send its SHA-256 base64url challenge with S256 through the official client.
- Store only AES-256-GCM ciphertext in the existing PostgreSQL transaction.
  Authenticate state hash, browser-binding hash and nonce as associated data.
  Use a separately configured required 32-byte key, encoded as 64 hex characters,
  named `OAUTH_PKCE_ENCRYPTION_KEY`; never reuse Google's client secret.
- Retain ten-minute expiry and atomic DELETE/RETURNING before exchange. Return
  nonce and ciphertext together only to the consuming callback.
- A nullable new persistence column identifies old in-flight transactions;
  reject them safely and require a fresh start. Changing the key invalidates
  in-flight attempts; do not keep a key ring. Existing sessions remain valid.
- Preserve state, browser binding, nonce, token verification, admission, cookies,
  throttling, timeouts and disabled retries. No public API shape change is expected.
- Verify signed-token HTTP flows, missing/tampered/mismatched verifier, rotation,
  expiry, replay and concurrent callbacks against isolated PostgreSQL; run Nx
  lint/tests/builds, migration verification and contract drift checks. Exercise
  real-stack desktop/mobile recovery and inspect using the available browser. Real Google PKCE
  smoke remains separately recorded and cannot be inferred from test fixtures.

## Delivery and retrospective

### Delivery — 2026-10-13

Implemented the agreed S256 PKCE scope using the existing official Google client,
NestJS auth feature, Prisma persistence and Node crypto, with no new dependencies.
Each attempt generates a fresh 32-byte verifier and a SHA-256 base64url challenge.
Only a versioned AES-256-GCM ciphertext/IV/tag is persisted. Associated data binds
it to state hash, browser-binding hash and nonce. A required separate 64-hex-character
`OAUTH_PKCE_ENCRYPTION_KEY` is validated at startup without echoing its value.

The existing atomic PostgreSQL DELETE/RETURNING now returns nonce and ciphertext
to exactly one callback. Recover the verifier only after consumption, then supply
it via `getToken({ code, codeVerifier })`. Missing, malformed, tampered, swapped
or old-key records fail before exchange. Provider mismatch fails without session
issuance or retry. State/browser checks, expiry, nonce/claims verification,
admission, sessions, CSRF, cookies, quotas and provider timeouts remain enforced.

The additive nullable-column migration preserves existing rows and sessions;
nullable ciphertext identifies legacy attempts that must restart rather than
downgrade. New production writes require ciphertext. Rotation requires fresh
attempts; no key ring or Google-secret reuse. Setup/migration/rotation behavior
is documented in the authentication guide, README and `.env.example`.
Public schemas and generated client source did not change.

Verification:

- Fresh final Nx API suite: **207 passed**, including all enabled isolated
  PostgreSQL OIDC/admission/session cases. Signed-token HTTP fixtures replace only
  external Google transport and enforce challenge/verifier matching. Cases cover
  independent attempts, encrypted persistence/public non-disclosure, missing,
  malformed, damaged and swapped ciphertext, key rotation and fresh-start recovery,
  provider mismatch, expiry/replay and eight concurrent callbacks.
- Configuration suite: **28 passed**, including required/invalid-key redaction.
  PostgreSQL transaction repository suite: **3 passed**, including returning both
  nonce and ciphertext to exactly one consumer, browser/state mismatch and expiry.
- Both committed migrations applied on disposable PostgreSQL 17 database
  `daylo_f06_04_pkce`; existing Nx schema-constraint verification passed.
- Affected Nx lint passed; final API/E2E lint passed with the ten pre-existing
  API non-null-assertion warnings and no new warnings. API/web production builds,
  generated-client compilation and source-preserving contract drift check passed;
  OpenAPI validated and two official client generations were identical.
- Real-stack Nx Playwright: **22 passed**, once, Chromium desktop 1440 x 900 and
  mobile 390 x 844, actual API/frontend and disposable PostgreSQL. The new scenario
  observes the real S256 redirect without following Google, damages the persisted
  record, and verifies safe Polish recovery, no session, consumed transaction and
  empty browser storage. Existing auth/CSRF/expiry/quota regressions also passed.
  Existing rate-limit-aware pacing remains enabled; protection was not disabled.
- Independent browser inspection: anonymous entry and actual invalid-callback recovery
  passed at desktop 1280 x 800 (dark) and mobile 390 x 844 (light), with a visible
  retry link, correct Polish alert, no overflow and empty browser storage.
  Console/network inspection showed expected anonymous 401 only, no unexpected
  Daylo script/resource errors. A navigation with synthetic Google credentials
  reached Google's expected invalid-client page; it is not a successful Google
  sign-in or provider PKCE verification.

Limits: real Google PKCE success, hosted CI and deployment verification remain
incomplete. The owner's existing services/database and ignored configuration were
not changed. Before using the updated local API, configure the independent key,
apply the migration to its intended database, and restart it. No commit, push,
PR, deployment, subsequent task or owner acceptance is claimed. Parent F06 remains
incomplete. Reports/screenshots/traces remain under ignored `dist`.
The isolated API/frontend process trees and disposable PostgreSQL container were
stopped/removed after verification; owner ports 3000/4200 and `daylo-postgres`
remained running.

Retrospective: keep verifier assertions after the exchange, not in the start
helper. The first enabled PostgreSQL run exposed that test-placement error; it
was corrected before the final passing run. Treat null legacy ciphertext as a
safe restart condition and prove single-use behavior with both returned values.
PowerShell string repetition uses `*`, not JavaScript's `.repeat()`; the isolated
verification startup was corrected without exposing or changing real credentials.


### Owner acceptance — 2026-10-13

The owner accepted the delivered F06-08 scope with "Ok zatwierdzam".
This closes the agreed implementation and local verification scope; real Google
PKCE success, hosted CI, deployment and recorded runtime setup remain incomplete.
Earlier pending-acceptance statements describe delivery before this acceptance.
Parent F06 remains incomplete; no publication or subsequent task is authorized.

The owner also requested browser-tool-neutral documentation. Documentation now
describes browser inspection results and limitations without naming the host.
This record changes documentation only; application checks were not rerun.

### Publication authorization — 2026-10-13

After accepting F06-08, the owner requested "Ok, wystaw PR". This authorizes
selective staging, Conventional Commits on the dedicated
`feat/f06-08-google-oidc-pkce` branch, push and draft PR creation for the accepted
implementation, delivery/acceptance records and requested documentation cleanup.
Earlier no-publication statements describe the preceding delivery/acceptance
stages. No merge, deployment or subsequent task implementation is authorized.
Reuse the recorded passing checks; only documentation changed after verification.
