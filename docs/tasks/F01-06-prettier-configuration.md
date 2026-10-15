# F01-06 — Prettier configuration

Parent: F01 · [Task index](../tasks.md) · [Backlog](../backlog.md)

## Assumptions, discussion and authorization

The owner explicitly requested initializing Prettier on 2026-10-15. The announced
scope is dependency/configuration, npm commands through existing Nx formatting,
and documentation, without repository-wide reformatting. Use a pinned dev
dependency, two spaces, single quotes, trailing commas, 100 columns and LF.
Angular templates use the Angular parser. No application changes, CI gate or
additional plugins are in scope.

## Acceptance criteria

- Prettier is configured and available through `npm run format`/`format:check`.
- Generated contracts/clients/Prisma, original designs and managed skills are
  excluded, preserving deterministic generated output and original exports.
- Check selected configuration files and representative Angular syntax without
  reformatting unrelated work. Existing repository drift is reported honestly.

## Verification and delivery

Implemented with Prettier 3.9.10 pinned in package.json/package-lock.json,
`.prettierrc.json`, `.prettierignore`, Nx-backed npm commands and README guidance.
Only formatter/configuration files were formatted; Nx also normalizes its root
nx.json/tsconfig.base.json when formatting selected files. No application source
or whole-repository formatting was performed.

Verified formatter invocation, Angular control-flow template parsing/idempotence,
and exclusions for generated contracts/clients/Prisma, design exports, skills and
lock metadata. The full `npm run format:check` correctly exits 1 for existing
formatting differences; this is documented baseline drift, not a passing check.
The targeted configuration check passes. No dependency upgrades accompanied the
single Prettier addition. Owner-accepted on 2026-10-15.
No app tests/browser checks are needed for formatter-only configuration.

## Retrospective

Keep formatting setup separate from a repository-wide formatting change.
Nx formats root workspace/TypeScript configuration even with a selected file list;
account for that small normalization when reviewing formatter changes.
