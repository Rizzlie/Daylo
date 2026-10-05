# Daylo — Project-local Agent Skills

Seven skills are installed under `.agents/skills`. They are local to this project rather than installed in the user's global skill directory. Commit the complete skill directories when the owner initializes the repository so other agents receive the same instructions and supporting references.

Application implementation has not started. Installing skills does not authorize starting a backlog item.

## Installed skills

| Skill | Purpose | Upstream source |
| --- | --- | --- |
| [nx-workspace](../.agents/skills/nx-workspace/SKILL.md) | Explore resolved Nx configuration, project graphs, and available targets | [nrwl/nx-ai-agents-config](https://github.com/nrwl/nx-ai-agents-config/tree/20a7836f3bc3e6f0a37c0e951e49dc581cc11563/skills/nx-workspace) |
| [nx-generate](../.agents/skills/nx-generate/SKILL.md) | Discover generators, inspect options and implementation, dry-run, generate, and verify | [nrwl/nx-ai-agents-config](https://github.com/nrwl/nx-ai-agents-config/tree/20a7836f3bc3e6f0a37c0e951e49dc581cc11563/skills/nx-generate) |
| [nx-run-tasks](../.agents/skills/nx-run-tasks/SKILL.md) | Run builds, tests, lint, serve, and affected tasks using Nx | [nrwl/nx-ai-agents-config](https://github.com/nrwl/nx-ai-agents-config/tree/20a7836f3bc3e6f0a37c0e951e49dc581cc11563/skills/nx-run-tasks) |
| [angular-developer](../.agents/skills/angular-developer/SKILL.md) | Official Angular development guidance with task-specific references | [angular/angular](https://github.com/angular/angular/tree/860832591d58f49e5618d2898509f18d7c1cfa50/skills/dev-skills/angular-developer) |
| [nestjs-best-practices](../.agents/skills/nestjs-best-practices/SKILL.md) | Backend architecture, dependency injection, guards, errors, testing, and database guidance | [kadajett/agent-nestjs-skills](https://github.com/kadajett/agent-nestjs-skills/tree/3986e0cede33958e000f959031cbee0cd83c2941/skills/nestjs-best-practices) |
| [playwright-best-practices](../.agents/skills/playwright-best-practices/SKILL.md) | E2E design, fixtures, locators, multi-user behavior, and debugging | [currents-dev/playwright-best-practices-skill](https://github.com/currents-dev/playwright-best-practices-skill/tree/283d5cbc5d11aac1abda058b16ad22c317d54dc0/playwright-best-practices) |
| [yeet](../.agents/skills/yeet/SKILL.md) | Authorized commit, push, and draft GitHub PR flow through `gh` | [openai/skills](https://github.com/openai/skills/tree/main/skills/.curated/yeet); owner-installed revision not recorded |

## Provenance

The original six skills were installed on 2026-10-02 using the skill installer's GitHub download helper, with explicit commit revisions and the destination `.agents/skills`.

| Repository | Commit | Source directories |
| --- | --- | --- |
| nrwl/nx-ai-agents-config | `20a7836f3bc3e6f0a37c0e951e49dc581cc11563` | `skills/nx-workspace`, `skills/nx-generate`, `skills/nx-run-tasks` |
| angular/angular | `860832591d58f49e5618d2898509f18d7c1cfa50` | `skills/dev-skills/angular-developer` |
| kadajett/agent-nestjs-skills | `3986e0cede33958e000f959031cbee0cd83c2941` | `skills/nestjs-best-practices` |
| currents-dev/playwright-best-practices-skill | `283d5cbc5d11aac1abda058b16ad22c317d54dc0` | `playwright-best-practices` |

Upstream files are preserved as downloaded, including their supporting references. Skills are guidance, not application dependencies; they do not add runtime packages or require a paid service.

## Usage and precedence

Apply only skills relevant to the current task. Read the entrypoint first and load references selectively rather than loading every skill for every task.

Human instructions and Daylo's approved product/architecture documents take precedence over generic skill examples. The concrete project overrides are recorded in [AGENTS.md](../AGENTS.md), including Nx-first generation, Zod, Prisma, cookie sessions, actual-stack E2E, Windows shell adaptation, and the single-agent workflow.

An installed skill is not evidence of browser access. Verify the browser-control tool separately during F01 and record any limitation. The Playwright skill guides automated test development; it does not install Playwright, browsers, or an MCP server.

Project-local skills should be discovered on the next agent turn. Agents can also follow the explicit links in `AGENTS.md` and this document.

## PR skill installation

The owner installed official OpenAI `yeet`; local installation was verified on 2026-10-05. Read the entrypoint and confirmed supporting files: `LICENSE.txt`, `agents/openai.yaml`, `assets/yeet.png`, and `assets/yeet-small.svg`. The earlier agent download attempt failed; the owner's subsequent installation resolves that blocker. The upstream commit revision is not recorded and is not inferred. See [Git workflow](git-workflow.md) for invocation boundaries and project overrides. Presence of the skill does not verify GitHub CLI authentication or authorize a commit/push/PR.

## Skill update policy

Do not update skills automatically as a side effect of application development. When an update is requested, review upstream changes, update the complete skill directory and pinned revision together, and check referenced files again.
