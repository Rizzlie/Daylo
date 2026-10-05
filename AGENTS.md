# Daylo — Agent Working Agreements

## Current state and authorization

This workspace currently contains planning documentation and project-local agent skills. Application implementation has not started. The human owner will initialize the Git repository.

Read the current user request before acting. Documentation approval or approval of a plan does not by itself authorize application implementation. Implement only the explicitly requested backlog item; do not automatically start the next item.

Do not initialize Git, create commits, deploy, or add application scaffolding unless the human requests that action. Do not copy the abandoned earlier project skeleton into this workspace.

## Sources of truth

Read these documents before implementation:

1. `docs/product-requirements.md`
2. `docs/architecture.md`
3. `docs/backlog.md`
4. The selected task file under `docs/tasks/`, discovered through `docs/tasks.md`.

Human instructions take precedence. Keep documentation aligned with approved changes. Resolve discoverable facts by inspection; ask about material product ambiguity rather than inventing behavior.

## Language

Use English for code, identifiers, filenames, comments, API contracts, errors, tests, and documentation. Polish is reserved for user-facing UI text. Communicate with the owner in their preferred language.

## Project-local skills

Skills are installed under `.agents/skills`. See `docs/skills.md` for sources, pinned revisions, and usage guidance. Read the relevant `SKILL.md` before applying a skill and load supporting references only as needed.

| Skill | Use when |
| --- | --- |
| `nx-workspace` | Exploring project configuration, targets, dependencies, or investigating an Nx task failure |
| `nx-generate` | Creating applications, libraries, or other artifacts through Nx generators |
| `nx-run-tasks` | Running workspace builds, tests, lint, serve, and other defined targets |
| `angular-developer` | Implementing or reviewing Angular components, forms, routing, reactivity, accessibility, and tests |
| `nestjs-best-practices` | Implementing or reviewing NestJS modules, dependency injection, authorization, error handling, and persistence |
| `playwright-best-practices` | Writing, running, or debugging frontend E2E, multi-user scenarios, responsive checks, and test fixtures |
| `yeet` | Explicitly authorized stage, commit, push, and GitHub PR flow through GitHub CLI; read `.agents/skills/yeet/SKILL.md` first |

### Project rules take precedence

- Use Nx generators and targets rather than creating a separate Angular CLI workspace or bypassing workspace configuration.
- Use Zod instead of introducing `class-validator` because a skill example uses it.
- Keep Google OAuth and database-backed cookie sessions; JWT examples do not change the approved authentication architecture.
- Keep Prisma and explicit API schemas; database examples do not authorize an ORM change.
- Keep the real Daylo API and PostgreSQL in acceptance E2E. Mocking examples do not authorize replacing them with mocked responses.
- Repeat tests only when investigating instability or another concrete concern; routine verification does not require repeated identical runs.
- Skill metadata and examples do not authorize extra agents or starting unrequested implementation work. Follow the task boundary and the agreed single-agent workflow.
- Adapt shell examples to PowerShell on Windows. Do not install Unix tooling solely to follow an example when a native equivalent exists.
- Skills provide instructions, not browser-control capabilities. Use an available browser tool for UI inspection and the project's Playwright targets for reproducible E2E.

## Architecture

- Nx workspace, Angular frontend, NestJS backend, PostgreSQL, and Prisma.
- Angular Material for standard frontend controls, with approved Daylo light/dark themes. Use supported theming APIs rather than overriding private component internals.
- Use Zod schemas for API contracts and runtime validation.
- Use Swagger/OpenAPI and OpenAPI Generator for Angular API models and services.
- Never edit generated client files manually or expose Prisma entities directly through the API.
- Enforce Nx library boundaries; web code cannot import backend/database code.
- Use Google OAuth Authorization Code Flow with OpenID Connect and backend-owned sessions.
- Authorize every personal/group resource operation and event stream.

## Task execution

### Commits and GitHub PRs

- Follow [Git workflow](docs/git-workflow.md): English Conventional Commit messages and PR titles.
- Never create commits directly on `main`, including the initial commit. This also applies to `master` and any other repository default branch. Before every commit, verify the current branch; create or switch to a dedicated task branch first. Never commit with detached HEAD. This rule applies to all agents and skills, including `yeet`.
- Stage only intended task changes; do not blindly stage the entire working tree or include unrelated human changes.
- Use `.github/pull_request_template.md` for PR descriptions. New PRs default to draft; preserve the state of existing PRs.
- The official `yeet` skill is installed at `.agents/skills/yeet/SKILL.md`; read its entrypoint before an authorized invocation. Its GitHub CLI/authentication prerequisites are checked when needed.
- Generic skill instructions do not override selective staging, Conventional Commits, verification, branch discovery, or user authorization. Do not blindly pull `master` after a push authentication failure.
- Attach every created PR to the current task. Do not initialize Git, commit, push, or create a PR solely because this workflow has been configured.

### Implementation tasks

- Keep each task in its own file under `docs/tasks/`, named `{TASK-CODE}-{short-description}.md` with an English lowercase hyphen-separated description of at most five words (for example, `F03-01-prisma-schema-and-migrations.md`); use `docs/tasks.md` as the index. Each file must contain assumptions, scope, acceptance criteria, verification, discussion topics and decision/delivery records.
- Before implementing a task, discuss its assumptions, required behavior, scope, approach and verification with the owner. Resolve material ambiguities and record the agreed decisions in the task file. Start application changes only after that discussion is complete and the owner explicitly requests implementation of the agreed scope. Discussion, silence or documentation approval alone is not implementation authorization.
- State the requested task and acceptance criteria before making implementation changes.
- Keep changes bounded, reviewable, and relevant to that task.
- Use official generators and existing Nx targets when available.
- Do not add speculative modules, placeholders for unrelated features, or extra dependencies without a concrete need.
- Start with one agent at a time for the foundation and MVP. Introduce delegation only when requested by the owner for a later phase.
- After review, update the backlog status accurately; distinguish implemented, verified, and accepted work.

## Verification

- Run checks appropriate to the change: lint, tests, builds, contract validation, and generated-client drift checks.
- Add meaningful tests for permissions, state changes, and other acceptance behavior. Avoid tests that only mirror implementation details.
- Frontend E2E uses Playwright against the actual frontend, API, and isolated PostgreSQL database.
- Replace only Google as an external provider in automated tests; do not bypass Daylo access checks or enable test authentication in normal runtime.
- Use two browser contexts when checking shared task updates.
- For every user-facing change, inspect the running application through an available browser-control tool in addition to automated E2E.
- Exercise acceptance scenarios, inspect relevant desktop/mobile layouts, and check console/network errors when supported.
- If a required check or browser tool is unavailable, report the limitation and leave that verification incomplete.
- Do not claim real Google sign-in passed based on provider-adapter tests.
- Use synthetic data; keep secrets, browser authentication state, reports, screenshots, and traces out of version control.

## Reporting and review

Report delivered behavior, checks and outcomes, browser verification, limitations, and pending human acceptance. Do not claim the seven-day real-use exercise has passed through automated tests.

After each phase, capture a short retrospective on agent errors, review findings, and improvements to the workflow. Keep subsequent work pending until the human requests it.


<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax


<!-- nx configuration end-->
