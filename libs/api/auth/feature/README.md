# api-auth-feature

Owns the current-session HTTP contract. `GET /api/auth/session` currently always
returns the standard 401 `AUTHENTICATION_REQUIRED` envelope, including for requests
with cookies. Actual session lookup, expiry and revocation are implemented in F06.

The documented 200 response exposes `status` (`pending` or `active`) and the user's
`id`, `email` and `displayName`. No provider identifiers, token hashes or CSRF values
are exposed. Pending sessions can read their identity once F06 provides them.

Application-level HTTP serialization and error handling are composed by `apps/api`.
Contract/HTTP tests live in the API application; this library has no empty test target.
