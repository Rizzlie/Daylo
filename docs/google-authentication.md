# Google authentication

F06-01 implements Google OIDC transactions; F06-02 adds application admission and
user identity persistence. F06-03 adds Daylo sessions and CSRF; frontend
authentication states and the real Google smoke check belong to F06-04/F06-05.

## Local Google client

Create a project in Google Cloud Console, configure Google Auth Platform branding
and External audience, and create a Web application OAuth client. Keep the local
project in Testing. Register this exact authorized redirect URI:

```text
http://localhost:4200/api/auth/google/callback
```

Keep the client credentials in ignored `.env.local` (loaded before `.env`) or `.env`:

```dotenv
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:4200/api/auth/google/callback
INITIAL_OWNER_EMAIL=owner@example.test
OAUTH_PKCE_ENCRYPTION_KEY=your-independent-64-hex-character-key
```

Never commit real credentials. API startup validates these values alongside the
existing runtime settings. Callback origin must equal `FRONTEND_ORIGIN`; path must
be `/api/auth/google/callback`, without credentials, query or fragment. Only loopback
HTTP is permitted outside production; production requires HTTPS. Offline OpenAPI
export does not load this configuration, connect to PostgreSQL or contact Google.

Google references: [Auth Platform setup](https://support.google.com/cloud/answer/15544987?hl=en),
[OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect).

F06-08 requires an independent 32-byte secret encoded as 64 hexadecimal characters
in `OAUTH_PKCE_ENCRYPTION_KEY`. Generate it locally and put it only in ignored
configuration or the deployment secret store; never reuse the Google client secret:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
npm exec nx -- run api-core-database:prisma-migrate-deploy
```

Apply the migration using the intended database's `DATABASE_URL`, then restart the
API with the new configuration. Missing or malformed keys prevent startup without
echoing the key. Keep the key stable across restarts. To rotate, replace it and
restart the API; every in-flight OAuth attempt must start again. No old-key ring is
retained, and established Daylo sessions are unaffected. Attempts started before
the PKCE migration also require a fresh start. Back up and restrict access to this
secret separately from database backups.

## Runtime behavior

Start the existing PostgreSQL service and API/frontend Nx serve targets. If `PORT`
from the API environment is picked up by Angular, set `$env:PORT = '4200'` in the
frontend terminal before `npm exec nx -- run web:serve --port=4200`.
Navigate
the browser to `http://localhost:4200/api/auth/google`. Angular proxies the request
and callback to NestJS; use the same host throughout the flow.

F06-07 protects all API requests with common per-peer-IP budgets of 120/minute
and 20/10 seconds. Google start additionally allows 5/minute; callback has its
own 10/minute budget. The local proxy shares an IP counter. A rejected HTML
navigation returns to `/login?error=rate-limit` with the fixed recovery notice;
JSON callers receive 429 and `Retry-After`. Rejection neither creates an OAuth
transaction nor clears an existing binding/session cookie. Wait for recovery
and retry explicitly. See [API conventions](api-conventions.md).

The backend requests `openid email profile`, online access, random state and nonce.
The ten-minute browser-binding cookie is named `__Host-daylo_oauth_browser` on
HTTPS: Secure, HttpOnly, SameSite=Lax, Path=/, without Domain. Loopback development
HTTP retains `daylo_oauth_browser` with path `/api/auth/google` and no Secure.
HTTPS never reads an unprefixed binding cookie. Each start replaces this cookie; only the
latest attempt in the same browser can complete. Persist only SHA-256 hashes of
state/binding, plus nonce, expiry and an encrypted PKCE verifier, using the existing
`OAuthTransaction` model. Each attempt has an independent 32-byte random base64url
verifier. The Google authorization URL contains its SHA-256 base64url challenge and
`code_challenge_method=S256`, never the verifier. AES-256-GCM uses a fresh 12-byte
IV; associated data binds ciphertext to the state hash, browser-binding hash and
nonce. The versioned ciphertext includes its authentication tag. Plaintext verifiers
exist only transiently in backend memory and in the backend-to-Google token request;
they are never placed in URLs, browser storage, public responses or logs.
Expired rows are removed on the next start.

Callback consumes a matching unexpired transaction atomically before code exchange.
The same atomic delete returns nonce and ciphertext; decryption/validation precedes
the official client's token exchange with `codeVerifier`. Missing, malformed,
tampered, swapped or old-key records fail safely after consumption, with no session
or provider exchange. Google rejects a verifier that does not match its challenge.
Replay and concurrent callbacks cannot exchange the code again. Browser/state
mismatch does not consume another browser's valid transaction. Provider refusal,
missing code and failed token validation terminate the matching attempt. Malformed
query shapes are rejected by Zod before the callback use case runs. Callback clears
the binding cookie using the same cookie attributes.

The pinned official `google-auth-library` 11.2.0 exchanges the code and verifies the
RS256 signature against Google's cached public certificates, issuer and audience.
Daylo additionally requires numeric issue/expiry dates, a currently unexpired token,
matching nonce, stable nonempty subject, valid verified email and matching `azp`
when present. Future issue/not-before dates allow at most 60 seconds of clock skew.
Provider requests have a ten-second timeout and no automatic retries. No Google
tokens are retained in the OAuth client, database, cookies or responses. Provider
diagnostics are not logged or returned because they can include tokens.

Both routes use `Cache-Control: no-store` and `Referrer-Policy: no-referrer`. Client
supplied redirect targets are ignored. OAuth navigation is a browser redirect,
not a call through the generated Angular HTTP service. No ordinary mutation CSRF
header is required for the callback; state, binding and nonce protect it.

| Callback outcome | HTTP behavior |
| --- | --- |
| Admitted Google identity | Persist/refresh the user, issue a hashed Daylo session and HttpOnly cookie, then 302 to fixed `/today` (active) or `/invitations` (pending) |
| Verified outsider, ineligible invitation or email identity collision | 403 `ACCESS_FORBIDDEN`, `Access forbidden`; no identity writes or session |
| Invalid/expired/replayed transaction, provider refusal, rejected token | 401 `GOOGLE_AUTHENTICATION_FAILED`, safe generic message |
| Malformed query | 400 `VALIDATION_ERROR` |
| Database/provider transport unavailable | 503 `SERVICE_UNAVAILABLE`, no infrastructure diagnostics |

`GET /api/auth/session` returns the admitted identity and renews a still-valid
session and cookie for seven days from that request, capped at 30 days from session
creation. Seven days without renewal or reaching that absolute cap requires Google
sign-in again. Expired/revoked sessions cannot be renewed. No refresh token or
session-token rotation is implemented. See
[API conventions](api-conventions.md#session-cookie-and-csrf).

Global API rate limiting and stricter OAuth quotas are implemented and accepted
in [F06-07](tasks/F06-07-global-api-rate-limiting.md).

## Identity and admission

`INITIAL_OWNER_EMAIL` is required at API startup. Owner configuration and verified
Google emails are trimmed and lowercased; dots and plus suffixes are preserved.
Google subject is the stable identity key. New email-based admission requires
Google authority: Gmail, or a verified email with a signed Workspace `hd` claim.
An external email without that authority is denied for first owner admission and
invitation-based access, even with `email_verified: true`. An already active user
can continue signing in by its stored Google subject without new email authority.
This is the owner's F06-06 choice; independent mailbox verification is not added.
A matching email belonging to another
subject is denied even for the configured owner; accounts are never linked by email.

The owner receives active access. Existing active users keep access after a verified
email change. Other accounts, including existing pending users, require at least one
matching pending invitation with expiry strictly later than the admission check.
Expired, accepted, rejected, cancelled and wrong-email invitations do not admit them.
Admission grants pending access without resolving invitations or creating membership.
Invitation management and explicit acceptance/rejection remain M03.

Admitted sign-in refreshes email and a supplied Google display name. A missing name
preserves an existing name; new accounts use the email local part, bounded to 200
characters. Avatars and provider tokens are not persisted. Denied sign-in leaves
existing profiles unchanged and creates no user.

Auth orchestrates one database transaction through the narrow Users and Groups
contracts wired at the application root. Users serializes incoming subject/email
keys with PostgreSQL transaction-scoped advisory locks in a fixed order, including
first sign-in before a user row exists. Under the existing read-committed transaction
runner, a waiting attempt reads the previous committed identity before deciding.
The Groups admission query holds an eligible invitation with `FOR SHARE` through
commit. Unique subject/email constraints remain the final database safeguards.
Future profile writers must use the same identity-lock protocol; future invitation
resolution remains a separately authorized transaction use case.

## Verification

Ordinary HTTP tests replace only Google's external transport with synthetic signed
tokens and certificates. There is no runtime environment flag for a controlled
provider. They exercise the real verifier, use cases, HTTP cookies, Zod and error
filter; the ordinary transaction-store fixture is complemented by real PostgreSQL
tests. They do not prove that real Google credentials/sign-in work.

```powershell
npm exec nx -- run-many -t lint test -p api api-auth-feature api-auth-data-access api-core-configuration --skipNxCache
npm exec nx -- run api:build --skipNxCache
npm run api:generate
npm exec nx -- run web-shared-api-client:check
```

For PostgreSQL acceptance checks, create a fresh isolated database whose name starts
with `daylo_f06_` and apply migrations using the existing target. Use its actual
local connection URL (the following credentials are synthetic development examples):

```powershell
$env:DATABASE_URL = 'postgresql://daylo:daylo-local@localhost:5433/daylo_f06_verification'
npm exec nx -- run api-core-database:prisma-migrate-deploy --skipNxCache
$env:F06_TEST_DATABASE_URL = $env:DATABASE_URL
$env:RUN_F06_DATABASE_INTEGRATION = 'true'
npm exec nx -- run-many -t test -p api api-auth-data-access --skipNxCache
Remove-Item Env:RUN_F06_DATABASE_INTEGRATION
Remove-Item Env:F06_TEST_DATABASE_URL
Remove-Item Env:DATABASE_URL
```

The opt-in suites verify persisted transactions, browser mismatch, expiry, eight
concurrent repository/HTTP callbacks, replay, DI wiring, admission/profile behavior,
exact invitation expiry and denied writes. Admission-service tests assert that
admission alone does not issue sessions; successful callback HTTP tests now check
session creation and fixed active/pending redirects. Session suites cover sliding
renewal, expiry/revocation, concurrent sign-out/renewal, CSRF/origin rejection and
pending restrictions with both a policy fixture and the production PostgreSQL
adapter. Concurrent
admission covers one subject, conflicting subjects claiming one email, and profile
changes. Signed-token HTTP cases cover owner, invitee, active user and outsider.
They delete only their own synthetic records. Remove the isolated database
after verification. Ordinary CI skips these database suites unless explicitly set up;
full real-stack authentication browser fixtures remain F07.
