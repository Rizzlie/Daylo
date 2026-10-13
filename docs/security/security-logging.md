# Security event logging

F06-10 provides local, best-effort structured events on the API process's stdout.
Run the API through its existing Nx serve target; security events appear as JSON
lines alongside ordinary Nest startup diagnostics. Ordinary diagnostics retain
their existing format; this is not a global access logger. No dependency,
database table, file store or permanent local history is added.

## Schema and correlation

Each event has `schemaVersion: 1`, UTC ISO `timestamp`, `level` (`info` or `warn`),
fixed `event` and `reason`. HTTP events have a backend-generated UUID `requestId`.
The same request object retains the same ID across rejection and failure events;
another request gets a fresh ID. Incoming correlation headers are ignored. IDs
are not OAuth transaction IDs and do not correlate different login requests.
Internal service calls without an HTTP request omit `requestId`.

An internal `actorUserId` UUID is included only for a resolved admitted user or
authenticated session. Denied Google admission does not fabricate a user ID.
No email, display name, Google subject, IP, URL, query, request header/body,
cookie, authorization code, state, nonce, browser binding, PKCE verifier/ciphertext,
session/CSRF token or credential hash is serialized. Only explicitly constructed
fields and runtime-allowlisted codes enter the writer; arbitrary extra fields,
reason codes and non-UUID actor values are discarded.

Example with synthetic identifiers:

```json
{"schemaVersion":1,"timestamp":"2026-10-13T10:00:00.000Z","level":"info","event":"login_succeeded","reason":"authenticated","requestId":"594d7a35-a651-4a1b-b181-411149cb8630","actorUserId":"92d44272-7ad0-4238-9bcb-aa23f59a8672"}
```

## Events and outcomes

| Event | Fixed reasons | Emission point |
| --- | --- | --- |
| `login_succeeded` | `authenticated` | Admitted callback after session persistence succeeds and the cookie is set |
| `login_failed` | `invalid_callback`, `admission_denied`, `infrastructure_unavailable`, `unexpected_failure` | Failed Google start/callback in the HTTP filter, before fixed JSON/HTML recovery |
| `callback_rejected` | `invalid_query`, `invalid_binding`, `invalid_expired_or_replayed_transaction`, `provider_declined`, `missing_code`, `invalid_pkce` | Rejected query, browser/state binding, consumed transaction or PKCE recovery |
| `admission_denied` | `not_admitted`, `pending_access` | Google admission returns 403, or an authenticated pending user requests an active-only route |
| `csrf_rejected` | `invalid_origin`, `invalid_proof`, `invalid_binding` | Valid session fails mutation Origin/proof verification or CSRF retrieval binding |
| `session_revoked` | `sign_out` | Explicit sign-out after persistence revocation succeeds, before cookie clearing |
| `rate_limit_rejected` | `quota_exceeded` | Actual HTTP 429 admission, including Swagger/OpenAPI middleware and preflight |

Invalid/expired/replayed transaction lookup returns the same safe reason because
the repository cannot distinguish these cases without retaining extra state.
Token/provider verification errors emit `login_failed:invalid_callback`; raw
provider diagnostics are never logged. A rejected callback can also emit one
`login_failed` with the same request ID. A quota rejection emits only the quota
event, even when HTML recovery turns the client-visible response into 302.
Normal anonymous checks do not generate login-failure events. Session renewal,
expiry checks and replacement of a presented cookie are not sign-out events.
This scope does not implement account-wide revocation or durable auditing.

Application HTTP error diagnostics now use fixed messages without arbitrary
exception stacks or serialization/provider details. There is no application
request/access logger that serializes callback query strings. This does not
establish redaction in a future host, reverse proxy or external log collector.

## Bounded output and failure handling

One shared API-process recorder allows up to 20 detail events per event/reason
pair and 120 total JSON lines per 60-second window, including suppression
summaries. The first event after a window expires starts a new window. There is
no per-IP/request/user counter and no timer or queue. Counter keys are drawn
from the finite event/reason allowlist; accumulated counts saturate safely.
Restart resets these in-memory counters.

Suppressed detail counts are retained in bounded memory. On the next active
window, an available writer emits `security_events_suppressed` with fixed reason
`output_bounded_or_unavailable` and aggregate `event:reason` counts. It contains
no request/user identifiers. Summaries indicate incomplete detail evidence,
not a complete authentication audit. If the output remains unavailable, counts
remain bounded until a later active window or process restart.

When stdout signals backpressure, the accepted line may remain in Node's own
stream buffer; further security writes are dropped until drain. The recorder
does not add a retry queue. Closed streams are skipped. Synchronous write errors,
write-callback errors and stdout `error` events disable this sink until API
restart. Logging cannot undo a committed operation or add an error to the API
response; errors are not recursively logged. Stdout behavior itself depends on
the runtime destination and may be synchronous; this is not a nonblocking or
durable-delivery guarantee. Ordinary Nest/tooling output has its existing behavior.

## Local operation and hosting follow-up

Locally, the developer viewing the API terminal sees these lines. Redirecting or
collecting stdout is an operator choice; this task does not create saved log files.
Without collection there is no persistent history or local retention period.
Treat user UUIDs as restricted operational data even though direct identity and
network details are omitted.

Before hosting, explicitly decide the collector, authorized operators, retention
duration/deletion, secure transport/storage and any export policy. Configure
proxy/access logs to omit callback query strings, OAuth redirect `Location` and
authentication headers/cookies; test with synthetic sentinels at the actual
serving paths. None of those hosted controls is claimed as verified here.

An operator can filter JSON by `schemaVersion` and `event`, group failures by the
fixed reason, and inspect suppression summaries for lost detail. Sustained
`infrastructure_unavailable` calls for checking service availability; repeated
callback/admission/CSRF/quota rejections call for reviewing abuse and configuration.
Avoid inferring attack attribution from anonymous events, since IPs are absent.
Automated alert thresholds, aggregation intervals, destinations and response
ownership require hosting decisions and are deferred; no alerts, notifications
or third-party observability integration are enabled by this task.
