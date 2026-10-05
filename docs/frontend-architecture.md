# Daylo — Frontend Architecture and Library Boundaries

Status: Approved library organization and tag policy, recorded 2026-10-05. Nx and ESLint configuration will be implemented and verified in F01. This document does not authorize scaffolding.

## Organization

Group libraries by business area. Place feature libraries inside a plural `features` directory. That directory is organizational only: each feature beneath it is a separate Nx project.

```text
apps/web/
libs/web/
  core/
    auth/data-access/
    shell/
    preferences/data-access/
  tasks/
    features/today/
    features/task-editor/
    data-access/
    ui/
    domain/
  groups/
    features/groups/
    features/invitations/
    data-access/
    ui/
  settings/
    features/settings/
  shared/
    ui/
    api-client/
libs/shared/
  util-date/
  schemas/
```

This is a target map, not a list of empty projects to generate. Extract libraries only when needed. Framework-independent utilities may live under `libs/shared`; browser-specific utilities remain under `libs/web`. The generated Angular client belongs at `libs/web/shared/api-client`, not in backend or platform-neutral code.

Example: `libs/web/tasks/features/today` has project name `web-tasks-feature-today`, public import `@daylo/web/tasks/features/today`, and tags `platform:web`, `scope:tasks`, `type:feature`. Naming directories `features` does not change the singular `type:feature` tag.

## Library responsibilities

| Type | Responsibility | Allowed target types |
| --- | --- | --- |
| feature | Route, screen, or user workflow; composes UI and state | data-access, ui, domain, util |
| data-access | API orchestration, state, loading/errors, SSE adapters | api-client, domain, util |
| ui | Inputs and events; no HTTP or stores | ui, domain, util |
| domain | Frontend models and pure business rules | domain, util |
| util | Technical helpers without area-specific business rules | util |
| api-client | Generated Angular transport models/services | No Daylo library dependencies |
| app | Bootstrap and route composition | feature, ui, util |

Features do not import other features. Compose routes in the application or publish reusable logic/UI in lower layers. App routing wires feature screens; shell is `type:feature` and does not import routed features. Grouping Today tasks is domain logic; timezone conversion is a technical utility. API transport types stay behind handwritten data-access mapping, so UI does not import the generated client.

`core` and `shared` are scopes, not types. Shell is `scope:core, type:feature`; auth state is `scope:core, type:data-access`. Specific state-management and form-library choices remain separate decisions.

## Required tags

Every Nx project must have exactly one tag from each required dimension:

- `platform`: `web`, `api`, or `shared` (framework-neutral code).
- `scope`: `app`, `core`, `shared`, or an explicitly registered business area, initially `tasks`, `groups`, `settings`; backend also registers `auth` and `users` as documented in `backend-architecture.md`.
- `type`: one of the frontend types above or a documented backend/test type. Backend schemas use a separate `type:contract`; E2E uses `type:e2e`.

`libs/web/shared/ui` is `platform:web, scope:shared, type:ui`. The word shared in its path does not make it platform-neutral. `libs/shared/util-date` is `platform:shared, scope:shared, type:util`. Apps use `scope:app`; feature libraries never use that scope to bypass area boundaries.

Do not apply multiple scope or type tags to make a forbidden import pass. Validate tag presence, cardinality, recognized values, and path-to-tag consistency in a required workspace check. Module-boundary ESLint rules alone do not validate all this metadata.

## Scope and platform policy

- Web may depend on web or platform-neutral libraries; never backend code or Prisma.
- API may depend on API or platform-neutral libraries; never web code.
- Platform-neutral libraries may depend only on platform-neutral libraries.
- Tasks depends on tasks, core, shared; groups on groups, core, shared; settings on settings, core, shared.
- Core depends on core and shared. Shared depends only on shared.
- Application composition can see registered frontend scopes, while type and platform constraints still apply.
- Initially there are no direct cross-business-area dependencies.

Future `finance` follows the same structure (`finance/features/transactions`, etc.) with `scope:finance`. Register its scope and explicit rules when that area is requested; do not create placeholder finance libraries now.

A future finance/tasks feature might need group choices. Do not grant access to the whole groups store merely for that purpose. Either compose a group context through a narrow core contract when justified, or approve a specific read-contract library plus source-and-target constraints. Record the contract and verification examples before changing ESLint. Do not use the global `allow` list or double-tag scopes as an exception mechanism.

## ESLint rule specification

Configure `@nx/enforce-module-boundaries` at error severity in the root flat ESLint config, with no blanket import exceptions, no ignored cycles, and no circular self-imports. The following is the frontend policy fragment, not an executable configuration file. Complete backend and E2E type rules in F01 for the projects actually created.

```json
{
  "allow": [],
  "ignoredCircularDependencies": [],
  "allowCircularSelfDependency": false,
  "depConstraints": [
    { "sourceTag": "platform:web", "onlyDependOnLibsWithTags": ["platform:web", "platform:shared"], "bannedExternalImports": ["@prisma/client", "@prisma/*", "@nestjs/*"] },
    { "sourceTag": "platform:api", "onlyDependOnLibsWithTags": ["platform:api", "platform:shared"] },
    { "sourceTag": "platform:shared", "onlyDependOnLibsWithTags": ["platform:shared"], "bannedExternalImports": ["@angular/*", "@nestjs/*", "@prisma/client", "@prisma/*"] },
    { "allSourceTags": ["platform:web", "type:app"], "onlyDependOnLibsWithTags": ["type:feature", "type:ui", "type:util"] },
    { "allSourceTags": ["platform:web", "type:feature"], "onlyDependOnLibsWithTags": ["type:data-access", "type:ui", "type:domain", "type:util"] },
    { "allSourceTags": ["platform:web", "type:data-access"], "onlyDependOnLibsWithTags": ["type:api-client", "type:domain", "type:util"] },
    { "allSourceTags": ["platform:web", "type:ui"], "onlyDependOnLibsWithTags": ["type:ui", "type:domain", "type:util"] },
    { "sourceTag": "type:domain", "onlyDependOnLibsWithTags": ["type:domain", "type:util"], "bannedExternalImports": ["@angular/*", "@nestjs/*", "@prisma/client", "@prisma/*"] },
    { "sourceTag": "type:util", "onlyDependOnLibsWithTags": ["type:util"] },
    { "sourceTag": "type:api-client", "onlyDependOnLibsWithTags": [] },
    { "allSourceTags": ["platform:web", "scope:tasks"], "onlyDependOnLibsWithTags": ["scope:tasks", "scope:core", "scope:shared"] },
    { "allSourceTags": ["platform:web", "scope:groups"], "onlyDependOnLibsWithTags": ["scope:groups", "scope:core", "scope:shared"] },
    { "allSourceTags": ["platform:web", "scope:settings"], "onlyDependOnLibsWithTags": ["scope:settings", "scope:core", "scope:shared"] },
    { "sourceTag": "scope:core", "onlyDependOnLibsWithTags": ["scope:core", "scope:shared"] },
    { "sourceTag": "scope:shared", "onlyDependOnLibsWithTags": ["scope:shared"] },
    { "allSourceTags": ["platform:web", "scope:app"], "onlyDependOnLibsWithTags": ["scope:core", "scope:tasks", "scope:groups", "scope:settings", "scope:shared"] }
  ]
}
```

All matching constraints apply together (AND); target tags within one allowed list are alternatives (OR). Therefore a feature can import a UI library only if its scope and platform are also permitted. An empty allowed library-tag list intentionally denies workspace dependencies for generated client code; Angular/npm dependencies are not workspace libraries. Verify this behavior against the pinned Nx version.

Keep generated code excluded from handwritten style fixes, but preserve its project tags and boundary policy. Prevent deep cross-library imports with public entrypoints and an explicit import restriction covering subpaths after each public alias. Module tags do not replace deep-import checks. Limit HTTP and EventSource orchestration to data-access (generated HttpClient use is the API-client exception); pure domain/util code must not use browser APIs or transport services.

## F01 verification

Verify with representative temporary fixtures, not only a passing clean application:

| Import | Expected |
| --- | --- |
| tasks feature -> tasks data-access / UI | Allowed |
| tasks UI -> tasks domain | Allowed |
| tasks data-access -> generated web API client | Allowed |
| tasks feature -> core auth data-access | Allowed |
| tasks UI -> tasks data-access | Rejected |
| tasks feature -> groups feature or groups data-access | Rejected |
| future finance feature -> tasks library | Rejected once finance rules are registered |
| web project -> API library or Prisma npm package | Rejected |
| shared utility -> Angular library | Rejected |
| feature -> feature, generated client -> handwritten library | Rejected |
| cyclic project imports or deep private imports | Rejected |
| missing/duplicate/unknown dimension tags | Rejected by metadata validation |

Fixtures need only the dependency graph and imports required to prove the rules; they do not justify scaffolding full product areas in F01. Record lint/check results and ensure CI runs the tag check and lint. Production ESLint configuration and rule execution remain pending until F01.

## References

- [Nx module-boundary rule and constraint semantics](https://nx.dev/docs/kb/enforce-module-boundaries).
- [Nx tag dimensions](https://nx.dev/docs/guides/enforce-module-boundaries/tag-multiple-dimensions).
