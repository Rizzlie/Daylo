# api-users-data-access

Users-owned Prisma implementation of `UserIdentity`. Subject/email advisory locks
serialize sign-in even before the first row exists. Profile writes use the supplied
transaction and preserve UUIDs and missing display names. The module exports only
the identity capability token; it does not decide application admission.
Acceptance coverage runs through `api:test` with the opt-in isolated F06 database
settings documented in `docs/google-authentication.md`.
