# Daylo — Backlog and Verification

Status: Planning baseline, version 1.0. No complete implementation item has been accepted. Requested implementation slices are recorded below; other work remains pending.

See [Task index](tasks.md) for the 2026-10-05 breakdown. Every task has a separate file under `docs/tasks/` with assumptions, work to perform, acceptance criteria, verification and discussion/decision records. Discuss each task with the owner before implementation, record agreed decisions, and wait for an explicit implementation request for that scope. The breakdown and discussion do not authorize implementation or change parent-item acceptance status.

### Requested F01 API shell slice — 2026-10-05

Implemented: empty NestJS `api` application generated with `@nx/nest` 23.2.1 in `apps/api`, root module and bootstrap, `/api` prefix, default port 3000 with `PORT` override, ESLint and Webpack/Nx targets, and `platform:api`, `scope:app`, `type:app` tags. Dependencies and npm lockfile updated; commands documented in the root README. No sample controller/service or API test target remains.

Verified: API and existing web lint and production builds passed. Nx serve started successfully; `GET /api` returned the expected NestJS JSON 404 because the shell has no endpoints. The verification server was stopped afterward. Browser verification is not applicable to this backend-only scaffold. Human acceptance and the remainder of F01 are pending; this slice does not complete F01 or authorize further implementation.

Retrospective: the generator's inherited CommonJS/bundler TypeScript combination was corrected locally to Node16 module/resolution before verification. Generator dry-run was unavailable because it installs an additional plugin. Restricted-session Nx socket/process failures required disabling the daemon/plugin isolation and running dependency installation and checks with expanded permissions. Inspect generated configuration before validating future slices.

### Requested M05 theme slice — 2026-10-05

Implemented: global Angular Material light/dark theme from `docs/design/tokens.json`, system default, document-level explicit variant hooks, typography and supported card/form-field styling. Production build and lint passed; shell browser checks passed at desktop/mobile widths. See [theme verification](design/design-system.md#theme-implementation--2026-10-05) for evidence and limitations. Human acceptance, rendered Material controls/overlays, theme preference UI/persistence and the remainder of M05 are pending. This slice does not complete M05 or authorize further implementation.

## 1. Foundation backlog

Work in small reviewed increments. Do not execute the next item merely because the previous item is finished.

| ID | Deliverable | Acceptance criteria | Verification |
| --- | --- | --- | --- |
| F01 | Nx workspace | Angular `web`, NestJS `api`, and Playwright `web-e2e` projects; npm lockfile; boundary rules; documented serve, lint, test, and build targets | Apps start; relevant lint and builds pass; Playwright can open the initial frontend shell |
| F02 | Local runtime | PostgreSQL Compose service; documented environment; API readiness endpoint checks database | Empty local database starts; readiness succeeds with DB and reports unavailability when DB is down |
| F03 | Prisma persistence | Models, constraints, migrations, and Prisma client for agreed entities | Apply migrations to an empty isolated DB; verify identity/membership uniqueness and invitation transaction behavior |
| F04 | Zod and Swagger | Request/response schemas, NestJS validation and serialization, documented current-session contract | Invalid payload rejected; valid response conforms; Swagger and OpenAPI endpoints work |
| F05 | OpenAPI client generation | Export, validate, and generate Nx targets; pinned Angular generator; committed client | Export without live DB; repeated generation stable; generated client compiles; drift check works |
| F06 | Google OAuth and sessions | Owner and invitation access; browser-bound single-use OAuth transactions; cookie sessions; sign-out; CSRF protection | Valid/invalid provider flows, invalid state/nonce, replay, denied outsider, session expiry/revocation, CSRF rejection; real Google smoke check separately |
| F07 | Browser verification foundation | Real test stack, isolated fixtures, controlled provider, multi-user contexts, reports and artifacts | Authentication E2E passes; fixture isolation holds; normal runtime excludes test provider; agent browser workflow exercised |

Dependencies: F01 -> F02 -> F03 -> F04 -> F05 -> F06. Establish Playwright in F01 and finish authentication fixtures and F07 after F06. F04-F05 use the current-session endpoint as the first complete contract-to-client example; authenticated behavior is finished in F06.

### F01 task boundary

Create the workspace and minimal runnable application shells. Add Nx tags and rules for the agreed platform boundaries, a Playwright smoke test, and development instructions. Create only libraries needed for the shells and boundary verification. Do not implement authentication, task features, or database migrations in F01.

Implement the tag policy in [Frontend architecture](frontend-architecture.md): one platform/scope/type tag per project, root ESLint module-boundary constraints at error severity, metadata validation, public-entrypoint restrictions, and positive/negative verification fixtures. Preserve the `area/features/name` library layout. Do not mark boundaries verified based only on linting valid imports.

Pin mutually compatible tool versions when implementing F01 and record the chosen versions. Use official generators where appropriate. Review the resulting workspace before proceeding.

Implement [Git workflow](git-workflow.md) enforcement during F01: conventional commitlint configuration, commit-message hook, CI checks for PR titles/commit messages, and valid/invalid verification examples. Do not initialize Git on behalf of the owner or publish planning changes without task authorization. PR template is already documented under `.github/pull_request_template.md`.

Merge the accepted [Backend architecture](backend-architecture.md) tag/type/scope policy with the frontend constraints, preserving narrow internal-contract exceptions and preventing frontend rule leakage. Verify representative permitted and forbidden backend imports. Business contracts, transaction runners, Prisma adapters, and SSE implementation belong to their later requested slices; boundary fixtures do not authorize creating their full runtime implementations in F01.

## 2. Functional slices after the foundation

| ID | Slice | Acceptance criteria |
| --- | --- | --- |
| M01 | Personal tasks | Create, edit, delete, complete, reopen; API access restricted to owner; persistence and conflict handling |
| M02 | Today | Timeline, untimed, overdue, completed sections; quick creation; greeting; loading/error/empty states; timezone boundaries |
| M03 | Groups and invitations | Owner creates groups and invitations; recipient accepts/rejects; atomic membership; pending users remain restricted |
| M04 | Shared tasks and live updates | Members manage group tasks; shared completion/reopening appears in two sessions without refresh; unauthorized users receive no task data or events |
| M05 | UI and preferences | Dark/light/system themes, saved preferences, greeting toggle, mobile bottom navigation, accessible forms |
| M06 | MVP acceptance | Core automated checks pass; browser inspection completed; seven-day owner usage exercise recorded separately |

M01 precedes M02. M03 precedes M04; M04 also depends on M01. M05 can be delivered incrementally with UI slices. M06 follows all functional slices.

Every slice includes schema/API updates, client regeneration, relevant tests, and browser verification. A feature is not accepted solely because its API works.

## 3. E2E environment

Use Playwright with `@nx/playwright` in `apps/web-e2e`.

- Run the real Angular frontend, NestJS backend, and isolated PostgreSQL test database.
- Replace only the external Google provider with a controlled test adapter. Exercise the real Daylo OAuth transactions, admission rules, sessions, CSRF protection, permissions, and persistence.
- Do not mock Daylo API responses in acceptance E2E tests.
- Keep the provider adapter unavailable in ordinary development and production configurations.
- Prepare deterministic synthetic users: owner, invited user, member, and outsider.
- Give each test independent data and browser state. Prevent fixtures from resetting development or production databases.
- Use two independent browser contexts for shared behavior.
- Use a controlled clock in frontend and backend for date-sensitive scenarios.
- Wait for stack readiness before testing; clean up services owned by the test run.
- Initial coverage is Chromium on desktop and an emulated mobile viewport. Emulation does not replace an actual phone check.

Real Google sign-in requires a separate manual smoke check with configured credentials. Controlled-provider tests do not verify the real Google configuration.

## 4. Required browser scenarios

Add each scenario when its feature exists; do not claim coverage for unimplemented features.

| Area | Scenarios |
| --- | --- |
| Authentication | Owner sign-in; outsider denial; sign-out; expired session; valid session survives reload |
| Invitations | Restricted pending screen; accept/reject; expired invite; wrong account; no group access before acceptance |
| Personal tasks | All task operations; optional description/time; persistence; user privacy |
| Today | Correct ordering and grouping; overdue retained; completed task union without duplicates; empty state; midnight change |
| Shared tasks | Both members see the task; completion and reopening propagate without refresh |
| Concurrency | Stale edit receives a recoverable conflict without silent overwrite |
| Preferences and layout | Both themes; system preference; persisted selection; greeting toggle; usable mobile form and bottom navigation |
| Failures | Failed save retains input; API failure message; lost SSE connection; reconnection reload |

Prefer accessible roles and labels in selectors. Use Playwright assertions and automatic waiting rather than fixed sleeps. Keep tests focused on observable behavior.

Capture screenshots and traces on failure. Store HTML reports, traces, authentication state, and screenshots outside version control. Use synthetic data for artifacts.

## 5. Agent browser verification

For every user-facing change, the implementing agent must:

1. Start required services and confirm readiness.
2. Open the running app using an available browser-control tool.
3. Perform the feature's acceptance scenario through the actual UI.
4. Inspect desktop and mobile layouts where affected.
5. Check console errors and failed application requests when supported by the tool.
6. Use two authenticated sessions for shared behavior.
7. Record what was checked, what passed, and remaining limitations.

Automated E2E and exploratory browser inspection are both required. Screenshots support visual inspection but do not replace behavioral assertions. If browser control is unavailable, mark that verification as incomplete rather than claiming success.

## 6. Nx verification targets

Define and document targets for:

- Serve, lint, unit/integration tests, and production builds.
- Prisma client generation and migration application.
- OpenAPI export, validation, Angular generation, and drift verification.
- Frontend E2E, interactive/headed debugging, and opening test reports.

Wire dependencies so frontend builds use the current generated contract. Do not use cached E2E results as evidence of a fresh browser run. Regeneration checks compare temporary output and do not rewrite tracked files.

CI runs automated checks; agent browser inspection is recorded separately. Report failures before broadening tests, and rerun checks affected by fixes.

## 7. Definition of done

A task is complete when its acceptance criteria are met, relevant lint/tests/builds pass, generated artifacts are current, applicable frontend E2E passes, browser verification is recorded, and no blocking defect remains.

For each item, report:

```text
Backlog item:
Delivered behavior:
Checks executed and outcomes:
Browser scenarios and viewport coverage:
Known limitations:
Pending human acceptance:
```

After each phase, record agent mistakes, defects found by review, and improvements to requirements or verification. Keep the retrospective brief and evidence-based.

## References

- [Nx Playwright integration](https://nx.dev/docs/technologies/test-tools/playwright/introduction)
- [Playwright authentication and multiple contexts](https://playwright.dev/docs/auth)
- [Playwright best practices](https://playwright.dev/docs/best-practices)
