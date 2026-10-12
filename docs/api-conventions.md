# Daylo API conventions

Status: Validation established by F04-01; current-session contract and Swagger added in F04-02. Google OIDC transactions are implemented in F06-01; Daylo admission/session enforcement remains F06-02/F06-03.

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
| 500 | `INTERNAL_SERVER_ERROR` | An unexpected failure occurred, including an invalid declared response. |
| 503 | `SERVICE_UNAVAILABLE` | A required service, such as PostgreSQL readiness, is unavailable. |

## Session cookie and CSRF

`GET /api/auth/google` (`startGoogleAuthentication`) is browser navigation: it sets
the ten-minute `daylo_oauth_browser` binding cookie and redirects to Google.
`GET /api/auth/google/callback` (`completeGoogleAuthentication`) consumes a
browser-bound single-use transaction and validates Google's ID token. Invalid
authentication returns the standard error envelope with HTTP 401 and code
`GOOGLE_AUTHENTICATION_FAILED`; malformed query values return 400. Until F06-03
connects admission/session completion, valid verification returns safe HTTP 503
`SERVICE_UNAVAILABLE` without creating a user/session or exposing identity.
Provider/database transport failure also returns safe 503. These navigation
operations are documented in OpenAPI but must not be called through Angular's
generated HTTP services. See [Google authentication](google-authentication.md)
for configuration, transaction policy and verification.

`GET /api/auth/session` (`getCurrentSession`) returns HTTP 401 with the standard
`AUTHENTICATION_REQUIRED` envelope when a session is missing, expired or revoked.
Until F06 implements actual session lookup, every request to this endpoint returns
401, including requests containing a cookie. It never fabricates authenticated access.

The declared HTTP 200 response is:

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

`status` is `pending` or `active`. Both states may read their session identity;
pending access does not grant access to group tasks or personal task creation.
There is no anonymous 200 variant. Provider subjects, token hashes and CSRF values
are excluded. Session responses use `Cache-Control: no-store`.

Swagger UI is available at `/api/docs`, with OpenAPI 3.0 JSON at
`/api/openapi.json`. The document uses `nestjs-zod` output schemas and
`cleanupOpenApiDoc`. Cookie authentication requirements are described in prose;
the concrete cookie security scheme and CSRF header await their names in F06-03.
OpenAPI export and Angular client generation belong to F05.

Authenticated API requests use the backend-owned opaque session cookie described in the architecture. The cookie is `HttpOnly`, `SameSite=Lax`, scoped to `/`, expires after seven days, and is secure outside local HTTP development. Authentication tokens are never stored in browser storage.

Every state-changing API request must pass an allowed-origin check and provide the session-bound CSRF value through the documented request header. Missing or invalid CSRF proof is forbidden. The Google OAuth redirect callback uses its browser-bound, single-use state transaction instead of the ordinary mutation header. F06-03 will define the cookie name, CSRF exchange endpoint and header name and will implement these checks.
