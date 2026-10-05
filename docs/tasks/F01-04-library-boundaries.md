# F01-04 — Library boundaries

Parent backlog item: **F01** · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: **Completed; scope narrowed by the owner on 2026-10-05.**
Implementation authorization: **Owner confirmed F01-04 and then requested only the built-in Nx ESLint boundary rule.**
Delivery status: **Simplified implementation complete; project lint and production builds verified on 2026-10-05; owner accepted the simplified scope on 2026-10-05.**

## Assumptions and sources

- Reuse the existing Angular, NestJS and Playwright shells and their platform/scope/type tags.
- Sources: [product requirements](../product-requirements.md), [architecture](../architecture.md), [backlog](../backlog.md), [frontend architecture](../frontend-architecture.md) and [backend architecture](../backend-architecture.md).
- No business libraries, application scaffolding, runtime features or dependencies are needed.

## Scope

- Configure only `@nx/enforce-module-boundaries` in the root ESLint configuration.
- Preserve combined frontend/backend platform, scope and type constraints, narrow backend contract exceptions, empty import allowlists and cycle detection.
- Complete external-package restrictions using built-in Nx options.
- Remove the custom `tools/workspace-boundaries` implementation and its workspace targets/configuration.
- Exclude custom rules, metadata validators, syntax adapters and synthetic fixture infrastructure. CI wiring remains F01-05.

## Acceptance criteria

- Existing projects use the built-in Nx rule at error severity through their existing lint targets.
- API projects reject Angular dependencies; utilities reject Angular, NestJS and Prisma dependencies; nested external dependencies are checked.
- Existing platform/scope/type restrictions and backend contract exceptions remain configured.
- No custom boundary tooling or root boundary-check targets remain.
- Lint passes for web, api and web-e2e; production builds pass for web and api.
- Record native-rule limitations without claiming full metadata or negative-scenario verification.

## Verification

- [x] `npm exec nx -- run-many -t lint -p web api web-e2e --skipNxCache`
- [x] `npm exec nx -- run-many -t build -p web api --skipNxCache`
- [x] `git diff --check` and inspect the final diff for custom-tooling references.
- Browser and runtime acceptance checks are inapplicable: this change affects ESLint configuration and documentation only.

## Discussion topics and decision record

- The original discussion included custom metadata and public-entrypoint checks and fixtures.
- The owner explicitly narrowed the implementation: “Let's just use nx boundaries rule in eslint, do not create custom workspace-boundaries”. This supersedes the earlier broader scope.
- Approach: use the existing root rule and project lint targets; remove the custom implementation and restore Nx/package configuration.
- Metadata completeness/cardinality, path consistency, capability-tag ownership and additional canonical-alias validation are outside this delivery. The native rule's import checks remain enabled.
- No unresolved implementation questions. Broader enforcement requires a separately requested scope.

## Scope boundaries

Only this ESLint configuration and related documentation belong to F01-04. Do not start subsequent tasks. Commits, publication and deployment require their own authorization.

## Delivery and review record

- Delivered behavior: retained the existing Nx platform/scope/type policy and added API Angular restrictions, framework-neutral utility restrictions and nested external-import checking. Removed all custom boundary files, rules, fixture harnesses, metadata validation and root workspace targets. No runtime code, libraries or dependencies changed.
- Checks and outcomes: fresh Nx lint passed for web, api and web-e2e; fresh production builds passed for web and api, all with cache skipped. `git diff --check` passed and the final configuration has no custom-tooling references. The sandbox initially denied child-process spawning (`EPERM`); checks succeeded with expanded process permissions. Results from the removed custom fixture harness do not verify this final scope.
- Browser verification: inapplicable; no user-facing change.
- Limitations: project lint exercises the current shells, which contain no business libraries. Representative allowed/rejected library scenarios and metadata validity were not independently verified. Built-in import checks do not establish canonical-alias enforcement or capability ownership. CI wiring remains F01-05.
- Owner acceptance: the owner approved the simplified result on 2026-10-05 and requested a PR using `yeet`. F01 remains incomplete.
- Retrospective: the initial implementation exceeded the owner's desired complexity. Prefer existing Nx capabilities and state their limits before proposing custom enforcement.
