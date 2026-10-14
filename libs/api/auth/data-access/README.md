# api-auth-data-access

Auth-owned persistence for Google OIDC transactions and database sessions. Stores state and
browser-binding hashes, nonce, encrypted PKCE verifier and expiry through the
existing Prisma database module. Encryption belongs to the auth feature; persistence
never receives the plaintext verifier. The nullable ciphertext column accommodates
old records only; production callbacks reject them rather than downgrade to no PKCE.
An atomic PostgreSQL `DELETE ... RETURNING` gives a matching unexpired transaction
to exactly one callback. Starting another attempt only inserts its own row;
the runtime cleanup job removes expired records outside the request path.

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

`AuthRecordCleanupStore` deletes at most 500 rows per transaction, with exact
OAuth/sliding/absolute session cutoffs. Transaction-scoped advisory lock 60611
coordinates cleanup workers; `FOR UPDATE SKIP LOCKED` protects in-flight auth
operations. Database statement and transaction timeouts bound each batch.

The global-deletion integration suite requires `F06_CLEANUP_TEST_DATABASE_URL`
pointing to an **empty dedicated** `daylo_f06_cleanup` or
`daylo_f06_cleanup_*` database. Do not reuse HTTP/regression fixture databases.
Apply migrations first, then run the same Nx test target. The suite uses synthetic
data only and checks boundaries, races, batches, timeouts and index eligibility.
