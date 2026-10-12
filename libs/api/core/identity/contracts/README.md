# api-core-identity-contracts

Framework-independent request actor types and metadata keys for the global Auth
session guard. Use `SetMetadata(PUBLIC_ENDPOINT, true)` only for explicitly public
operations, and `SetMetadata(ALLOW_PENDING_SESSION, true)` only for identity,
CSRF, sign-out and invitation inspection/resolution. Other operations require
active application access by default. These flags do not replace resource-level
authorization or mutation CSRF checks.
