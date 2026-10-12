# Generated Daylo Angular API client

Internal, non-buildable Nx library with public import `@daylo/web/shared/api-client`.
Only frontend data-access libraries consume this transport client.

`src/generated` contains unmodified TypeScript output from OpenAPI Generator
7.26.0. Do not edit it manually. Handwritten integration stays outside that
directory. Nx configuration and generation scripts are maintained by Daylo.

From the workspace root:

```powershell
npm exec nx -- run web-shared-api-client:generate
npm exec nx -- run web-shared-api-client:check
npm exec nx -- run web-shared-api-client:test
npm exec nx -- run web-shared-api-client:typecheck
npm exec nx -- run web-shared-api-client:lint
```

Generation requires Docker with Linux containers and first exports and validates
the specification. `check` uses temporary output, verifies two identical generations
and reports drift without rewriting sources. Both `web:build` and CI enforce drift
checking and client compilation. Frontend builds also require Docker. Do not run
generation and checking concurrently. Configure `provideHttpClient()` and
`provideApi('')` in future frontend integration
for same-origin `/api` requests. Authentication and CSRF wiring remain F06.

See the root [README](../../../../README.md#openapi-and-generated-angular-client).
