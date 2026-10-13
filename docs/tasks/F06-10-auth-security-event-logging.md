# F06-10 — Authentication security event logging

Parent: F06 · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: Scope agreed on 2026-10-13.
Implementation authorization: Granted on 2026-10-13.
Delivery status: Implemented, locally verified and owner-accepted on 2026-10-13.

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

Implementation and local verification are complete for the agreed stdout scope.
Owner accepted the delivered local scope on 2026-10-13.
Hosted collection/retention/access/alerts remain pending.

### Agreed scope and authorization — 2026-10-13

The owner accepted the proposed JSON stdout destination with "okej" and then
requested implementation with "okej, do it". Implement F06-10 only, sequentially;
no publication, deployment or subsequent task is authorized. F06-09 is deferred
until hosting decisions, before public exposure.

- Emit login success/failure, admission denial, invalid callback (including
  expired/replayed transactions), CSRF rejection, explicit sign-out revocation
  and API rate-limit rejection. Use fixed English event/reason codes.
- Include UTC time and backend-generated per-request correlation, never trust
  incoming correlation headers. Include an internal user UUID only after verified
  identity/session resolution. Do not record emails, IPs, Google subjects,
  request bodies/headers/query strings, cookies, credentials or provider diagnostics.
- Reuse existing NestJS modules and add only the concrete shared infrastructure
  needed by auth and global API admission. No external service or dependency.
- Write one JSON line per event to API stdout. No database/file log store or
  permanent history is provided locally. Hosting owns collection, retention and
  access controls; proxy/access-log callback query redaction and deployed alerts
  remain deployment checks, not claims of this local task.
- Bound repeated events and total output with fixed in-memory counters; summarize
  suppressed events without personal/request data. Drop writes during stdout
  backpressure; isolate synchronous and asynchronous sink failures from auth.
- Replace arbitrary exception stack diagnostics in the application HTTP filter
  with fixed safe diagnostics so they cannot bypass event redaction.
- Verify actual HTTP outcomes, post-commit events, replay/CSRF/rate rejection,
  synthetic-secret non-disclosure, bounded bursts and logger failure. Run relevant
  Nx lint/tests/builds and contract drift checks. User-facing behavior is unchanged;
  browser inspection is required if implementation changes that behavior.
- Automatic alerts and hosting configuration are deferred. Document how to consume
  events and limitations; do not invent a retention duration without a collector.

### Delivery and verification — 2026-10-13

Implemented shared non-buildable `api-core-security-events` infrastructure through
the official `@nx/js:library` generator, using existing NestJS and Node APIs and no
new dependencies. Auth and HTTP filters share its provider and bounded counters.
Success follows session persistence/cookie issuance; sign-out follows successful
revocation. Admission, callback/PKCE/query, CSRF and quota failures emit fixed codes;
HTML recovery retains its existing behavior. Normal anonymous checks remain quiet.

JSON stdout records use versioned allowlisted fields, UTC timestamps, backend
request UUIDs and resolved internal user UUIDs only. No request/exception dump is
serialized. Fixed generic HTTP diagnostics replace arbitrary exception stacks.
Limits are 20 detail lines per event/reason and 120 total lines per 60-second
window. Bounded aggregate suppression counts are summarized in the next active
window when output is available. No background timer, retry queue, log database,
saved log file, external collector or automatic alert is introduced. Backpressure
drops further writes until drain; synchronous, callback and stream-error failures
disable the sink until restart without affecting auth outcomes.

Checks and outcomes:

- Fresh Nx `api:test`: **215 passed**, all isolated PostgreSQL variants enabled.
  This includes new HTTP post-persistence/safe-replay, admission/query redaction,
  CSRF/committed sign-out, failed revocation and logger-failure cases, plus existing
  signed-provider/PKCE/concurrency/session/admission/quota regressions. Tests capture
  secret sentinels and verify suppression does not expose provider diagnostics.
  Final API verification followed additional pending/Swagger/provider assertions
  and required logger injection; this was a concrete change, not stability reruns.
- Fresh Nx `api-core-security-events:test`: **10 passed**, covering JSON privacy,
  same/different-request correlation, runtime allowlists/actor filtering, a
  10,000-event burst, total limits including summaries, backpressure recovery,
  synchronous/callback/stream failures and shutdown listener cleanup.
- Fresh Nx lint for `api`, `api-auth-feature`, `api-core-security-events`: passed.
  Ten pre-existing API test non-null-assertion warnings remain; no new warnings.
- Final Nx API production build passed. Source-preserving client `check` passed:
  OpenAPI validated, two official generations identical, committed artifacts
  unchanged. Generated Angular client `typecheck` passed. No public contract,
  frontend source, package dependency or schema/migration changed.
- Both existing migrations applied successfully to owned disposable PostgreSQL 17
  database `daylo_f06_10_logging` on port 5441. No owner database/configuration was
  modified. Real stdout JSON emission was observed in the enabled PostgreSQL HTTP
  suite; captured cases verify sensitive query/cookie/proof/provider values absent.
  The labeled owned verification container was removed after the final checks;
  the existing `daylo-postgres` development container remains running on port 5433.
- `git diff --check` passed. Nx formatting was attempted but no formatter is
  configured; files follow existing conventions and passed lint. No formatter
  dependency was added for this task.

Browser inspection and frontend E2E: not applicable to this backend-only diagnostic
change, which adds no UI or HTTP response behavior. Existing HTTP recovery/admission
regressions passed. No fresh real Google sign-in, hosting/proxy log inspection,
collector retention/access enforcement, alerts or hosted CI is claimed. These
deployment checks remain incomplete under the agreed scope.

See [Security logging](../security/security-logging.md) for operational semantics,
event codes, best-effort delivery and the hosting checklist. F06-10 awaits owner
acceptance; parent F06 remains incomplete. No commit, push, PR or next task is
authorized by this delivery.

Retrospective: the generator proposed an unrelated Vitest plugin and root ESLint
formatting; those changes were removed, preserving existing workspace policy.
Keep callback lookup reasons honest (invalid/expired/replayed are indistinguishable),
log after committed outcomes, and bound diagnostics independently of request/user
cardinality. Defer durable audit/retention claims until a collector is selected.

### Owner acceptance — 2026-10-13

The owner accepted the delivered F06-10 scope with "lgtm". This closes the agreed
implementation and local verification scope. Earlier pending-acceptance statements
describe delivery before this acceptance. Hosted collection, retention/access,
proxy redaction, alerts and hosted CI remain unverified/deferred as recorded.
Parent F06 remains incomplete. Acceptance does not authorize commit, publication
or subsequent implementation. Documentation only changed; no checks were rerun.

### Publication authorization — 2026-10-13

After accepting F06-10, the owner requested "wystaw teraz pR". This authorizes
selective staging, a Conventional Commit on `feat/f06-10-auth-security-events`,
push and a draft PR targeting the repository default branch. The PR includes
the accepted implementation, verification/acceptance documentation and the agreed
F06-09 deferral record. Earlier no-publication statements describe prior stages.
Reuse recorded checks: only documentation changed after final verification.
No merge, deployment or subsequent implementation is authorized.
