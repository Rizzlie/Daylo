# Task persistence

`PersonalTaskStore` owns personal-task Prisma queries and explicit persistence
mapping. Every operation filters both creator and `groupId: null`, including
requests made by members of the same group. Public Zod schemas remain in
`shared-schemas`; Prisma types do not leave this library.

Mutations use the transaction context supplied by the feature use case. The
store locks the accessible task row with PostgreSQL `FOR UPDATE` before checking
the version or deciding whether a completion/edit is unchanged. Conditional
writes retain ownership, visibility and expected-version predicates.

Dates map through UTC midnight solely as PostgreSQL date values. Optional wall
clock times use the `1970-01-01` UTC anchor and expose only `HH:mm`; neither field
is converted into a user's timezone instant.

HTTP and PostgreSQL acceptance coverage lives in
`apps/api/src/app/personal-tasks-postgres.spec.ts`. See the M01-01 task record for
the isolated-database invocation and verification evidence.
