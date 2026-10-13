# Daylo API conventions

Status: Validation established by F04-01; current-session contract and Swagger added in F04-02. Google OIDC transactions and admission are implemented in F06-01/F06-02; F06-03 implements database sessions, sliding renewal, sign-out and CSRF enforcement.

## Public schemas

Zod 4 schemas are the source of truth for public request and response shapes. They remain separate from Prisma models and internal collaboration contracts. Controllers accept DTO classes created from public Zod schemas and declare response DTOs for runtime serialization. Undeclared response properties are removed, and a response that does not satisfy its declared schema fails as an internal server error without returning schema or internal data to the client.

Optional text and wall-clock time fields are represented as `null` in responses when their value is absent or empty. Required text rejects empty or whitespace-only values. Public task times use `HH:mm`; public dates and timestamps use the formats defined in the architecture.

## Error envelope

API errors use this JSON shape:

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": [
    {
      "path": ["title"],
      "code": "too_small",
      "message": "Too small: expected string to have >=1 characters"
    }
  ]
}
```

`details` is present only when field-level validation information is safe and useful. Clients branch on the stable English `code`; they must not depend on the human-readable `message` or a Zod issue message. Feature contracts may add stable uppercase codes while preserving this envelope.

The foundation codes and status semantics are:

| HTTP status | Foundation code | Meaning |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | The request does not satisfy its public schema. |
| 401 | `AUTHENTICATION_REQUIRED` | A valid Daylo session is missing or expired. |
| 403 | `ACCESS_FORBIDDEN` | The authenticated account lacks application access or a mutation fails origin/CSRF checks. |
| 404 | `RESOURCE_NOT_FOUND` | The resource does not exist or is intentionally hidden from this actor. |
| 409 | `VERSION_CONFLICT` | The supplied resource version conflicts with the current version. |
| 429 | `RATE_LIMIT_EXCEEDED` | A per-IP API request budget is exhausted; retry after the indicated delay. |
| 500 | `INTERNAL_SERVER_ERROR` | An unexpected failure occurred, including an invalid declared response. |
| 503 | `SERVICE_UNAVAILABLE` | A required service, such as PostgreSQL readiness, is unavailable. |

## Session cookie and CSRF

`GET /api/auth/google` (`startGoogleAuthentication`) and
`GET /api/auth/google/callback` (`completeGoogleAuthentication`) are browser
navigation, not generated Angular HTTP calls. The ten-minute `__Host-daylo_oauth_browser`
cookie on HTTPS (`daylo_oauth_browser` on local development HTTP) and single-use
state/nonce transaction protect the callback separately from
ordinary mutation CSRF headers. Invalid authentication returns 401
`GOOGLE_AUTHENTICATION_FAILED`; malformed query values return 400. Denied admission
returns 403 `ACCESS_FORBIDDEN` without identity writes. An admitted callback issues
a new session, revokes the previous session cookie presented by that browser, and
redirects to fixed `/today` (active) or `/invitations` (pending). Transport/persistence
failures return safe 503. These frontend screens remain F06-04. See
[Google authentication](google-authentication.md).

Global API rate limiting is implemented by [F06-07](tasks/F06-07-global-api-rate-limiting.md)
using `@nestjs/throttler`. Every API request shares the direct-peer IP's common
budgets of 20 requests per 10 seconds and 120 per 60 seconds across routes.
This includes readiness, Swagger/OpenAPI middleware, OPTIONS and unknown routes.
Google start and callback have separate additional budgets of 5 and 10 per
60 seconds respectively. GET and HEAD navigation share their route budget.
Admission precedes session/database work; public status does not exempt a route.

Rejected API calls return the existing error envelope with HTTP 429,
`RATE_LIMIT_EXCEEDED`, `Retry-After` in integer seconds and `Cache-Control: no-store`.
They do not clear session/OAuth cookies or revoke sessions. Counters use fixed
windows starting with a key's first request; rejected traffic does not extend
the deadline. The single-instance local store holds at most 10,000 hashed
counter keys, expires unused entries periodically and fails closed at capacity.
At capacity, a new key receives 429 with a one-second retry hint for cleanup;
live counters are not evicted. A restart resets counters. Forwarding headers,
cookies and caller-supplied identities cannot select a counter; the local proxy
therefore shares a peer-IP budget. Hosting and shared counters require a separate
deployment decision before running multiple instances.

The opaque session cookie is `__Host-daylo_session` on HTTPS (`daylo_session` on
local development HTTP): 32 random bytes encoded as base64url,
HttpOnly, SameSite=Lax, path `/`, no Domain attribute. It has an Expires deadline
matching the database; Secure is disabled only for loopback HTTP in development.
HTTPS ignores unprefixed legacy credentials. Production cookie migration therefore
requires one new Google sign-in. Cookie clear/set use matching attributes.
PostgreSQL stores only SHA-256 session and CSRF hashes. Authentication tokens are
never stored in browser storage. Ambiguous duplicate, malformed and unknown cookies
cannot authenticate. Missing, expired or revoked sessions return 401
`AUTHENTICATION_REQUIRED` and clear the cookie. Session database failures return
503 without exposing diagnostics.

`GET /api/auth/session` (`getCurrentSession`) returns HTTP 200:

```json
{
  "status": "pending",
  "user": {
    "id": "3eac11b0-884a-4f50-a593-28bd8663387a",
    "email": "session@example.test",
    "displayName": "Synthetic User"
  }
}
```

`status` is `pending` or `active`; there is no anonymous 200 variant. Public
responses exclude Google subjects, hashes and CSRF values. Identity/access status
is read from current persistence, not embedded in the cookie.

Session lifetime is sliding: issuance gives seven days, and successful
`GET /api/auth/session` renews a still-valid session and cookie for seven days from
the request, capped at 30 days from creation. Renewal checks both deadlines atomically
and cannot recreate revoked/deleted sessions. Before the cap it cannot shorten a
previously extended valid deadline; an overlong legacy deadline is clamped to the
absolute limit. Expiry is exclusive: a session at either exact deadline is invalid.
There is no separate refresh token or token rotation. The frontend should call this
endpoint on entry and foreground return. CSRF retrieval, other authenticated
requests, HEAD probes and future background streams do not renew sessions.
F06-04 checks sessions on frontend entry/reload and protected foreground return.
Detected session loss redirects to `/login?error=expired`, whose Polish error
survives reload; normal entry and successful sign-out do not use that error.

`GET /api/auth/csrf` (`getCsrfToken`) returns `{ "csrfToken": "..." }` for a valid
active or pending session. The token is stable for that session and reconstructable
using HMAC-SHA256 keyed by the random session token with the domain-separated
`daylo:session-csrf:v1` label. Its SHA-256 hash is stored in PostgreSQL; neither raw
session nor CSRF tokens are stored there. Stable retrieval avoids invalidating
other tabs or requiring plaintext persistence. Keep CSRF only in frontend memory.

Every unsafe API request requires both:

- `X-CSRF-Token` matching that session's stored CSRF hash (constant-time comparison).
- An exact `Origin` match with configured `FRONTEND_ORIGIN`. Missing, null or
  mismatched Origin is forbidden; no Referer fallback is used. Browsers supply
  Origin automatically; it is documented in prose rather than a generated client
  argument because browser JavaScript cannot set it manually.

Missing/invalid proof returns 403 `ACCESS_FORBIDDEN` without the mutation. Tokens
from another session are invalid. `GET`, `HEAD` and `OPTIONS` do not require mutation
proof. OAuth navigation retains its separate transaction protection.

`POST /api/auth/sign-out` (`signOut`) requires the same CSRF/Origin proof, deletes
only the current session and clears its cookie using matching attributes. It
returns 204 with no body; other device sessions remain valid. Expired/revoked
requests return 401. Failed revocation returns 503 and does not claim success or
clear the still-valid cookie.

A global guard authenticates every Nest business operation by default and requires
active access unless the endpoint explicitly permits pending sessions. Pending
users may read their identity/CSRF, sign out and use future invitation
inspection/resolution operations; they cannot use other business operations.
Readiness and Google navigation are explicitly public. Swagger/OpenAPI remain
public documentation middleware. Use the core identity metadata keys and actor
context; resource authorization remains required in feature use cases.

Authenticated responses and errors use `Cache-Control: no-store`.
Swagger is at `/api/docs`; OpenAPI 3.0 JSON is at `/api/openapi.json`.
The `dayloSession` cookie security scheme names the HTTPS `__Host-daylo_session`; sign-out declares
the required CSRF header. Zod output schemas, official client generation and
source-preserving drift checks remain the contract pipeline.

### Google browser navigation failures

For GET `/api/auth/google` and `/api/auth/google/callback` requests accepting
`text/html`, errors redirect with 302 to the configured frontend origin's fixed
`/login` path. The allowlisted `error` reason is `denied` for 403, `connection`
for infrastructure/server failure, `rate-limit` for quota exhaustion and `failed` for other authentication or query
failures. Redirects carry no provider details, identity, authorization code or
caller-supplied destination. They use no-store and no-referrer headers. Requests
without HTML acceptance retain the documented JSON status/error envelopes.
The frontend maps only known reasons to fixed Polish copy and never renders
arbitrary query text.
HTML quota failures retain `Retry-After` on their 302 redirect. The login screen
provides a fixed Polish rate-limit notice and an explicit retry action without
automatic retries. A rate-limited session check uses this notice, not expiry;
a rate-limited sign-out keeps the protected screen/session available for retry.
