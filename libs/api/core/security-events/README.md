# API security events

Non-buildable Nx infrastructure library, shared by the auth feature and API HTTP
filter. Import through `@daylo/api/core/security-events`. Nest deduplicates its
module so auth, controller filters and documentation admission share one writer
and one output budget. No database, file store or external service is added.

```powershell
npm exec nx -- run api-core-security-events:test
npm exec nx -- run api-core-security-events:lint
```

See [Security logging](../../../../docs/security/security-logging.md) for event
semantics, privacy, output limits and deployment responsibilities.
