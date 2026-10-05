# Daylo — Conventional Commits and GitHub Pull Requests

Status: Commit convention and PR-skill preference accepted on 2026-10-05. Git initialization remains owned by the human. The owner installed `yeet`; the local entrypoint and supporting files have been verified.

## Commit and PR titles

Use Conventional Commits 1.0.0 in English:

```text
<type>(<optional-scope>): <description>
```

Project policy: lowercase type and scope, imperative concise description, no terminal period. Types: `feat`, `fix`, `docs`, `refactor`, `test`, `build`, `ci`, `chore`, `perf`, `style`, `revert`. `style` describes formatting changes, not a UI feature. Scopes identify a coherent area, for example `tasks`, `groups`, `auth`, `web`, `api`, `design`, or `workspace`; omit the scope when no one area describes the change. Scopes are not Nx tags.

Examples:

```text
build(workspace): initialize Nx application shells
feat(tasks): add personal task creation
fix(auth): reject replayed OAuth callbacks
docs(design): normalize theme tokens
test(groups): cover invitation acceptance
```

Breaking changes use `!` before the colon and/or a `BREAKING CHANGE:` footer; describe the incompatibility and migration. Separate unrelated changes into focused commits. PR titles follow the same convention and summarize the final net change, not the conversation history.

During F01, add commitlint with the conventional preset, a local commit-message hook, and CI validation of PR titles and PR commit messages. Check valid/invalid examples. Hooks are convenience; CI is the enforcement point. Define the checked commit range against the actual target branch and preserve sufficient Git history. No npm dependency, hook, or workflow is installed by this document. Squash merging is a recommendation, not a repository setting changed here; if adopted, the final squash title must also follow the convention.

## PR workflow

Never commit directly on `main`, including an initial/root commit. Apply the same restriction to `master` and any other repository default branch. Before every commit, inspect the current branch and confirm it is a dedicated task branch. Create a task branch first when on a protected/default branch; if HEAD is detached, create or switch to an appropriate task branch before committing. Preserve existing working changes when switching. This requirement applies to all commit workflows, including `yeet`; being on an existing branch does not exempt it from the check. Direct pushes to `main`, `master`, or the default branch are also prohibited; deliver changes through a PR. Do not merge or alter GitHub branch protection without an explicit request.

Use the repository PR template and English prose. State the problem and resulting behavior; include scope, meaningful verification, and limitations. Do not claim tests passed when they were not run. Document browser review for UI changes and contract/client regeneration for API changes when applicable. Use `N/A` with a reason for inapplicable checks.

Work on a focused branch. Discover the actual default/target branch instead of assuming `main` or `master`. Inspect the full diff and working tree before staging. Stage only intended task files/hunks; never blindly include unrelated user changes. Never commit credentials, authentication state, traces, screenshots from test runs, or temporary files. Design source assets intentionally provided for the repository are distinct from test artifacts.

When PR publication is authorized, run relevant checks, inspect the proposed title/body, push the intended branch, and create a draft PR by default. If the branch already has a PR, update it in place and preserve its review state. Do not merge, force-push, rewrite existing commits, change branch protection, or pull an arbitrary branch to address an authentication failure. Resolve authentication and branch state explicitly.

Pass multiline descriptions through `--body-file` containing real newlines. Attach every created PR to the current Codex task with the app attachment tool. PR creation, commit, and push must remain within the user's authorized task; configuring this workflow does not authorize publishing the current planning changes.

## Selected skill

Official OpenAI skill: [yeet](https://github.com/openai/skills/tree/main/skills/.curated/yeet). Its supported flow stages, commits, pushes, and opens a GitHub PR using `gh`; invoke only for a request authorizing that flow. It requires GitHub CLI and a valid authenticated session. A future PR-only request may use `gh` directly without invoking a skill that also commits/pushes.

The owner's installation is available at `.agents/skills/yeet/SKILL.md`, with supporting files recorded in `docs/skills.md`. The previous helper's network failure is historical. The installed upstream revision is not recorded. Verify `gh` availability/authentication and repository/remote prerequisites when an actual PR flow is requested.

Project instructions override generic skill steps: use Conventional Commits; stage intended files only rather than `git add -A`; preserve the approved verification requirements; use native PowerShell; never blindly pull `master` on push failure; attach the resulting PR to the task. Adding a skill does not replace repository/remote/authentication prerequisites or authorize extra agents.

## References

- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).
- [Selected PR skill source](https://github.com/openai/skills/blob/main/skills/.curated/yeet/SKILL.md).
