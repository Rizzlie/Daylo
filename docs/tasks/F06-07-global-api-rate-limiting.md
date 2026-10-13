# F06-07 — Global API rate limiting

Parent backlog item: F06 · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: Requested for planning on 2026-10-13; implementation details pending.
Implementation authorization: Not granted. Delivery status: Pending.

## Assumptions and sources

- The owner requested a separate backlog task for global API protection, then
  explicitly requested removal of the auth-only throttler while this task remains
  pending. AUTH-03 in the [auth audit](../security/auth-audit-2026-10-13.md) remains open.
- Use the supported NestJS `@nestjs/throttler` module/guard from the
  [official guidance](https://docs.nestjs.com/security/rate-limiting), with existing
  Nx boundaries, Zod contracts and backend-owned sessions.
- Depends on the F06 authentication implementation. Review current API composition,
  runtime deployment/proxy assumptions, architecture and contracts before implementation.

## Scope

- Configure a baseline limit centrally for the API, covering authenticated and
  public controller routes by default, including authentication routes.
- Retain stricter route-specific policies for OAuth and other expensive operations
  through supported overrides, rather than independent auth-owned infrastructure.
- Apply baseline rejection before session/database/provider work where feasible;
  prevent repeated unauthorized traffic from exhausting persistence.
- Define trustworthy client tracking and bounded storage. Never trust arbitrary
  forwarding headers, raw cookies or caller-supplied identity as a trusted tracker.
- Choose in-memory versus shared counters according to the agreed deployment
  model; describe restart and multi-instance behavior. Configure trusted proxy
  hops explicitly and consider edge/global budgets for distributed abuse.
- Define narrow monitoring/preflight exceptions and an explicit policy for Swagger,
  OpenAPI and middleware endpoints; a Nest guard alone does not cover middleware.
- Return consistent 429 errors and Retry-After; specify browser-navigation recovery,
  no-store behavior and safe/redacted diagnostics. Update OpenAPI and regenerate
  the Angular client through existing targets.

No implementation, Redis provisioning, deployment, commits or dependency upgrades
are authorized by this planning task. Resource authorization remains mandatory and
must not be replaced by rate limiting.

## Acceptance criteria

- A newly added controller route is protected by default without adding its own
  rate-limit guard. Public and authenticated API routes are demonstrably covered.
- OAuth and expensive-route overrides are enforced while normal entry, session
  refresh, CSRF, sign-out and expected application traffic remain usable.
- Over-limit requests produce 429 with Retry-After and the agreed safe contract;
  rejected requests do not enter protected session/database/provider operations.
- Forged forwarding headers cannot bypass counters. Client isolation, concurrent
  requests, quota recovery and storage bounds match the agreed policy.
- Exceptions and middleware coverage are explicit and tested. Multiple instances
  cannot silently multiply a deployment-wide quota when shared protection is required.

## Verification

- Meaningful real HTTP tests for ordinary/public/authenticated routes, stricter
  overrides, automatic protection of a new fixture route, rejection before costly
  work, forwarded-header spoofing, recovery and parallel requests.
- Verify counter sharing/atomicity for the chosen deployment/storage model, using
  isolated synthetic infrastructure where needed rather than the owner's database.
- Appropriate Nx lint/tests/builds, OpenAPI validation, official generation and
  client drift checks. Browser/E2E scenarios exercise actual auth recovery and
  ordinary navigation under limits, including desktop/mobile where UI changes.
- No destructive production load tests. Record deployment, real-provider or
  browser checks that are unavailable as incomplete.

## Discussion topics

Agree baseline/route budgets, tracker policy, expected legitimate traffic, proxy
topology, instance count, storage, monitoring/preflight/middleware exceptions and
Polish browser recovery for 429 before implementation.

## Decision record

The owner requested "dodaj zadanie w backlogu zeby dodac globalnie" on 2026-10-13.
This authorizes planning only. Rate values and implementation approach remain to
be agreed; the removed auth-only limits are not implicitly approved global defaults.

## Delivery record

Documentation added to the backlog and task index. Application implementation,
verification and owner acceptance are pending.

## Retrospective

Own common API abuse protection at application composition, with explicit feature
overrides. Keep a deferred security finding open when its temporary mitigation
is removed; do not confuse backlog registration with delivery.
