# api-auth-feature

Owns Google OIDC transactions, application-admission orchestration, database
sessions, current identity, sliding renewal, CSRF and revoking sign-out.

`GET /api/auth/google` creates a ten-minute hashed browser-bound transaction and
redirects to Google. The callback consumes the transaction before provider exchange,
verifies the signed identity and passes admission through Users/Groups contracts
wired at the application root. Denied identities receive safe 403 without profile
writes. Admitted identities receive a new opaque `daylo_session` cookie and a fixed
`/today` or `/invitations` redirect. No Google tokens are retained.

`GET /api/auth/session` returns current `pending`/`active` identity and renews a
still-valid session/cookie for seven days. Expired/revoked sessions return 401 and
cannot be renewed. Other requests and HEAD probes do not renew. There is no absolute
lifetime cap, refresh token or token rotation in this scope.

`GET /api/auth/csrf` returns the stable session-bound CSRF value without renewal.
Unsafe operations require `X-CSRF-Token` and exact frontend Origin.
`POST /api/auth/sign-out` revokes only the current session and clears its cookie,
returning 204. The global guard authenticates business endpoints by default and
restricts pending users to explicit identity/CSRF/sign-out/invitation exceptions.
Public exceptions and actor metadata use the core identity contracts.

Application-level HTTP serialization and safe errors are composed by `apps/api`.
HTTP acceptance tests live there, including real PostgreSQL sessions and signed
Google callback cases. Test controllers and provider fixtures never enter runtime
modules. Full frontend authentication remains F06-04; real Google smoke is F06-05.
See [configuration and verification](../../../../docs/google-authentication.md) and
[API conventions](../../../../docs/api-conventions.md).
