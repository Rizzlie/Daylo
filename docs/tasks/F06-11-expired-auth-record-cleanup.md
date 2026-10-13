# F06-11 — Expired authentication record cleanup

Parent: F06 · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: Planning requested on 2026-10-13; implementation details pending.
Implementation authorization: Not granted. Delivery status: Pending.

## Assumptions and sources

The [auth audit](../security/auth-audit-2026-10-13.md) identifies retained expired
sessions and OAuth cleanup tied to a new login start. Expired credentials already
fail server checks; cleanup controls retention/storage, not authentication validity.
Preserve the seven-day sliding window and 30-day absolute cap from F06-06.

## Scope

- Choose a periodic job/scheduler appropriate to the actual deployment, without
  introducing unrelated infrastructure or speculative modules.
- Remove expired OAuth transactions and sessions past either sliding expiry or
  the absolute cap, including legacy rows whose sliding deadline exceeds that cap.
- Bound deletion batches and run time; add required indexes through Prisma
  migrations if justified. Define retries, metrics and multi-instance coordination.
- Delete only eligible authentication records, never users, invitations or business
  data. Define retention for expired rows explicitly rather than assuming immediate deletion.

## Acceptance criteria

Eligible records are removed within the agreed schedule/retention bounds. Valid
sessions and OAuth attempts survive. Exact cutoff, concurrent renewal/revocation,
callback consumption, repeated runs and multiple workers do not delete protected
records or restore credentials. Failures are retryable and logged without secrets.
Session rejection does not depend on the cleanup job running successfully.

## Verification

Use isolated PostgreSQL fixtures for both expiry types, valid records, boundary
times, concurrency, repeat execution and bounded batches. Apply migrations to an
empty disposable database and inspect query/index behavior. Run appropriate Nx
lint/tests/builds. Browser checks are needed only if user-facing behavior changes;
never run deletion tests against the owner's development/production data.

## Discussion topics and decision record

Agree retention, schedule, batch size, deployment/job ownership, coordination,
metrics and retry policy. The owner requested backlog registration on 2026-10-13;
no job or deletion operation is authorized yet.

## Delivery and retrospective

Documentation registered; implementation, verification and acceptance pending.
Keep cleanup eligibility consistent with authentication and safe under concurrent renewal.
