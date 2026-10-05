# Daylo — Architecture

Status: Planning baseline, version 1.0.

## 1. System shape

Use a modular monolith: one Angular application, one NestJS application, and PostgreSQL, organized in an integrated Nx workspace. Use npm and commit the dependency lockfile once implementation begins.

```text
apps/
  web/
  api/
  web-e2e/
libs/
  api/
    core/
      database/
      configuration/
    auth/
      feature/
      data-access/
    users/
      feature/
      data-access/
    groups/
      feature/
      data-access/
      domain/
      contracts/
    tasks/
      feature/
      data-access/
      domain/
  shared/
    schemas/
  web/
    core/
    tasks/
      features/
        today/
        task-editor/
      data-access/
      ui/
      domain/
    groups/
      features/
    settings/
      features/
    shared/
      api-client/
      ui/
docs/
AGENTS.md
```

This is the target layout, not a requirement to create every empty library in F01. Add feature libraries when their implementation starts.

See [Backend architecture](backend-architecture.md) for area ownership, internal collaboration contracts, application-root provider wiring, transaction boundaries, post-commit events, and backend-specific library tags. The accepted backend uses one `feature` library per area rather than one library per endpoint.

See [Frontend architecture](frontend-architecture.md) for the approved area-based structure, plural `features` directories, library types, required project tags, and ESLint boundary policy. Each child under `features` is a separate Nx library; `features` itself is not a project.

Applications compose libraries. Enforce dependency rules with Nx project tags and `@nx/enforce-module-boundaries`:

- Web projects cannot depend on backend or database projects.
- Backend projects cannot depend on web projects.
- Shared schemas cannot depend on either platform or on Prisma.
- The generated Angular API client is used through handwritten frontend data-access code.

Use standalone Angular components and keep the initial application client-rendered.

Use Angular Material as the component library. Configure Daylo's light and dark appearance through its supported Sass theming APIs and design tokens. Keep app-specific layout, including the point-based timeline and mobile navigation arrangement, separate from component internals. Do not style private Material DOM structures. See [Today design brief](design-brief.md).

## 2. Google OAuth and application sessions

Use OAuth 2.0 Authorization Code Flow with OpenID Connect, handled by the backend.

1. The browser navigates to `GET /api/auth/google`.
2. The backend creates a short-lived, single-use authentication transaction with random `state` and `nonce`, bound to the initiating browser.
3. Redirect to Google with `openid`, `email`, and `profile` scopes.
4. Google redirects to `GET /api/auth/google/callback`.
5. Validate the authentication transaction, exchange the authorization code on the backend, and verify the ID token's signature, issuer, audience, expiration, nonce, and verified email.
6. Identify the account using Google's stable `sub`; use email for invitation matching.
7. Check initial owner access, existing active access, or a valid pending invitation.
8. Create a Daylo session and redirect to a fixed frontend route appropriate to the user's access status.

The Google client secret remains on the backend. The application does not retain Google access or refresh tokens for this release.

### Session policy

- Store sessions in PostgreSQL.
- Use a cryptographically random opaque token in an `HttpOnly`, `SameSite=Lax`, path `/` cookie.
- Store only the token hash in the database.
- Expire sessions after seven days and revoke them on sign-out.
- Enable secure cookies outside local HTTP development.
- Do not store authentication tokens in browser storage.
- Protect state-changing API requests using a session-bound CSRF token and allowed-origin checks.
- OAuth `state` and browser binding protect the sign-in transaction; do not apply ordinary mutation-header requirements to the Google redirect callback.

A pending user's session can only inspect and resolve invitations, read their session identity, and sign out. Accepting the first valid invitation activates normal application access. Invitation acceptance and membership creation use one transaction.

## 3. Persistence model

Use Prisma for PostgreSQL access and versioned migrations. Never expose Prisma models directly as API responses.

All entities use UUID identifiers. Audit timestamps are UTC instants.

| Entity | Main fields |
| --- | --- |
| User | googleSubject, email, displayName, accessStatus, createdAt |
| UserPreferences | userId, theme, playfulGreetingsEnabled |
| Session | userId, tokenHash, csrfTokenHash, expiresAt |
| OAuthTransaction | stateHash, browserBindingHash, nonce, expiresAt |
| Group | name, ownerId, createdAt |
| Membership | groupId, userId, joinedAt |
| Invitation | groupId, email, invitedById, status, expiresAt, resolvedAt |
| Task | createdById, groupId, title, description, scheduledDate, scheduledTime, completedAt, completedById, version, createdAt, updatedAt |

Constraints and behavior:

- `googleSubject` and session token hashes are unique.
- Membership is unique per group and user.
- A task with no `groupId` is personal and owned by its creator.
- A task with a `groupId` is accessible to current members of that group.
- Group task visibility is immutable in the MVP.
- Invitations expire after seven days and have pending, accepted, rejected, or cancelled status. Expiration is checked on access.
- The owner can cancel or replace pending invitations.
- Accepting an invitation is idempotent and cannot create duplicate membership.
- Completing a task records `completedAt` and `completedById`; reopening clears both.
- Task dates use PostgreSQL date values; optional times are wall-clock times. The MVP interprets both in `Europe/Warsaw`.
- Task updates use optimistic concurrency with an incrementing version.

## 4. Schemas and API contracts

Use Zod 4 schemas as the source of truth for public request and response shapes. Prisma schema remains the source of truth for persistence.

```text
Zod schemas
    -> NestJS DTOs and runtime validation
    -> Swagger / OpenAPI specification
    -> Generated Angular models and services
```

Integrate through `nestjs-zod`:

- `createZodDto` creates NestJS DTOs.
- `ZodValidationPipe` validates inputs.
- `ZodSerializerInterceptor` validates declared response schemas.
- `cleanupOpenApiDoc` processes the Swagger document.

Public contracts use transport-friendly strings: dates as `YYYY-MM-DD`, times as `HH:mm`, and timestamps as ISO 8601 UTC strings. Empty optional text/time values are normalized to null in responses. Map database values explicitly.

Keep runtime business rules that cannot be represented in OpenAPI in backend services and tests. Do not generate public schemas directly from all Prisma fields.

## 5. REST API and Swagger

Expose REST endpoints under `/api`. Provide Swagger UI at `/api/docs` and OpenAPI JSON at `/api/openapi.json`.

| Area | Operations |
| --- | --- |
| Authentication | Google redirect and callback, current session, CSRF token, sign-out |
| Preferences | Read and update appearance and greeting preferences |
| Groups | Create and list accessible groups, list members |
| Invitations | Create, list, cancel, accept, reject |
| Tasks | List Today data, create, edit, delete, complete, reopen |
| Updates | Open an authenticated SSE stream |
| Health | Readiness check including database availability |

Each operation declares a stable English `operationId`, tag, request/response schemas, status codes, and authentication requirements.

Start with OpenAPI 3.0 for client compatibility. Document cookie authentication and the CSRF header. OAuth navigation uses browser redirects, not generated HTTP service calls.

### Authorization and errors

- Only the configured application owner creates groups and manages invitations.
- Active users manage personal tasks and tasks of groups they belong to.
- Invitation resolution requires the authenticated account's matching verified email.
- Check resource access on every request, including event subscriptions.
- Return 400 for invalid input, 401 for missing/expired sessions, 403 for insufficient application access, 404 for inaccessible resource identifiers, and 409 for conflicting task versions.
- Return stable English error codes; the frontend maps them to Polish UI messages.
- Do not let users set ownership or completion actor fields.

## 6. Generated Angular client

Use OpenAPI Generator with `typescript-angular`. Pin the generator version and configure `ngVersion` to match the frontend version selected during F01.

```text
Backend schemas and controllers
    -> Export OpenAPI without starting HTTP or requiring a live database
    -> Validate the specification
    -> Generate Angular models and services
    -> Compile the frontend
```

Commit the specification and generated client. Never edit generated files manually. Keep handwritten state management and orchestration outside the generated directory.

Nx targets own export and generation. CI regenerates into temporary locations and fails if artifacts differ, without rewriting source files during verification. Stable output must exclude timestamps and machine-specific paths.

## 7. Today data and shared updates

The backend uses its clock and `Europe/Warsaw` to return accessible tasks needed for Today, overdue, and completed sections. The frontend applies the grouping and ordering described in product requirements.

Use SSE for updates. A handwritten `EventSource` adapter handles streaming; generated services handle REST requests.

- Publish invalidation events after successful database commits.
- Deliver personal updates only to the owner and group updates only to authorized members.
- Receiving an event triggers a reload of affected task data.
- Reload on reconnection, foreground return, and local midnight.
- Close expired or revoked session streams.
- A failed connection shows a retry state.
- The MVP has one backend instance; use an in-process publisher.

Version conflicts trigger data reload and a clear message; do not overwrite another user's changes silently.

## 8. Local configuration and verification

Angular proxies `/api` to NestJS. PostgreSQL runs through Docker Compose. Configuration includes database URL, Google client ID and secret, OAuth callback URL, frontend origin, initial owner email, and environment mode.

Document configuration in `.env.example` during implementation; keep secrets out of version control. Use a separate database and configuration for automated tests.

Frontend E2E uses Playwright with Nx. It runs the real frontend, backend, and database while replacing only Google as an external provider. See [backlog and verification](backlog.md) for mandatory scenarios and agent browser checks.

## References

- [Nx module boundaries](https://nx.dev/docs/features/enforce-module-boundaries)
- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
- [nestjs-zod](https://github.com/BenLorantfy/nestjs-zod)
- [NestJS Swagger](https://docs.nestjs.com/openapi/introduction)
- [Angular OpenAPI Generator](https://openapi-generator.tech/docs/generators/typescript-angular/)
- [NestJS SSE](https://docs.nestjs.com/techniques/server-sent-events)
- [Angular Material theming](https://material.angular.dev/guide/theming)
