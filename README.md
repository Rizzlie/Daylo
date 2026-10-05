# Daylo

Daylo is a personal and shared task planner built incrementally with coding agents.

## Project status

Planning documentation, project-local agent skills, an Angular shell with Daylo themes, and an empty NestJS API shell. Foundation and MVP acceptance remain pending; see the backlog for delivered slices.

The repository will be initialized by its owner.

## Documentation

- [Product requirements](docs/product-requirements.md): MVP behavior and acceptance criteria.
- [Architecture](docs/architecture.md): Nx, authentication, persistence, contracts, and client generation.
- [Frontend architecture](docs/frontend-architecture.md): feature directories, library responsibilities, project tags, and ESLint dependency rules.
- [Backend architecture](docs/backend-architecture.md): modular monolith, internal contracts, transaction ownership, post-commit updates, and backend boundary rules.
- [Backlog and verification](docs/backlog.md): implementation sequence and browser testing requirements.
- [Task index](docs/tasks.md): individual task files with assumptions, scope, verification and required discussion before implementation.
- [Agent instructions](AGENTS.md): working agreements and definition of done.
- [Project-local skills](docs/skills.md): installed skills, sources, and pinned revisions.
- [Git workflow](docs/git-workflow.md): Conventional Commits, PR template, enforcement plan, and selected PR skill.
- [Today design brief](docs/design-brief.md): mockup scope, interaction scenarios, and Angular Material component mapping.
- [Accepted design sources](docs/design/README.md): owner-approved Today visual baseline and remaining refinements.

## Planned stack

Nx, Angular, Angular Material, NestJS, PostgreSQL, Prisma, Zod, Swagger, OpenAPI Generator, and Playwright.

Code and documentation use English. User-facing UI text uses Polish.

## Delivery approach

1. Review the planning documents.
2. Discuss the selected task's assumptions, behavior, scope and verification; record decisions in its task file.
3. Implement one task only after the owner explicitly requests implementation of the agreed scope.
4. Review changes and verification evidence before selecting the next task for discussion.

Only explicitly requested slices are authorized; the full **F01: Nx workspace** item remains pending.

## Frontend shell

Use Node.js 24.19.0 and npm 11.17.0, the verified local baseline. Install the locked dependencies with `npm ci` from the workspace root. Frontend framework and tooling dependencies are pinned to their existing exact locked versions; this task does not upgrade packages.

| Tool | Pinned version |
| --- | --- |
| Nx and frontend Nx plugins | 23.2.1 |
| Angular runtime, compiler and language service | 22.1.8 |
| Angular CLI, build, devkit and schematics | 22.1.9 |
| Angular Material and CDK | 22.2.1 |
| TypeScript | 6.0.3 |
| Analog Angular/Vitest integration | 2.6.4 |
| Vite / Vitest | 8.3.2 / 4.1.11 |
| Angular ESLint / ESLint | 22.5.0 / 9.39.5 |
| Playwright | 1.63.0 |
| Plus Jakarta Sans Variable | 5.3.0 |

The client-rendered Angular app lives in `apps/web`, tagged `platform:web`, `scope:app`, `type:app`. Use its Nx targets:

```powershell
npm exec nx -- run web:serve
npm exec nx -- run web:lint
npm exec nx -- run web:test
npm exec nx -- run web:build
```

Serve defaults to development at `http://localhost:4200/`. If the port is occupied, use `npm exec nx -- run web:serve --port=4300`. Build defaults to production and writes to `dist/apps/web`; unit tests use Vitest. The root `npm test` script is not the web test target.

The initial page shows the `Daylo` heading and a Polish preparation message. Its document title is `Daylo` and language is Polish. Themes follow system appearance by default; document-level `data-theme="light"` or `data-theme="dark"` overrides remain available. Plus Jakarta Sans is bundled locally; Material Symbols Outlined is loaded from Google Fonts for planned icon use, with preconnect links to its stylesheet and font hosts. Product navigation, authentication and task screens remain pending.

API proxy wiring and full-stack E2E setup remain pending before API-consuming features.

## Frontend shell smoke tests

Install the Playwright Chromium browser once after `npm ci` with `npm exec playwright -- install chromium`. Use the existing Nx project for test runs and debugging:

```powershell
npm exec nx -- run web-e2e:e2e --skipNxCache
npm exec nx -- run web-e2e:lint
npm exec nx -- run web-e2e:e2e:headed --skipNxCache
npm exec nx -- run web-e2e:e2e:debug --skipNxCache
npm exec nx -- run web-e2e:e2e:ui --skipNxCache
npm exec nx -- run web-e2e:e2e-report
```

The smoke test opens the real Angular shell and checks its `Daylo` heading, document title and Polish preparation message. Projects `chromium-desktop` (1440 × 900) and `chromium-mobile` (390 × 844, touch/mobile emulation) run by default. Mobile emulation does not replace a physical phone check. To select one project, append `--project=chromium-desktop` or `--project=chromium-mobile` to the E2E command.

Nx starts `web:serve` and waits for `http://localhost:4200` before the tests. Keep that port free when starting a run; Playwright reuses the server owned by the Nx task graph. The normal E2E target disables cache; retain `--skipNxCache` when requesting fresh evidence or using inferred CI targets. Tests do not mock responses. This endpoint-free shell needs only the frontend; API, isolated PostgreSQL and provider fixtures will be added for their corresponding functional tasks.

The headed configuration shows both browser projects; debug opens the Playwright Inspector for desktop, and UI opens the interactive test runner. Stop interactive sessions with Ctrl+C. The report target serves the latest HTML report at a loopback address (default port 9323) until stopped. These interactive commands are for local debugging, not CI verification.

HTML reports live in `dist/.playwright/apps/web-e2e/playwright-report`, test results in its sibling `test-output`, and CI blob reports in `blob-report`. Screenshots and traces are retained on failure, including a first local failure without retries. The report never opens automatically. These artifacts and browser authentication state are ignored by Git and must not be committed.

## Workspace boundary checks

The root ESLint configuration uses `@nx/enforce-module-boundaries` for platform, scope and type constraints, circular dependencies and forbidden external packages. Run it through the existing Nx lint targets:

```powershell
npm exec nx -- run-many -t lint -p web api web-e2e --skipNxCache
```

F01-04 uses only the built-in Nx rule. It adds no custom rules, metadata validator, fixture harness or workspace targets. Tag completeness, path consistency and capability-tag ownership are not automatically validated. Public entrypoints follow Nx's built-in import checks; no additional canonical-alias validation is implemented. CI wiring remains F01-05.

## API shell

The empty NestJS application lives in `apps/api`. Install dependencies with `npm ci`, then use:

```powershell
npm exec nx -- run api:serve
npm exec nx -- run api:lint
npm exec nx -- run api:build
```

The server listens on port `3000` by default; `PORT` overrides it. Routes will use the `/api` prefix. No controllers are registered, so `GET /api` currently returns NestJS's JSON 404 response. Database, authentication, and API contracts are pending. No API test target is configured until meaningful behavior exists to test.

In a restricted agent session that blocks Nx sockets or plugin subprocesses, set `NX_DAEMON=false` and `NX_ISOLATE_PLUGINS=false` for that session. Disabling the daemon also disables automatic server restarts on file changes.
