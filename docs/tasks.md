# Daylo — Task Index

Prepared: 2026-10-05. Each task has its own file under [tasks/](tasks/), containing assumptions, work to perform, acceptance criteria, verification, discussion topics and decision/delivery records. [Backlog](backlog.md) remains the parent-level source of truth.

## Required task workflow

Name each task file `{TASK-CODE}-{short-description}.md`. The description uses English lowercase words separated by hyphens and contains at most five words; for example, `F03-01-prisma-schema-and-migrations.md`. Keep task codes stable when renaming descriptions and update links.

1. Select one task and inspect its file and referenced requirements.
2. Discuss assumptions, behavior, scope, approach and verification with the owner **before implementation**. Resolve material ambiguity and record agreed decisions in that file.
3. Wait for the owner to explicitly request implementation of the agreed scope. Discussion or documentation approval alone does not authorize application changes.
4. Implement only that task, run applicable checks and browser inspection, and record evidence and limitations.
5. Request owner acceptance of delivered behavior; update the task and parent backlog accurately. Keep the next task pending until requested.

Task discussions remain **not started** unless their individual records state otherwise. F01-01 was discussed and its bounded completion scope authorized on 2026-10-05. Existing API-shell and theme implementation evidence is preserved; the discussion requirement applies before further implementation. Dependencies are prerequisites, not authorization. Work remains sequential and single-agent.

## Tasks

### API maintenance

| Task                                               | Title                    | Delivery status                                                                                                                                             |
| -------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [R01-01](tasks/R01-01-api-readability-refactor.md) | API readability refactor | Closed: full handwritten API scope implemented, locally verified and owner-accepted on 2026-10-14; [draft PR #23](https://github.com/Rizzlie/Daylo/pull/23) |

### F01

| Task                                                | Title                                 | Delivery status                                                                                                                         |
| --------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| [F01-01](tasks/F01-01-angular-shell-review.md)      | Angular shell review and completion   | Closed: agreed scope implemented, checked and owner-accepted on 2026-10-05; E2E remains in F01-03                                       |
| [F01-02](tasks/F01-02-nestjs-shell-review.md)       | NestJS shell review and acceptance    | Closed: reviewed, verified and owner-accepted on 2026-10-12                                                                             |
| [F01-03](tasks/F01-03-frontend-smoke-tests.md)      | Frontend shell E2E smoke coverage     | Delivered scope owner-accepted on 2026-10-12; desktop/mobile E2E and lint passed; independent browser inspection remains incomplete     |
| [F01-04](tasks/F01-04-library-boundaries.md)        | Library boundaries (built-in Nx rule) | Built-in Nx rule only; project lint and production builds passed; owner accepted the simplified scope on 2026-10-05                     |
| [F01-05](tasks/F01-05-commit-conventions-and-ci.md) | Commit conventions and foundation CI  | Delivered scope owner-accepted on 2026-10-12; local verification passed; GitHub-hosted execution remains unverified                     |
| [F01-06](tasks/F01-06-prettier-configuration.md)    | Prettier configuration                | Implemented; targeted config/parser/ignore checks pass; full-repo check reports existing formatting drift; owner-accepted on 2026-10-15 |
| [F01-07](tasks/F01-07-prettier-pre-commit-hook.md)  | Prettier pre-commit hook              | Implemented; configuration/shell/no-staged-files smoke passed without index changes; owner-accepted on 2026-10-15                       |

### F02

| Task                                               | Title                                      | Delivery status                                                                                                                                                 |
| -------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [F02-01](tasks/F02-01-local-postgresql-runtime.md) | Local PostgreSQL and runtime configuration | Closed: implemented, verified and owner-accepted on 2026-10-12                                                                                                  |
| [F02-02](tasks/F02-02-database-readiness.md)       | Database-aware API readiness               | Closed: implemented, verified and owner-accepted on 2026-10-12                                                                                                  |
| [F02-03](tasks/F02-03-local-stack-launcher.md)     | Local stack launcher                       | Implemented and locally verified on 2026-10-15: Compose, migrations, Nx servers, direct/proxied readiness and browser login smoke; owner-accepted on 2026-10-15 |

### F03

| Task                                                   | Title                                     | Delivery status                                                |
| ------------------------------------------------------ | ----------------------------------------- | -------------------------------------------------------------- |
| [F03-01](tasks/F03-01-prisma-schema-and-migrations.md) | Prisma schema and migrations              | Closed: implemented, verified and owner-accepted on 2026-10-12 |
| [F03-02](tasks/F03-02-database-transaction-runner.md)  | Database lifecycle and transaction runner | Closed: implemented, verified and owner-accepted on 2026-10-12 |

### F04

| Task                                                       | Title                                     | Delivery status                                                |
| ---------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------- |
| [F04-01](tasks/F04-01-zod-validation-and-serialization.md) | Zod validation and response serialization | Closed: implemented, verified and owner-accepted on 2026-10-12 |
| [F04-02](tasks/F04-02-session-contract-and-swagger.md)     | Current-session contract and Swagger      | Closed: implemented, verified and owner-accepted on 2026-10-12 |

### F05

| Task                                                        | Title                                        | Delivery status                                                                                 |
| ----------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [F05-01](tasks/F05-01-openapi-angular-client-generation.md) | OpenAPI export and Angular client generation | Closed: implemented, verified and owner-accepted on 2026-10-12                                  |
| [F05-02](tasks/F05-02-generated-client-drift-checks.md)     | Generated-client drift checks                | Closed: implemented, locally verified and owner-accepted on 2026-10-12; PR #13 hosted CI passed |

### F06

| Task                                                        | Title                                 | Delivery status                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [F06-01](tasks/F06-01-google-oidc-flow.md)                  | Google OIDC transaction flow          | Closed: agreed scope implemented, locally verified and owner-accepted on 2026-10-12; [draft PR #15](https://github.com/Rizzlie/Daylo/pull/15); real Google sign-in remains F06-05                                                                                                                    |
| [F06-02](tasks/F06-02-identity-and-admission.md)            | Identity and application admission    | Closed: implemented, locally verified and owner-accepted on 2026-10-12; [draft PR #16](https://github.com/Rizzlie/Daylo/pull/16); partial browser inspection                                                                                                                                         |
| [F06-03](tasks/F06-03-sessions-and-csrf.md)                 | Database sessions and CSRF            | Closed: implemented, locally verified and owner-accepted on 2026-10-12; [draft PR #17](https://github.com/Rizzlie/Daylo/pull/17); visual/console inspection incomplete                                                                                                                               |
| [F06-04](tasks/F06-04-frontend-authentication.md)           | Frontend authentication states        | Closed: delivered frontend auth, lazy login, named signals/router utilities and independent auth lifecycle locally verified and owner-accepted on 2026-10-13; real Google smoke remains F06-05                                                                                                       |
| [F06-05](tasks/F06-05-google-smoke-verification.md)         | Real Google smoke verification        | Recorded manual scope owner-accepted on 2026-10-13: real sign-in, reload, sign-out and protected-route recovery passed by owner report; independent technical inspection remains incomplete                                                                                                          |
| [F06-06](tasks/F06-06-authentication-security-hardening.md) | Authentication security hardening     | Closed: final email authority, 30-day cap and HTTPS cookie scope verified and owner-accepted on 2026-10-13; removed auth throttling replaced by the accepted global F06-07 scope; verification limits recorded in task                                                                               |
| [F06-07](tasks/F06-07-global-api-rate-limiting.md)          | Global API rate limiting              | Closed: implemented, locally verified and owner-accepted on 2026-10-13: global quotas, middleware coverage and safe 429 recovery; 195 API tests, 53 frontend/schema tests and 20 real-stack E2E cases passed                                                                                         |
| [F06-08](tasks/F06-08-pkce-for-google-oidc.md)              | PKCE for Google OIDC                  | Closed: implemented, locally verified and owner-accepted on 2026-10-13: encrypted S256 PKCE, 207 API tests, 28 configuration tests, 3 repository tests and 22 real-stack E2E cases passed; real Google PKCE smoke incomplete                                                                         |
| [F06-09](tasks/F06-09-production-security-headers.md)       | Production security headers           | Pending: owner deferred discussion until hosting decisions, before public exposure; authorization pending                                                                                                                                                                                            |
| [F06-10](tasks/F06-10-auth-security-event-logging.md)       | Authentication security event logging | Closed: implemented, locally verified and owner-accepted on 2026-10-13; [draft PR #22](https://github.com/Rizzlie/Daylo/pull/22); bounded redacted JSON stdout events; 215 API and 10 recorder tests passed; hosted collection/retention/alerts deferred                                             |
| [F06-11](tasks/F06-11-expired-auth-record-cleanup.md)       | Expired authentication record cleanup | Closed: implemented, locally verified and owner-accepted on 2026-10-14; NestJS scheduling, bounded PostgreSQL cleanup and declarative-code review; [draft PR #24](https://github.com/Rizzlie/Daylo/pull/24)                                                                                          |
| [F06-12](tasks/F06-12-security-dependency-review.md)        | Security dependency review            | Closed: implemented, locally verified and owner-accepted on 2026-10-14 after Nx migrate latest; [draft PR #25](https://github.com/Rizzlie/Daylo/pull/25); 357 test cases and 22 real-stack E2E passed; generated API artifact audit clean; six residual advisories and prune/browser limits retained |

### F07

| Task                                                  | Title                                   | Delivery status                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [F07-01](tasks/F07-01-isolated-e2e-environment.md)    | Isolated real-stack E2E environment     | Closed: implemented, locally verified and owner-accepted on 2026-10-14; six infrastructure tests, 24 real-stack desktop/mobile E2E cases and independent browser inspection passed; [draft PR #26](https://github.com/Rizzlie/Daylo/pull/26); recorded verification limits remain |
| [F07-02](tasks/F07-02-authentication-e2e-fixtures.md) | Authentication E2E and browser fixtures | Closed: implemented, locally verified and owner-accepted on 2026-10-14; 40 real-stack desktop/mobile cases, E2E lint/typecheck and independent browser inspection passed; [PR #27 ready for review](https://github.com/Rizzlie/Daylo/pull/27); recorded limits remain             |

### M01

| Task                                           | Title                               | Delivery status |
| ---------------------------------------------- | ----------------------------------- | --------------- |
| [M01-01](tasks/M01-01-personal-task-api.md)    | Personal-task API and authorization | Pending         |
| [M01-02](tasks/M01-02-personal-task-editor.md) | Personal-task editor and actions    | Pending         |

### M02

| Task                                                      | Title                           | Delivery status |
| --------------------------------------------------------- | ------------------------------- | --------------- |
| [M02-01](tasks/M02-01-today-retrieval-and-grouping.md)    | Today retrieval and grouping    | Pending         |
| [M02-02](tasks/M02-02-today-screen.md)                    | Today screen and quick creation | Pending         |
| [M02-03](tasks/M02-03-midnight-and-foreground-refresh.md) | Midnight and foreground refresh | Pending         |

### M03

| Task                                                    | Title                         | Delivery status |
| ------------------------------------------------------- | ----------------------------- | --------------- |
| [M03-01](tasks/M03-01-groups-and-member-access.md)      | Groups and member access      | Pending         |
| [M03-02](tasks/M03-02-invitation-management.md)         | Owner invitation management   | Pending         |
| [M03-03](tasks/M03-03-atomic-invitation-resolution.md)  | Atomic invitation resolution  | Pending         |
| [M03-04](tasks/M03-04-groups-and-invitation-screens.md) | Groups and invitation screens | Pending         |

### M04

| Task                                                    | Title                                  | Delivery status |
| ------------------------------------------------------- | -------------------------------------- | --------------- |
| [M04-01](tasks/M04-01-shared-task-operations.md)        | Shared-task operations                 | Pending         |
| [M04-02](tasks/M04-02-authorized-sse-updates.md)        | Authorized post-commit SSE             | Pending         |
| [M04-03](tasks/M04-03-live-updates-and-reconnection.md) | Live frontend updates and reconnection | Pending         |

### M05

| Task                                                    | Title                                        | Delivery status                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [M05-01](tasks/M05-01-theme-acceptance.md)              | Theme acceptance and rendered-control review | Delivered global theme owner-accepted on 2026-10-12; control/overlay/focus review remains pending                                                                                                                                                                                                          |
| [M05-02](tasks/M05-02-responsive-shell-and-identity.md) | Responsive shell and Daylo identity          | Implemented and locally verified on 2026-10-15; shared AppLayout, dedicated pages and session-loading ownership in AuthenticatedShell; latest refinement passed 26 unit/router tests, two foreground-expiry E2E and browser refresh checks; earlier evidence/limits recorded; owner-accepted on 2026-10-15 |
| [M05-03](tasks/M05-03-preferences-and-settings.md)      | Persisted preferences and Settings           | Pending                                                                                                                                                                                                                                                                                                    |
| [M05-04](tasks/M05-04-accessibility-review.md)          | Cross-feature accessibility review           | Pending                                                                                                                                                                                                                                                                                                    |

### M06

| Task                                                    | Title                                  | Delivery status |
| ------------------------------------------------------- | -------------------------------------- | --------------- |
| [M06-01](tasks/M06-01-mvp-verification.md)              | Automated and browser MVP verification | Pending         |
| [M06-02](tasks/M06-02-seven-day-acceptance-exercise.md) | Seven-day owner acceptance exercise    | Pending         |

## Suggested discussion order

Finish and review F01, then F02 → F03 → F04 → F05 → F06 → F07. After foundation acceptance, discuss M05-02 for the shell, M01, M02, M03, M04, remaining M05 and M06. Preferences may be delivered earlier once their dependencies exist. Existing API and theme work should be reused, not regenerated unnecessarily.

Each task file records its dependencies. Selecting or discussing a task does not start dependent tasks. No acceptance status is changed by this documentation reorganization.
