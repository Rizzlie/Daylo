# F01-07 — Prettier pre-commit hook

Parent: F01 · [Task index](../tasks.md) · [Backlog](../backlog.md)

## Assumptions, discussion and authorization

The owner explicitly requested a Prettier pre-commit hook on 2026-10-15. The
announced scope uses the existing Husky setup and pinned lint-staged to format
only staged files, preserve partial staging through its default backup/hide
behavior and respect `.prettierignore`. Keep commitlint's commit-msg hook and
existing CI unchanged. No custom orchestration script or repository-wide format.

## Acceptance criteria

- Pre-commit invokes local lint-staged and Prettier; formatting failures block
  the commit, successful formatting is staged for the selected files only.
- Existing exclusions and unsupported file types are respected.
- Existing commit-message validation remains configured; hook files use LF.
- Do not create a real commit or stage the owner's working changes to test setup.

## Verification and delivery

Implemented with lint-staged 17.6.0 pinned, root package configuration and the
single-command `.husky/pre-commit` hook. Shell syntax, pinned configuration and LF
endings passed. Direct hook invocation passed with an empty staging area; the
index remained empty. The targeted Nx formatting check passed. No real commit or
partial-staging integration test was performed; backup/hide behavior uses the
installed tool's documented defaults without custom flags. Existing Prettier
ignore/parser checks from F01-06 remain applicable.
Application tests and browser checks are inapplicable to hook configuration.
Owner-accepted on 2026-10-15.

## Retrospective

Use lint-staged's established partial-staging behavior rather than a custom hook
that formats whole working files and stages unrelated hunks.
