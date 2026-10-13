# F06-08 — PKCE for Google OIDC

Parent: F06 · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: Planning requested on 2026-10-13; implementation details pending.
Implementation authorization: Not granted. Delivery status: Pending.

## Assumptions and sources

The [auth audit](../security/auth-audit-2026-10-13.md) recommends PKCE as additional
protection, without claiming a demonstrated code-injection bypass. Reuse F06-01
OIDC and F06-06 admission/cookie protections, the official Google client, Prisma
and existing Nx targets. Backend-owned sessions remain unchanged.

## Scope

- Generate a fresh verifier/challenge per attempt and use S256 with Google.
- Bind the verifier to the existing browser-bound, expiring OAuth transaction.
  Protect its recoverable server-side storage; a hash alone cannot supply the
  verifier required at exchange. Never place it in browser storage or logs.
- Send the verifier during code exchange. Retain state, nonce, signature/claims
  validation, atomic single-use consumption, timeouts and disabled retries.
- Add only the required migration/configuration and update authentication docs.

## Acceptance criteria

Every start has a transaction-specific S256 challenge; exchange uses its matching
verifier. Missing/mismatched verifier, expired or replayed attempts issue no
session. Concurrent callbacks still allow only one exchange. Verifiers are absent
from public responses, URLs and logs; normal admission and sign-out remain valid.

## Verification

Meaningful signed-token/HTTP tests and isolated PostgreSQL concurrency/expiry
tests; appropriate Nx lint/tests/builds and migration checks. Update contracts
through official generation if affected. Real Google PKCE smoke is recorded
separately from controlled-provider evidence, with browser inspection when available.

## Discussion topics and decision record

Agree verifier storage/encryption or secure derivation, key management/rotation,
old in-flight transaction handling and provider verification before implementation.
The owner requested backlog registration on 2026-10-13; planning alone is authorized.

## Delivery and retrospective

Documentation registered; implementation, verification and acceptance pending.
Keep PKCE additive to existing OIDC defenses and avoid logging exchange secrets.
