# Personal-task API

`ApiTasksFeatureModule` owns the controller, DTO boundary and personal-task use
cases. The application composes this module with the existing global session,
active-access, CSRF, validation, serialization and error policy.

All routes start at `/api/tasks/personal`:

| Method and suffix       | Operation                                                     |
| ----------------------- | ------------------------------------------------------------- |
| POST                    | Create a private task                                         |
| GET                     | List owned personal tasks with bounded UUID keyset pagination |
| GET `/:id`              | Read one owned personal task                                  |
| PATCH `/:id`            | Edit fields using the current body `version`                  |
| DELETE `/:id?version=…` | Delete using the current query `version`                      |
| POST `/:id/complete`    | Complete using the current body `version`                     |
| POST `/:id/reopen`      | Reopen using the current body `version`                       |

The service owns transaction boundaries. Resource access precedes version
comparison, so another user's task never reveals its version or existence.
Unchanged edits and repeated completion/reopening with a current version preserve
all timestamps and the version. Stale requests return 409 even for a no-op.
Persistence failures return a redacted 503 and roll back the entire mutation.

Run `npm exec nx -- run api-tasks-feature:test` for Warsaw midnight/DST tests.
Real HTTP/PostgreSQL acceptance is in the API project; browser-session acceptance
is in `apps/web-e2e/src/personal-tasks.spec.ts`. No task editor, Today grouping,
group operation or SSE is delivered by this module yet.
