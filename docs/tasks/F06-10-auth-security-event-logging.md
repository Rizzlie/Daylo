# F06-10 — Authentication security event logging

Parent: F06 · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: Planning requested on 2026-10-13; implementation details pending.
Implementation authorization: Not granted. Delivery status: Pending.

## Assumptions and sources

The [auth audit](../security/auth-audit-2026-10-13.md) recommends structured,
redacted security events. Reuse current auth and logging infrastructure; no new
event database, observability service or data retention duration is assumed.
Integrate rate-limit events with F06-07 when available.

## Scope

- Define stable events for login success/failure, admission denial, invalid/replayed
  callback, rejected CSRF, session revocation and rate-limit rejection.
- Include timestamps, safe reason codes and justified correlation/actor identifiers.
  Minimize personal data and choose whether IP data is necessary.
- Exclude raw cookies, token/hash credentials, OAuth codes, state/binding secrets,
  verifiers, CSRF proof and provider diagnostics. Redact callback query strings
  in application and proxy/access logs as well as custom events.
- Define log destination, access controls, retention and bounded volume; logging
  failures must not undo committed security operations or leak details to clients.
- Specify useful failure-spike alerts and operational handling without creating
  infrastructure or contacting external services without separate authorization.

## Acceptance criteria

Expected transitions emit the correct event after their actual outcome. Secret
sentinel values do not appear in any tested log path. Correlation is useful without
excess personal data. Failure bursts are bounded; logging failures preserve safe
auth behavior. Retention/access and alert behavior are documented and verified
where the selected infrastructure is available.

## Verification

HTTP/provider/session tests capture logs for success, denial, replay, CSRF,
revocation and logging failure. Use synthetic secret sentinels and include access
log redaction. Run affected Nx checks; validate the selected sink/alerts separately.
Browser checks are required only where user-facing behavior changes.

## Discussion topics and decision record

Agree event schema, identifiers/IP policy, sink, retention, access, sampling and
alert thresholds. The owner requested backlog registration on 2026-10-13;
implementation and external observability setup remain unauthorized.

## Delivery and retrospective

Documentation registered; implementation, verification and acceptance pending.
Log security outcomes with fixed reason codes rather than dumping requests/errors.
