# Daylo API conventions

Status: Foundation established by F04-01. Authentication enforcement is implemented in F06.

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

Authenticated API requests use the backend-owned opaque session cookie described in the architecture. The cookie is `HttpOnly`, `SameSite=Lax`, scoped to `/`, expires after seven days, and is secure outside local HTTP development. Authentication tokens are never stored in browser storage.

Every state-changing API request must pass an allowed-origin check and provide the session-bound CSRF value through the documented request header. Missing or invalid CSRF proof is forbidden. The Google OAuth redirect callback uses its browser-bound, single-use state transaction instead of the ordinary mutation header. F06-03 will define the cookie name, CSRF exchange endpoint and header name and will implement these checks.
