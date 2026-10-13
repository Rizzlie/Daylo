# api-auth-data-access

Auth-owned persistence for Google OIDC transactions and database sessions. Stores state and
browser-binding hashes, nonce and expiry through the existing Prisma database module.
An atomic PostgreSQL `DELETE ... RETURNING` gives a matching unexpired transaction
to exactly one callback. Starting another attempt removes expired transaction rows.

`SessionStore` stores only opaque-token and CSRF hashes. Lookup checks sliding and
30-day absolute expiry using the existing creation timestamp, and
projects current user identity/access. Renewal uses atomic PostgreSQL
`UPDATE ... RETURNING` with exclusive expiry checks and a monotonic deadline capped
at session creation plus 30 days;
revocation deletes the row and cannot be undone by renewal. Session replacement
revokes the presented previous browser session and creates the new one in a single
transaction. Session HTTP policy and PostgreSQL acceptance cases run in `api:test`.

## Running unit tests

Run `npm exec nx -- run api-auth-data-access:test --skipNxCache`. PostgreSQL cases
are opt-in via `RUN_F06_DATABASE_INTEGRATION=true` and `F06_TEST_DATABASE_URL`.
The database name must start with `daylo_f06_`; never use the development database.
See [verification setup](../../../../docs/google-authentication.md).
