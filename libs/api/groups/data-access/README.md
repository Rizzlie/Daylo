# api-groups-data-access

Groups-owned invitation admission query. Requires pending status, exact normalized
email and `expiresAt > now`, and holds the selected invite with `FOR SHARE` through
the supplied transaction. It never resolves invitations or creates membership.
The module exports only the invitation admission token. PostgreSQL acceptance
coverage belongs to `api:test`; see `docs/google-authentication.md`.
