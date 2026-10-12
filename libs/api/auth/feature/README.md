# api-auth-feature

Owns the Google OIDC transaction flow and current-session HTTP contract. `GET /api/auth/session` currently always
returns the standard 401 `AUTHENTICATION_REQUIRED` envelope, including for requests
with cookies. Actual session lookup, expiry and revocation are implemented in F06.

The documented 200 response exposes `status` (`pending` or `active`) and the user's
`id`, `email` and `displayName`. No provider identifiers, token hashes or CSRF values
are exposed. Pending sessions can read their identity once F06 provides them.

Application-level HTTP serialization and error handling are composed by `apps/api`.
Contract/HTTP tests live in the API application; this library has no empty test target.

`GET /api/auth/google` creates a ten-minute hashed browser-bound transaction and
redirects to Google. `GET /api/auth/google/callback` consumes the matching transaction
before provider exchange and verifies the Google signature, issuer, audience, token
dates, nonce and verified email. The production module has no test-provider switch;
tests control only the injected Google client's external transport.

Successful provider verification passes application admission through Users and
Groups contracts wired by `ApiAuthFeatureModule.register` at the application root.
Denied identities return safe HTTP 403 without profile writes. Admitted identities
are persisted/refreshed, then receive safe HTTP 503 until F06-03 provides sessions.
No identity or provider token is exposed; provider tokens are never persisted.
See [configuration and verification](../../../../docs/google-authentication.md).
