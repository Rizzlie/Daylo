# API core configuration

This internal NestJS infrastructure library loads and validates Daylo runtime configuration before the API starts.

Google authentication requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and
`GOOGLE_CALLBACK_URL`. The callback must match `FRONTEND_ORIGIN`, use path
`/api/auth/google/callback`, and have no credentials/query/fragment. HTTPS is
required except for loopback HTTP outside production. Errors never echo values.
Offline OpenAPI export skips runtime configuration loading and needs no credentials.

## Running unit tests

Run `npm exec nx -- run api-core-configuration:test` from the workspace root.
