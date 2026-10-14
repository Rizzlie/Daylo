# F06-12 — Security dependency review

Parent: F06 · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: Review and bounded remediation proposal agreed on 2026-10-14.
Implementation authorization: Granted on 2026-10-14, with Nx migration first. Delivery status: Implemented, locally verified and owner-accepted on 2026-10-14 with recorded limits.

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
on 2026-10-13. Package remediation was subsequently authorized on 2026-10-14;
major migrations and CI policy changes remain outside scope.

## Delivery and retrospective

### Implementation authorization — 2026-10-14

After reviewing the concrete remediation proposal and verification plan, the owner
replied "ok ale najpierw uzyj nx migrate latest". This authorizes that bounded
remediation, with `npm exec nx migrate latest` first. The command completed,
aligning Nx and direct @nx packages on 23.3.0; no migrations.json was generated
because no migrations apply. Package installation and verification follow.
No commit, PR, deployment or subsequent task is authorized.

The owner agreed to start the review with "tak" on 2026-10-14 after the agent
proposed checking current advisories/reachability before agreeing updates/tests.
This authorizes the review, not dependency changes or CI policy implementation.

The [dependency review](../security/dependency-review-2026-10-14.md) records fresh
full/production/artifact audits, all 30 distinct advisories and 55 affected package
entries, current official sources, reachability groups, compatible candidate
versions, explicit proposed exceptions and verification limits. Existing API
artifact audit reports four entries; no deployed environment was inspected.

Proposed scope: Nest Config 4.0.4 and a separately approved Swagger-scoped js-yaml
5.4.1 override; aligned Angular runtime/tooling 22.2.2, Nx 23.3.0 and Analog 2.8.0;
fresh residual review without Prisma downgrade or unreviewed major migrations.
Acceptance requires clean installation, affected Nx checks, database/auth
regression, generated-contract checks and frontend E2E/browser review as described
in the report. Monthly/pre-release review ownership and exceptions remain proposals.

Review documentation delivered; remediation implementation, verification and owner
acceptance remain pending. No package/lockfile/source changes or Git publication.
Retrospective: separate workspace classifications from runtime artifact exposure,
deduplicate parent findings and verify exploit prerequisites and parent manifests.

### Remediation delivery — 2026-10-14

Implemented the owner-approved updates after Nx migrate latest: Nx 23.3.0,
Angular/runtime/tooling 22.2.2, Analog 2.8.0, Config 4.0.4 and Swagger-scoped
js-yaml 5.4.1. Nx's newly introduced Undici findings were addressed with a
parent-scoped compatible 7.29.1 patch. Prisma and Material/CDK versions are retained.
The [report](../security/dependency-review-2026-10-14.md#authorized-remediation-record--2026-10-14)
records all outcomes, six residual exceptions, broader transitive lockfile changes
and separate recurring-review policy proposal.

Verification passed: final clean install/peer check; 22 lint targets; all 12 test
targets and enabled PostgreSQL transaction checks (357 distinct passing cases);
three migrations on three isolated databases and schema constraints; API/web
production builds; official client generation, compilation and deterministic drift;
22 real-stack desktop/mobile E2E cases. The generated API artifact clean install
and audit passed with zero findings. Full workspace audit remains 36 package
entries representing six unique advisories; omit-dev reports four Prisma-related
entries. No finding was suppressed or unsupported downgrade introduced.

Independent browser layouts/recovery/storage and diagnostics were checked at
1280 x 800 dark and 390 x 844 light. Independent focus-ring verification remains
incomplete (the browser action did not activate :focus-visible); automated solid
outline checks passed. Real Google, hosted CI, deployment and physical-device
checks remain unverified. Existing api:prune fails for its missing source manifest;
the normal build-generated artifact installs cleanly. No prior passing prune
baseline was established and no unrelated packaging rewrite was made.

Owner acceptance of delivery, exceptions and limits is pending. F06 remains
incomplete. No commit/publication or subsequent task is authorized.
Owned verification services/container were removed. Temporary installation folders
remain outside the repo because automatic command review blocked their cleanup;
see the report for exact directory names and the rejection reason.
Retrospective: gate E2E on actual stack readiness, verify retained artifact overrides
and re-audit immediately after migration rather than assuming latest resolves all findings.

### Owner acceptance and publication authorization — 2026-10-14

The owner replied "akcceptuje, mozna pr zrobic", accepting the delivered F06-12
scope with its recorded residual advisories and verification/packaging limits,
and authorizing selective staging, a Conventional Commit on a dedicated task
branch, push and draft PR publication. F06-12 is closed. Acceptance does not turn
unverified checks or deferred findings into passes, enable the proposed recurring
CI policy, or authorize packaging repairs, merge, deployment or the next task.
Parent F06 remains incomplete because F06-09 is deferred until hosting decisions.
