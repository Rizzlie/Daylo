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

### F01

| Task | Title | Delivery status |
| --- | --- | --- |
| [F01-01](tasks/F01-01-angular-shell-review.md) | Angular shell review and completion | Closed: agreed scope implemented, checked and owner-accepted on 2026-10-05; E2E remains in F01-03 |
| [F01-02](tasks/F01-02-nestjs-shell-review.md) | NestJS shell review and acceptance | Implemented and verified; owner acceptance pending |
| [F01-03](tasks/F01-03-frontend-smoke-tests.md) | Frontend shell E2E smoke coverage | Pending |
| [F01-04](tasks/F01-04-library-boundaries.md) | Library boundaries and metadata checks | Pending |
| [F01-05](tasks/F01-05-commit-conventions-and-ci.md) | Commit conventions and foundation CI | Pending |

### F02

| Task | Title | Delivery status |
| --- | --- | --- |
| [F02-01](tasks/F02-01-local-postgresql-runtime.md) | Local PostgreSQL and runtime configuration | Pending |
| [F02-02](tasks/F02-02-database-readiness.md) | Database-aware API readiness | Pending |

### F03

| Task | Title | Delivery status |
| --- | --- | --- |
| [F03-01](tasks/F03-01-prisma-schema-and-migrations.md) | Prisma schema and migrations | Pending |
| [F03-02](tasks/F03-02-database-transaction-runner.md) | Database lifecycle and transaction runner | Pending |

### F04

| Task | Title | Delivery status |
| --- | --- | --- |
| [F04-01](tasks/F04-01-zod-validation-and-serialization.md) | Zod validation and response serialization | Pending |
| [F04-02](tasks/F04-02-session-contract-and-swagger.md) | Current-session contract and Swagger | Pending |

### F05

| Task | Title | Delivery status |
| --- | --- | --- |
| [F05-01](tasks/F05-01-openapi-angular-client-generation.md) | OpenAPI export and Angular client generation | Pending |
| [F05-02](tasks/F05-02-generated-client-drift-checks.md) | Generated-client drift checks | Pending |

### F06

| Task | Title | Delivery status |
| --- | --- | --- |
| [F06-01](tasks/F06-01-google-oidc-flow.md) | Google OIDC transaction flow | Pending |
| [F06-02](tasks/F06-02-identity-and-admission.md) | Identity and application admission | Pending |
| [F06-03](tasks/F06-03-sessions-and-csrf.md) | Database sessions and CSRF | Pending |
| [F06-04](tasks/F06-04-frontend-authentication.md) | Frontend authentication states | Pending |
| [F06-05](tasks/F06-05-google-smoke-verification.md) | Real Google smoke verification | Pending |

### F07

| Task | Title | Delivery status |
| --- | --- | --- |
| [F07-01](tasks/F07-01-isolated-e2e-environment.md) | Isolated real-stack E2E environment | Pending |
| [F07-02](tasks/F07-02-authentication-e2e-fixtures.md) | Authentication E2E and browser fixtures | Pending |

### M01

| Task | Title | Delivery status |
| --- | --- | --- |
| [M01-01](tasks/M01-01-personal-task-api.md) | Personal-task API and authorization | Pending |
| [M01-02](tasks/M01-02-personal-task-editor.md) | Personal-task editor and actions | Pending |

### M02

| Task | Title | Delivery status |
| --- | --- | --- |
| [M02-01](tasks/M02-01-today-retrieval-and-grouping.md) | Today retrieval and grouping | Pending |
| [M02-02](tasks/M02-02-today-screen.md) | Today screen and quick creation | Pending |
| [M02-03](tasks/M02-03-midnight-and-foreground-refresh.md) | Midnight and foreground refresh | Pending |

### M03

| Task | Title | Delivery status |
| --- | --- | --- |
| [M03-01](tasks/M03-01-groups-and-member-access.md) | Groups and member access | Pending |
| [M03-02](tasks/M03-02-invitation-management.md) | Owner invitation management | Pending |
| [M03-03](tasks/M03-03-atomic-invitation-resolution.md) | Atomic invitation resolution | Pending |
| [M03-04](tasks/M03-04-groups-and-invitation-screens.md) | Groups and invitation screens | Pending |

### M04

| Task | Title | Delivery status |
| --- | --- | --- |
| [M04-01](tasks/M04-01-shared-task-operations.md) | Shared-task operations | Pending |
| [M04-02](tasks/M04-02-authorized-sse-updates.md) | Authorized post-commit SSE | Pending |
| [M04-03](tasks/M04-03-live-updates-and-reconnection.md) | Live frontend updates and reconnection | Pending |

### M05

| Task | Title | Delivery status |
| --- | --- | --- |
| [M05-01](tasks/M05-01-theme-acceptance.md) | Theme acceptance and rendered-control review | Theme delivered; control review/acceptance pending |
| [M05-02](tasks/M05-02-responsive-shell-and-identity.md) | Responsive shell and Daylo identity | Pending |
| [M05-03](tasks/M05-03-preferences-and-settings.md) | Persisted preferences and Settings | Pending |
| [M05-04](tasks/M05-04-accessibility-review.md) | Cross-feature accessibility review | Pending |

### M06

| Task | Title | Delivery status |
| --- | --- | --- |
| [M06-01](tasks/M06-01-mvp-verification.md) | Automated and browser MVP verification | Pending |
| [M06-02](tasks/M06-02-seven-day-acceptance-exercise.md) | Seven-day owner acceptance exercise | Pending |

## Suggested discussion order

Finish and review F01, then F02 → F03 → F04 → F05 → F06 → F07. After foundation acceptance, discuss M05-02 for the shell, M01, M02, M03, M04, remaining M05 and M06. Preferences may be delivered earlier once their dependencies exist. Existing API and theme work should be reused, not regenerated unnecessarily.

Each task file records its dependencies. Selecting or discussing a task does not start dependent tasks. No acceptance status is changed by this documentation reorganization.

