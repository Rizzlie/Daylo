# M05-02 — Responsive shell and Daylo identity

Parent backlog item: **M05** · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: **Completed — scope agreed with the owner on 2026-10-14.**
Implementation authorization: **Granted by the owner on 2026-10-14 for the agreed scope.**
Delivery status: Closed — implemented, locally verified and owner-accepted on 2026-10-15 with the recorded verification limits.

## Assumptions and sources

- Use the accepted design sources, normalized tokens and supported Angular Material theming APIs. Global theme delivery is already recorded; Polish UI, accessible controls and responsive navigation remain required.
- Dependencies: F07. Confirm their delivered and verified behavior before dependent work.
- Read [product requirements](../product-requirements.md), [architecture](../architecture.md) and [backlog](../backlog.md). Apply the relevant [frontend](../frontend-architecture.md), [backend](../backend-architecture.md) and [design-system](../design/design-system.md) rules.
- This is a proposed bounded task. Inspect discoverable implementation facts; resolve material product decisions with the owner during the discussion.

## Work to perform

- [x] Build responsive shell with approved Daylo SVG/wordmark, expanded/collapsed sidebar, bottom settings/account and mobile `Dzisiaj`, `Grupy`, `Ustawienia` navigation.
- [x] Extract the SVG from the [original logo source](../design/daylo_logo_mark/code.html); preserve original exports.
- [x] Compose existing Today/invitation routes through a shared layout; future feature routes remain deferred to their tasks.

## Acceptance criteria

The work above must satisfy this task-specific observable outcome:

Both themes; widths 360/390/768/1024/1440; sidebar states, keyboard labels/tooltips, 44 px targets, zoom, safe-area clearance and no overflow. Avatar uses agreed profile contract/initials fallback, never hardcoded identity.

The owner must confirm the final criteria during discussion. Applicable checks must pass, evidence and limitations must be recorded, and no blocking defect may remain. Implementation, verification and owner acceptance are tracked separately.

## Verification plan

- [x] Both themes; widths 360/390/768/1024/1440; sidebar states, keyboard labels/tooltips, 44 px targets, CSS 200% zoom smoke, computed safe-area clearance and no overflow. Native browser zoom and physical device cutouts remain unverified.
- [x] Avatar uses session-derived initials under the agreed current contract, never hardcoded identity.

- Inspect available Nx targets and use project generators/targets where applicable; select exact commands after inspection rather than inventing flags.
- Run affected lint, meaningful tests and production builds. For API contract changes, export/validate OpenAPI, regenerate the Angular client and check drift.
- For user-facing changes, run applicable real-stack Playwright scenarios and independently inspect the running UI through an available browser tool at relevant desktop/mobile widths, including keyboard behavior and console/network errors where supported.
- Use synthetic data and keep secrets, authentication state, reports, screenshots and traces out of version control.
- Record unavailable checks as incomplete. For review/manual-only tasks, mark inapplicable automated checks with a reason; do not rerun unrelated checks solely to fill the report.

## Discussion before implementation

Discuss this task with the owner before application changes:

1. How should sidebar collapse behave across navigation/reload, and which agreed profile/avatar contract should the shell consume? Confirm the SVG logo extraction and available route behavior.
2. Confirm assumptions, dependencies, scope boundaries and the observable acceptance scenarios above.
3. Agree on implementation approach, affected areas, required checks and any remaining limitations; resolve material ambiguities explicitly.

Record the discussion outcome below. Agreement on documentation alone is not implementation authorization. Start implementation only after the discussion is complete and the owner explicitly requests implementation of the agreed scope. Do not interpret silence or a request to discuss as approval.

### Decision record

- Discussion date: 2026-10-14. The owner agreed to the proposal with "pasuje" and requested "declarative > imperative", use of `angular-developer` and review of the design documents.
- Agreed assumptions and behavior:
  - F07 is closed with its recorded verification limits. Reuse the delivered authentication and theme behavior.
  - At widths of 768 px and above, use a 256 px expanded / 80 px collapsed sidebar, expanded by default. Persist the user's collapse choice in this browser across navigation and reload. Switching to mobile must not overwrite the desktop choice.
  - Below 768 px, use bottom navigation with `Dzisiaj`, `Grupy`, `Ustawienia`, safe-area padding and sufficient content clearance.
  - Keep desktop settings/account at the bottom while preserving access at limited viewport heights. Make the account control and sign-out available on mobile too; preserve sign-out progress and error feedback.
  - Render initials derived from the signed-in user's `displayName`; do not hardcode identity. The current session contract has no profile image. Google profile-image delivery and its contract extension are deferred; this is the agreed initials-only slice of the design baseline.
  - Show `Grupy` and `Ustawienia` as unavailable with a readable `Wkrótce` indication until their feature tasks deliver usable destinations. Do not create placeholder feature screens. `Dzisiaj` remains the available active-user destination.
  - Pending users retain a simplified invitation layout with logo, account and sign-out, without active-user feature navigation.
- Agreed scope and exclusions: Responsive shell, original-source SVG extraction, `daylo` wordmark, real account identity and available-route composition only. Today task content, group management, full Settings, theme preference controls/persistence and Google profile-image changes remain outside this task. Preserve original design exports; omit prototype controls, sample counters and speculative group shortcuts.
- Agreed approach and verification:
  - Apply the project-local `angular-developer` skill. Prefer declarative templates, named signals and `computed` derived state, router bindings and responsive CSS. Avoid manual DOM/class manipulation and effects that merely copy derived state; isolate necessary browser-storage side effects.
  - Compose a shared shell with routed content; application routing owns feature composition, and shell must not import routed feature libraries. Preserve existing session guards and access restrictions.
  - Reviewed `docs/design/README.md`, `docs/design-brief.md`, `docs/design/design-system.md`, `docs/design/tokens.json` and the relevant sidebar/logo HTML sources. Normalized design rules and tokens take precedence over conflicting prototype values. Use supported Material APIs, existing light/dark roles, Plus Jakarta Sans, 200 ms sidebar motion and reduced-motion support.
  - Subsequently visually inspected all three approved `screen.png` sources: desktop/all-states, light mobile composition and logo mark. Confirmed the warm canvas, white sidebar/main surface, orange logo with black wordmark, outlined selected navigation, bottom desktop settings/account and mobile header/account plus bottom navigation. These saved images show light appearance; they do not verify dark appearance, collapsed-sidebar behavior or actual narrow-viewport usability. The mobile composition is displayed within a wide exported canvas. Prototype toolbar, fixture identities, counters, workspace shortcuts and theme controls do not expand this task's scope.
  - Verify both themes at 360/390/768/1024/1440 px, both applicable sidebar states, collapse persistence and mobile transitions, keyboard labels/tooltips and visible focus, minimum 44 px targets, long account names, zoom, safe-area clearance and no horizontal overflow.
  - Run affected Nx lint, meaningful component/router tests, production build and real-stack E2E, including account/sign-out and pending-access regressions. Independently inspect the running desktop/mobile UI with an available browser tool and inspect console/network diagnostics where supported. Record limitations; do not claim Google sign-in from provider-fixture checks.
- Unresolved questions: None identified for the agreed scope. Resolve any new material product ambiguity before dependent changes.
- Owner implementation authorization: The owner explicitly requested implementation with "okej, to do dzieła" on 2026-10-14 after agreeing to the scope and reviewing the screenshot-inspection record. This authorizes M05-02 application changes and verification only; no commit, publication, deployment or subsequent task is authorized.

## Scope boundaries

Only the work listed above belongs to this task. Follow the parent backlog boundary and approved architecture; do not implement subsequent tasks, speculative libraries or deferred MVP features. Preserve existing delivered work and original design exports. Git initialization, commits, publication and deployment require their own authorization.

## Delivery and review record

- Delivered behavior: Material Sidenav/navigation lists, icon buttons, tooltips, account menu and content card compose the responsive shell. The original SVG is extracted to `apps/web/public/daylo.svg`; exports remain unchanged. Desktop uses 256/80 px navigation with browser-persisted collapse; mobile uses a header/account and bottom navigation. Width and content margin derive from the same signal, avoiding animated `autosize` measurements. Pending users retain their restricted layout. Groups/Settings remain visibly unavailable. Existing session guards, sign-out errors and progress remain real; no API contract, dependency or migration changed.
- Checks executed and outcomes: Relevant shell/web lint and all 22 component/router/preference tests passed (6 shell, 16 web). E2E lint and typecheck passed without lint warnings. Production web build and required OpenAPI validation, deterministic client drift and generated-client compilation passed; CSS budgets pass. Existing tool deprecation/generator notices remain. Forty-six distinct real-stack desktop/mobile E2E cases passed across scoped runs: 22 access/UI cases and 24 authentication, quota, login-shell and controlled-provider cases. After the final layout correction, the four keyboard/long-name cases passed and the two responsive cases passed with explicit content-margin, keyboard-tooltip and reduced-motion assertions. The responsive rerun completed with two passes; no cached E2E result was used. Each managed verification database applied all three existing migrations. `git diff --check` passed. Nx formatting was attempted but no formatter is configured; no formatting dependency was added.
- Browser scenarios and viewport coverage: Independently inspected the running real stack through the available collaborative browser: owner login/reload/sign-out, pending restriction and direct Today recovery, account menus, the current-route skip link, long synthetic names, collapsed/expanded layout and mobile transitions. Inspected light/dark desktop and mobile layouts, including 1440/1280 desktop and 390 mobile widths, using saved screenshots and DOM metrics; the automated matrix additionally covered 360/768/1024. Final fresh-build desktop metrics confirmed an 80 px panel and 80 px content margin, no horizontal overflow and no failed resource loads. Local storage contained only the explicit sidebar preference; authentication stays cookie-owned. Browser connection/input/snapshot tools were intermittent; later interactions used in-page DOM actions through the same browser tool. Full independent console collection remains incomplete; automated page-error assertions and available resource diagnostics passed.
- Known limitations / incomplete verification: Local Windows/Chromium verification used Node 24.16.0, not pinned 24.19.0. Hosted CI/Linux, real Google, deployed HTTPS, native browser zoom and physical safe-area cutouts remain unverified. CSS 200% zoom is a layout smoke, not certification of native zoom or the later M05-04 accessibility review. Full independent console inspection remains incomplete as noted above. A shared-output rebuild invalidated a previously loaded lazy chunk during inspection; a fresh load restored the flow and sign-out was rechecked. No broader hot-update recovery is delivered. Google profile images, task content, group management and Settings/preferences remain outside this task.
- Owner acceptance: Granted on 2026-10-15 for the delivered scope and review refinements.
- Retrospective and workflow improvements: The agent initially used custom sidebar layout despite the documented Material mapping; owner review corrected it to Sidenav/lists. AOT compilation caught unsupported `Array.at`, while root-entry and keyboard checks caught route ordering and base-relative fragments. Explicit layout assertions exposed stale `autosize` margins; shared declarative geometry fixed them. Test Material tooltips through their visible content and the control's accessible name rather than assuming duplicate ARIA descriptions. Inspect stable build outputs, use explicit test-file arguments instead of unquoted shell regex metacharacters, and rerun only checks affected by concrete changes/failures.

### Verification commands and cleanup

The final checks used the existing Nx targets:

```powershell
npm exec nx run-many -- --targets=lint,test --projects=web-core-shell,web --output-style=stream
npm exec nx run-many -- --targets=lint,typecheck --projects=web-e2e --output-style=stream
npm exec nx run web-e2e:e2e-fullstack -- --args='src/access.spec.ts --reporter=list' --output-style=stream
npm exec nx run web-e2e:e2e-fullstack -- --args='src/authentication.spec.ts src/rate-limiting.spec.ts src/shell.spec.ts src/environment.spec.ts --reporter=list' --output-style=stream
npm exec nx run web-e2e:e2e-fullstack -- --args='--grep=@shell --reporter=list' --output-style=stream
npm exec nx run web-e2e:e2e-fullstack -- --args='--grep=responsive --reporter=list' --output-style=stream
```

The tagged run verifies the six added desktop/mobile UI scenarios. Following a
test-only tooltip-locator correction, the final responsive rerun verifies both
matrix cases. Earlier failures are diagnostic history, not passing evidence.
The managed target owns production build/client checks and isolated stack startup.
Preliminary obsolete runs were interrupted or failed; their owned process trees
and containers were cleaned up explicitly where necessary. Docker was restarted
after the environment pause; one initial port-publication startup attempt failed
and later managed startups succeeded without changing E2E infrastructure.
Passing runs recorded successful cleanup. The independent inspection target uses
its stop-file cleanup. Reports, traces and synthetic review images remain under
ignored `dist/.playwright`; no authentication artifact is committed.

### Naming review — 2026-10-15

Following the owner's naming feedback, the internal account component is named
`AccountMenu`, with the `account-menu` directory and `lib-account-menu` selector.
Imports, template references and the library README use the same name. This is an
internal rename with no behavior or visual changes. Relevant Nx lint checks,
22 unit/router tests and the production web build passed, including the generated
client drift check. Browser and E2E checks were not repeated for this rename;
the UI verification above remains applicable. Owner acceptance is pending.

### Material icon review — 2026-10-15

The owner requested replacing the custom standard-control SVG paths with Angular
Material icons. Navigation, collapse/expand and sign-out now use `MatIcon` with
the existing Material Symbols Outlined font (`today`, `groups`, `settings`,
`chevron_left`, `chevron_right`, `logout`). Removed the path data and custom SVG
stroke styling. Material hides decorative icons from assistive technology;
the existing Polish control labels remain in place.

Relevant lint checks, 22 unit/router tests, the production web build and generated
client checks passed. Menu harness filters now match the Polish action suffix
because the harness text also includes the decorative icon ligature. Two existing
responsive E2E cases passed against the real stack (desktop/mobile, light/dark,
the existing viewport matrix; run `f744197cc8f229e7e5147cda`). An initial combined
grep command failed at Windows shell parsing before tests started; the corrected
responsive-only command passed.

Collaborative browser inspection used isolated stack `4141932ea34474ae6808aa27`:
1440px desktop expanded/collapsed and 390px mobile, light/dark appearance,
loaded icon font, 24px decorative icons, no horizontal overflow, account menu
and successful sign-out to login. Screenshots were inspected; artifacts remain
outside version control. No new runtime/resource errors were observed after
sign-in; the anonymous session request returned the expected 401. Inspection
stack cleanup completed. Owner acceptance remains pending.

Review lesson: use standard Material icons alongside Material controls from the
start, and account for decorative ligatures in harness text filters.

### Shared layout extraction — 2026-10-15

The owner explicitly requested extracting the layout and starting shared UI.
The approved frontend architecture already names `libs/web/shared/ui`
(`platform:web`, `scope:shared`, `type:ui`), so this refinement uses that library
rather than introducing another design-system project. `AppLayout` owns the
existing responsive Material frame, branding and navigation. Its API accepts
navigation visibility, collapsed state, the skip-link target and an account
template, and emits a sidebar-toggle event. The shell supplies session state,
persisted preference, account template, status messages and routed content.
Shared UI must not import authentication state, API code or storage services.

Acceptance: preserve current layout, routes, account access, pending-user
restrictions, accessible names, collapse persistence and mobile transitions.
Verify library boundaries/lint, meaningful UI and integration tests, production
build, existing shell E2E scenarios and independent desktop/mobile inspection.
No additional UI components, feature screens or dependencies are in scope.
Implementation and verification are authorized by the owner's extraction request;
acceptance remains pending until reviewed.

Delivered: generated the non-buildable `web-shared-ui` Angular library using Nx
and extracted `AppLayout` with the existing template/styles and responsive
geometry. It uses signal inputs, a toggle output, content projection and an
account-template input. `AuthenticatedShell` now composes this public UI entrypoint;
session state, sidebar persistence, sign-out feedback and routing remain in core.
The generated TypeScript import mapping follows this integrated workspace's
existing convention; no npm workspace package or dependency was added.

Verification passed: lint/boundary checks for all three affected projects,
25 unit/router/preference tests (3 shared UI, 6 shell, 16 web), production web
build and its contract/client drift prerequisites. The three new tests cover
projection/template context without auth providers, parent-controlled collapse
with an emitted event, and restricted navigation with retained account access.
All six existing tagged shell E2E cases passed against the real API/PostgreSQL
on desktop/mobile (run `7f455bc37dfaf90b5d4d6dbb`), covering both themes, the
viewport matrix, geometry/persistence, keyboard/short-height access and long names.

Independent browser inspection used stack `d2a73f9cb51bf25ac18334c1`: confirmed
projected Today content, expanded 256px and collapsed 80px geometry, mobile
navigation/account access, successful owner sign-out and pending invitation view
with no feature navigation and no horizontal overflow. Native preview input was
intermittent; some actions used DOM clicks through the same preview tool.
Preview screenshots failed repeatedly with an automation-client error, leaving
independent screenshot/console verification incomplete. Visually inspected the
fresh E2E desktop-light and mobile-dark screenshots instead; artifacts are ignored.
Existing environment/real-Google/native-zoom limitations still apply.

Retrospective: extract the presentation boundary without moving session stores
into shared UI; prove that boundary with provider-free UI tests. Check generated
root-config changes and remove unrelated generator defaults/format churn. No
additional components or subsequent tasks were started. Owner acceptance pending.

### Dedicated route pages — 2026-10-15

The owner requested replacing the single generic shell page with proper page
shells. This authorizes the bounded extraction of existing Today and invitation
content into `Today` at `libs/web/tasks/features/today` and `Invitations` at
`libs/web/groups/features/invitations`, following the approved area structure.
Application routing lazily composes both pages under the existing protected shell;
core does not import feature pages. Each page owns its heading/template and keeps
the existing session-based greeting/loading display. Remove the shared route-data
heading mechanism and the production generic page.

Acceptance: unchanged appearance and active/pending guards, real identity,
loading/account/sign-out behavior, skip-link navigation and responsive layout.
Verify affected lint/boundaries, component/router tests, web build, real-stack
route/access and shell scenarios, and independent browser inspection. Task lists,
group/settings routes and invitation actions remain in their unstarted backlog
items; this extraction does not authorize or deliver them.

Delivered: two non-buildable feature libraries generated with Nx, public exports
`Today` and `Invitations`, and independent lazy component imports in app routing.
Both pages own their fixed Polish heading, session greeting/loading presentation
and existing Material card styles. The generic page and its export are removed.
Core shell tests now use local route fixtures, keeping feature-to-feature imports
out of core. Application router tests verify the actual feature hosts and guards.

Verification passed: affected lint/boundary checks, 24 component/router/preference
tests (1 Today, 1 Invitations, 6 core shell, 16 web), production web build and its
contract/client prerequisites. Unit checks prove reactive greeting/loading without
route-data providers. Browser inspection used isolated stack
`8072397be9ae3647db6fdf1a`: Today/Invitations host identity, 1440px desktop and
390px mobile, light/dark screenshots, no horizontal overflow, owner account menu
and sign-out, pending navigation restrictions and `/today` redirect to invitations.
The current-route skip target remained correct. Console/network inspection found
only the expected anonymous-session 401s; no new runtime/resource errors. Browser
open initially timed out; opening a fresh collaborative tab recovered inspection.
Inspection-stack cleanup completed; screenshots remain outside version control.

Real-stack verification passed all 14 selected OAuth/session cases on desktop
and mobile (run `23398ce6e339ac3c14f1454b`): owner/member/pending routing,
reload, sign-out, outsider denial and session-expiry recovery. The existing Nx
target ran `src/access.spec.ts --grep=OAuth --reporter=list`; no cached E2E result
was used. Owner acceptance remains pending.
Existing real-Google, native-zoom, physical-safe-area and hosted-environment
limitations remain unchanged. The first inspection startup overlapped another
Prisma generation and failed with ENOTEMPTY before starting services. Retrying
after generation completed succeeded. Retrospective: keep shared-output generator
steps sequential, and test route identity at app composition while core tests
remain independent of feature libraries.

### Authenticated shell naming — 2026-10-15

The owner selected `AuthenticatedShell` as the component name. Its directory and
files are `authenticated-shell`, and its selector is `lib-authenticated-shell`.
Updated the public export, lazy route import, tests and current documentation.
The Nx library remains `web-core-shell` at `@daylo/web/core/shell`. No rendering
or behavior changed. Relevant lint, 22 shell/web tests, production build and
client drift prerequisites passed. Browser/E2E were not repeated for this internal
rename; the preceding route and browser evidence remains applicable. Acceptance
of the overall M05-02 task is still pending.

### Session loading ownership — 2026-10-15

The owner approved moving session-loading presentation from Today/Invitations to
AuthenticatedShell. Guards still await session validation before initial entry;
the lifecycle provider can refresh again while a page is already mounted.
The shell shows one loading status and hides routed content during that check,
keeping the outlet mounted to preserve local page state. Feature pages retain
their greeting/heading only and no longer read session status. No session-state,
API, guard or lifecycle behavior changes are in scope.

Acceptance: one shared status during active/pending refresh, retained page state,
restored content after validation and unchanged expired-session redirects.
Verify affected lint, tests/build, real-stack refresh recovery and browser flow.
Delivered and locally verified. Both pages now render their greeting/card without
reading session status; AuthenticatedShell owns the loading status and a hidden
content wrapper around the permanently mounted outlet. Existing app-level initial
preparation, guard checks and lifecycle redirects are unchanged.

Relevant lint, 26 unit/router/preference tests (8 shell, 16 web, 1 per page),
production build and contract/client prerequisites passed. New active/pending
refresh tests prove one status, hidden content and retained input/node identity
after validation. A first test waited for application stability while holding an
HTTP response open; it was corrected to observe the loading state before flushing
the response. Retrospective: exercise the pending state without awaiting the very
request completion under test.

Two real-stack desktop/mobile foreground-expiry cases passed (run
`e85b14d8760246e4a0591302`). Browser inspection on isolated stack
`09ac0153425252740f66f452` exercised a real pending-session refresh via the existing
visibility-change lifecycle. A temporary DOM observer recorded exactly one shared
loading status, the same Invitations host before/after, and restored visible
content; no Daylo response was mocked. Inspected 390px mobile screenshot and
1440px layout metrics with no overflow. Current-run diagnostics contained only the
expected anonymous-session 401; earlier stopped-stack errors in tab history were
unrelated. Both owned stacks cleaned up successfully. Existing verification limits
remain; overall task acceptance is pending.

### Publication verification — 2026-10-15

Published as [ready-for-review PR #28](https://github.com/Rizzlie/Daylo/pull/28)
from `feat/responsive-authenticated-shell` into `main`, linked to the task thread.
The owner-accepted scope also includes the recorded tooling tasks. No merge or
deployment was performed.

After the owner-requested formatting pass, relevant lint, 29 component/router
tests across shared UI, core shell, pages and web, E2E typecheck, production build
and deterministic client drift checks passed. The final six tagged shell E2E
cases passed on desktop/mobile against the real stack (run
`df130385439e934a38b41832`), covering both themes, responsive geometry/persistence,
keyboard/short-height access and long names. Earlier foreground-expiry and browser
refresh evidence applies to the unchanged session-loading behavior. Changed-file
format checks and `git diff --check` passed. Existing full-repository formatting
drift outside this change is not claimed resolved. The serve wrapper's resolved
Nx configuration retains development/production delegation and scoped web port.

The owner accepted the delivered scope and changes on 2026-10-15 and explicitly requested publication as a ready-for-review PR. This authorizes a task-branch commit, push and PR only; merge, deployment and subsequent implementation remain unrequested. Earlier pending-acceptance statements above record the state at each refinement.

Update this record and the parent backlog after delivery/review. Do not mark the parent item accepted until all of its criteria are met and the owner accepts it.
