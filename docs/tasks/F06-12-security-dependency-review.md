# F06-12 — Security dependency review

Parent: F06 · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: Planning requested on 2026-10-13; implementation details pending.
Implementation authorization: Not granted. Delivery status: Pending.

## Assumptions and sources

The [auth audit](../security/auth-audit-2026-10-13.md) separates registry advisory
severity from exploitable application paths. Its snapshot is dated; obtain current
official advisories and inspect actual runtime/build artifacts before deciding
updates. Preserve Angular/Nest compatibility, PostgreSQL/Prisma and generated clients.

## Scope

- Inventory production and development dependencies, pinned/resolved versions,
  advisory conditions and reachable runtime/tooling paths. Distinguish duplicate
  transitive entries, unavailable features and production deployment exposure.
- Prioritize reachable high-impact vulnerabilities, then supported patch/minor
  updates. Agree any necessary major migration or temporary mitigation separately.
- Use package-manager commands and keep lockfile/peer dependencies consistent;
  do not blindly run `npm audit fix --force` or accept suggested major downgrades.
- Record each advisory's updated/fixed, mitigated, inapplicable or deferred status
  with evidence and remaining risk. Do not suppress findings solely to get a clean count.
- Define an appropriate recurring advisory-review process without adding noisy
  CI gates or external automation before its policy is agreed.

## Acceptance criteria

Every identified advisory has a current source and reachability assessment.
Approved updates/mitigations address their intended conditions without breaking
framework peers, authentication, migrations, contracts or UI. Deferred findings
have explicit reasons and follow-up. Lockfile installation is reproducible; no
unsupported downgrade or unreviewed major upgrade is introduced.

## Verification

Compare fresh advisory reports and official affected/fixed ranges, inspect deployed
artifact paths and validate a clean lockfile installation. Run affected Nx lint,
meaningful tests, builds, OpenAPI/client drift and isolated database checks as
required by the changed packages. Framework/browser changes require actual UI
inspection and relevant real-stack E2E; do not claim exploitability from scanner counts.

## Discussion topics and decision record

Agree update scope, compatibility constraints, reachability model, major upgrades,
exceptions and recurring review ownership. The owner requested backlog registration
on 2026-10-13; package changes and CI policy are not yet authorized.

## Delivery and retrospective

Documentation registered; implementation, verification and acceptance pending.
Base remediation on advisory conditions and supported versions rather than a scanner's automatic fix.
