# Daylo — Frontend Architecture and Library Boundaries

Status: Approved architecture direction, recorded 2026-10-05. F01-04 is limited by owner instruction to the built-in Nx ESLint boundary rule. Custom metadata validation and additional canonical-entrypoint checks are outside that delivery; the requirements below describe the architecture policy. This document does not authorize scaffolding.

## Organization

Group libraries by business area. Place feature libraries inside a plural `features` directory. That directory is organizational only: each feature beneath it is a separate Nx project.

```text
apps/web/
libs/web/
  core/
    auth/data-access/
    shell/
    preferences/data-access/
  auth/
    features/login/
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
    util-router/
libs/shared/
  util-date/
  schemas/
```

This is a target map, not a list of empty projects to generate. Extract libraries only when needed. Framework-independent utilities may live under `libs/shared`; browser-specific utilities remain under `libs/web`. The generated Angular client belongs at `libs/web/shared/api-client`, not in backend or platform-neutral code.

Example: `libs/web/tasks/features/today` has project name `web-tasks-feature-today`, public import `@daylo/web/tasks/features/today`, and tags `platform:web`, `scope:tasks`, `type:feature`. Naming directories `features` does not change the singular `type:feature` tag.

## Library responsibilities

| Type        | Responsibility                                         | Allowed target types                                                      |
| ----------- | ------------------------------------------------------ | ------------------------------------------------------------------------- |
| feature     | Route, screen, or user workflow; composes UI and state | data-access, ui, domain, util                                             |
| data-access | API orchestration, state, loading/errors, SSE adapters | api-client, domain, util                                                  |
| ui          | Inputs and events; no HTTP or stores                   | ui, domain, util                                                          |
| domain      | Frontend models and pure business rules                | domain, util                                                              |
| util        | Technical helpers without area-specific business rules | util                                                                      |
| api-client  | Generated Angular transport models/services            | No Daylo library dependencies                                             |
| app         | Bootstrap and route composition                        | feature, ui, util; the explicit auth-bootstrap capability described below |

Features do not import other features. Compose routes in the application or publish reusable logic/UI in lower layers. App routing wires feature screens; shell is `type:feature` and does not import routed features. Grouping Today tasks is domain logic; timezone conversion is a technical utility. API transport types stay behind handwritten data-access mapping, so UI does not import the generated client.

`core` and `shared` are scopes, not types. Shell is `scope:core, type:feature`; auth state is `scope:core, type:data-access`. Specific state-management and form-library choices remain separate decisions.

The login page is `scope:auth, type:feature` at `libs/web/auth/features/login`.
Application routing composes and lazily loads login and the protected responsive
shell. The shell exposes a child router outlet. `Today` lives in
`libs/web/tasks/features/today` and `Invitations` in
`libs/web/groups/features/invitations`; application routing lazily loads each
through its public entrypoint. Today now includes the M01-02 minimal personal-task
list and local create/edit/delete dialogs; full Today grouping remains in M02.
Invitations retains its existing page frame and session-based greeting, with
invitation actions pending. The core shell does not import these pages or the
login feature. Prefer separate named signals in
templates over a combined `vm` or view model, as requested by the owner.

`libs/web/tasks/data-access` owns generated personal-task API calls, explicit
presentation mapping and cursor-page resource state. Today provides its list
state locally; the shared editor stays inside that feature because creation and
editing are one local workflow. No separate task-editor feature is required for
this slice, and no feature-to-feature dependency is introduced. Signal Forms own
the draft and validation; computed signals derive dialog state. Imperative code
is confined to user actions, request outcomes, Material dialog lifecycle and
keyboard focus restoration. Conflicts require an explicit current-version read
and comparison before retry; the draft remains intact.

`libs/web/core/configuration/data-access` reads the generated public configuration
endpoint once through `provideAppInitializer` before bootstrap completes, then
exposes a frozen plain value through `DAYLO_CONFIG`. The editor injects the token
directly. The HTTP cache uses ETag with mandatory revalidation on page loads;
startup failure leaves a persistent error/reload action without a local fallback.
The native startup DOM is the boundary for that pre-Angular error handling.
The `capability:configuration-bootstrap` tag permits app bootstrap to import this
provider, following the narrow authentication-bootstrap exception; general
app-to-data-access restrictions remain enforced. `libs/shared/util-date` supplies framework-independent
`todayInTimeZone(timeZone, now?)`; both frontend and backend use it. The backend
alone owns the validated `DAYLO_TIME_ZONE` environment default. Reload the browser
after restarting the API with changed installation configuration.

`libs/web/shared/ui` exposes `AppLayout`, the presentational Daylo application
frame built with Angular Material. It owns responsive geometry, branding and
navigation presentation, accepts navigation visibility, collapsed state, a
skip-link target and an account template, and emits a sidebar-toggle request.
The core shell owns session state, collapse persistence, sign-out feedback and
the child router outlet. It passes the account template and projects screen
content into the layout. Shared UI does not import authentication state,
data-access libraries or storage services. Reusable components are added here
when needed; design tokens and Material theming remain the design-system
foundation, without a second component-library project.

Session-loading presentation belongs to `AuthenticatedShell`, not individual
feature pages. The guard awaits the initial session result; later revalidation
shows one shell status and hides routed content without unmounting the outlet,
preserving local page state. Features own loading of their business data only.

`libs/web/shared/util-router` provides `injectQueryParamMap()` for reactive route
query parameters and `injectRouteData()` for static/resolved route data, both
with a snapshot initial value. Web-specific technical utilities
may use Angular. Platform-neutral utilities and all domain libraries remain
framework-independent; utilities do not orchestrate HTTP or business state.

## Authentication composition and route loading

Reusable session guards, authentication providers and authentication redirect rules
belong to `libs/web/core/auth/data-access`, not the shell. Its public entrypoint
exports `authGuard`, `loginGuard`, `provideAuthentication` and
`getAuthRedirectUrl`. Application bootstrap imports the provider directly from
auth; shell must not proxy or rename that provider.

`authGuard` defaults to active application access and allows an active user to
stay on any requested permitted route, including nested/parameterized routes.
Route data `authAccess: 'pending'` restricts the invitation entry to pending
sessions; `'authenticated'` permits either session status for an explicitly
eligible route. Backend resource authorization remains authoritative.
`getAuthRedirectUrl` returns an authentication-related redirect or `null` when
the requested route may remain. Guards and screen event handling share those
rules; the function does not perform navigation or session retrieval.

The application also registers `provideAuthSessionLifecycle()` once beside the
authentication and router providers. Its root auth service owns foreground
revalidation and loss/sign-out redirects independently of UI components. Shell
only renders session data and invokes sign-out. Protected routes/groups explicitly
declare `data.authAccess`; the nearest active primary-route policy applies.
Public/unmarked routes do not renew on foreground return or replace login notices.
Navigation in progress and sign-out suppress foreground checks, and a response
for a route that has changed cannot redirect the new screen.

The auth data-access project alone carries `capability:auth-bootstrap`.
The web app type rule allows that capability alongside ordinary feature/UI/util
dependencies, so bootstrap and route composition can import auth directly.
Configuration has the separately scoped bootstrap capability described above.
Other data-access libraries are not generally allowed for app imports. Existing
platform and scope constraints still apply, with no global `allow` exception.
This is a library-level exception, not symbol-level enforcement; application
code should use it for authentication configuration and guards rather than API
orchestration.

All routed components use `loadComponent`; feature route groups use
`loadChildren` where appropriate. Do not statically import a routed component
through a route table or library entrypoint. The bootstrapped application root
is not a routed component. This owner-approved rule also applies to login and
empty route screens.

## Required tags

Every Nx project must have exactly one tag from each required dimension:

- `platform`: `web`, `api`, or `shared` (framework-neutral code).
- `scope`: `app`, `core`, `shared`, or an explicitly registered business area, initially `auth`, `tasks`, `groups`, `settings`; backend also registers `users` as documented in `backend-architecture.md`.
- `type`: one of the frontend types above or a documented backend/test type. Backend schemas use a separate `type:contract`; E2E uses `type:e2e`.

`libs/web/shared/ui` is `platform:web, scope:shared, type:ui`. The word shared in its path does not make it platform-neutral. `libs/shared/util-date` is `platform:shared, scope:shared, type:util`. Apps use `scope:app`; feature libraries never use that scope to bypass area boundaries.

Do not apply multiple scope or type tags to make a forbidden import pass. Validate tag presence, cardinality, recognized values, and path-to-tag consistency in a required workspace check. Module-boundary ESLint rules alone do not validate all this metadata.

## Scope and platform policy

- Web may depend on web or platform-neutral libraries; never backend code or Prisma.
- API may depend on API or platform-neutral libraries; never web code.
- Platform-neutral libraries may depend only on platform-neutral libraries.
- Auth depends on auth, core, shared; tasks on tasks, core, shared; groups on groups, core, shared; settings on settings, core, shared.
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
    {
      "sourceTag": "platform:web",
      "onlyDependOnLibsWithTags": ["platform:web", "platform:shared"],
      "bannedExternalImports": ["@prisma/client", "@prisma/*", "@nestjs/*"]
    },
    {
      "sourceTag": "platform:api",
      "onlyDependOnLibsWithTags": ["platform:api", "platform:shared"]
    },
    {
      "sourceTag": "platform:shared",
      "onlyDependOnLibsWithTags": ["platform:shared"],
      "bannedExternalImports": ["@angular/*", "@nestjs/*", "@prisma/client", "@prisma/*"]
    },
    {
      "allSourceTags": ["platform:web", "type:app"],
      "onlyDependOnLibsWithTags": [
        "type:feature",
        "type:ui",
        "type:util",
        "capability:auth-bootstrap",
        "capability:configuration-bootstrap"
      ]
    },
    {
      "allSourceTags": ["platform:web", "type:feature"],
      "onlyDependOnLibsWithTags": ["type:data-access", "type:ui", "type:domain", "type:util"]
    },
    {
      "allSourceTags": ["platform:web", "type:data-access"],
      "onlyDependOnLibsWithTags": ["type:api-client", "type:domain", "type:util"]
    },
    {
      "allSourceTags": ["platform:web", "type:ui"],
      "onlyDependOnLibsWithTags": ["type:ui", "type:domain", "type:util"]
    },
    {
      "sourceTag": "type:domain",
      "onlyDependOnLibsWithTags": ["type:domain", "type:util"],
      "bannedExternalImports": ["@angular/*", "@nestjs/*", "@prisma/client", "@prisma/*"]
    },
    {
      "sourceTag": "type:util",
      "onlyDependOnLibsWithTags": ["type:util"],
      "bannedExternalImports": ["@nestjs/*", "@prisma/client", "@prisma/*"]
    },
    { "sourceTag": "type:api-client", "onlyDependOnLibsWithTags": [] },
    {
      "allSourceTags": ["platform:web", "scope:tasks"],
      "onlyDependOnLibsWithTags": ["scope:tasks", "scope:core", "scope:shared"]
    },
    {
      "allSourceTags": ["platform:web", "scope:auth"],
      "onlyDependOnLibsWithTags": ["scope:auth", "scope:core", "scope:shared"]
    },
    {
      "allSourceTags": ["platform:web", "scope:groups"],
      "onlyDependOnLibsWithTags": ["scope:groups", "scope:core", "scope:shared"]
    },
    {
      "allSourceTags": ["platform:web", "scope:settings"],
      "onlyDependOnLibsWithTags": ["scope:settings", "scope:core", "scope:shared"]
    },
    { "sourceTag": "scope:core", "onlyDependOnLibsWithTags": ["scope:core", "scope:shared"] },
    { "sourceTag": "scope:shared", "onlyDependOnLibsWithTags": ["scope:shared"] },
    {
      "allSourceTags": ["platform:web", "scope:app"],
      "onlyDependOnLibsWithTags": [
        "scope:core",
        "scope:auth",
        "scope:tasks",
        "scope:groups",
        "scope:settings",
        "scope:shared"
      ]
    }
  ]
}
```

All matching constraints apply together (AND); target tags within one allowed list are alternatives (OR). Therefore a feature can import a UI library only if its scope and platform are also permitted. An empty allowed library-tag list intentionally denies workspace dependencies for generated client code; Angular/npm dependencies are not workspace libraries. Verify this behavior against the pinned Nx version.

Keep generated code excluded from handwritten style fixes, but preserve its project tags and boundary policy. Prevent deep cross-library imports with public entrypoints and an explicit import restriction covering subpaths after each public alias. Module tags do not replace deep-import checks. Limit HTTP and EventSource orchestration to data-access (generated HttpClient use is the API-client exception); pure domain/util code must not use browser APIs or transport services.

## F01 verification

Verify with representative temporary fixtures, not only a passing clean application:

| Import                                                      | Expected                                   |
| ----------------------------------------------------------- | ------------------------------------------ |
| tasks feature -> tasks data-access / UI                     | Allowed                                    |
| tasks UI -> tasks domain                                    | Allowed                                    |
| tasks data-access -> generated web API client               | Allowed                                    |
| tasks feature -> core auth data-access                      | Allowed                                    |
| tasks UI -> tasks data-access                               | Rejected                                   |
| tasks feature -> groups feature or groups data-access       | Rejected                                   |
| future finance feature -> tasks library                     | Rejected once finance rules are registered |
| web project -> API library or Prisma npm package            | Rejected                                   |
| shared utility -> Angular library                           | Rejected                                   |
| feature -> feature, generated client -> handwritten library | Rejected                                   |
| cyclic project imports or deep private imports              | Rejected                                   |
| missing/duplicate/unknown dimension tags                    | Rejected by metadata validation            |

Fixtures need only the dependency graph and imports required to prove the rules; they do not justify scaffolding full product areas in F01. Record lint/check results and ensure CI runs the tag check and lint. Production ESLint configuration and rule execution remain pending until F01.

## References

- [Nx module-boundary rule and constraint semantics](https://nx.dev/docs/kb/enforce-module-boundaries).
- [Nx tag dimensions](https://nx.dev/docs/guides/enforce-module-boundaries/tag-multiple-dimensions).
