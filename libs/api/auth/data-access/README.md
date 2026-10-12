# api-auth-data-access

Auth-owned persistence for short-lived Google OIDC transactions. Stores state and
browser-binding hashes, nonce and expiry through the existing Prisma database module.
An atomic PostgreSQL `DELETE ... RETURNING` gives a matching unexpired transaction
to exactly one callback. Starting another attempt removes expired transaction rows.

## Running unit tests

Run `npm exec nx -- run api-auth-data-access:test --skipNxCache`. PostgreSQL cases
are opt-in via `RUN_F06_DATABASE_INTEGRATION=true` and `F06_TEST_DATABASE_URL`.
The database name must start with `daylo_f06_`; never use the development database.
See [verification setup](../../../../docs/google-authentication.md).
