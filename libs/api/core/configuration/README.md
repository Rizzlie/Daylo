# API core configuration

This internal NestJS infrastructure library loads and validates Daylo runtime configuration before the API starts.

Google authentication requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and
`GOOGLE_CALLBACK_URL`. The callback must match `FRONTEND_ORIGIN`, use path
`/api/auth/google/callback`, and have no credentials/query/fragment. HTTPS is
required except for loopback HTTP outside production. Errors never echo values.
Offline OpenAPI export skips runtime configuration loading and needs no credentials.

PKCE also requires `OAUTH_PKCE_ENCRYPTION_KEY`: an independent random 32-byte
secret encoded as 64 hex characters. Missing/invalid values prevent startup.
Keep it stable across restarts; rotation rejects in-flight attempts and requires
a fresh Google start, without invalidating existing Daylo sessions. See
[key generation and migration](../../../../docs/google-authentication.md).

Application admission also requires `INITIAL_OWNER_EMAIL`, a valid verified Google
email. Owner configuration is trimmed/lowercased, preserving dots and plus suffixes.

## Running unit tests

Run `npm exec nx -- run api-core-configuration:test` from the workspace root.
