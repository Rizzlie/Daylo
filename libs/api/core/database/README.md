# api-core-database

This infrastructure library owns Daylo's PostgreSQL schema, versioned Prisma
migrations, generated Prisma client, database lifecycle, transaction execution
and database readiness probe. Business repositories and use-case transaction
orchestration belong to later feature tasks.

Feature use cases inject `TRANSACTION_RUNNER` from
`@daylo/api/core/transactions/contracts`. Data-access adapters inject
`PrismaService` and call `getTransactionClient(context)` when participating in
an existing transaction. Prisma types stay inside infrastructure and
data-access implementations.

## Prisma targets

The Prisma CLI reads `DATABASE_URL` through the root `prisma.config.ts`.

```powershell
npm exec nx -- run api-core-database:prisma-generate
npm exec nx -- run api-core-database:prisma-migrate-deploy
npm exec nx -- run api-core-database:prisma-verify
```

`prisma-migrate-deploy` applies committed migrations. `prisma-verify` expects an
already migrated, isolated PostgreSQL database and rolls its synthetic records
back before exiting. The generated client is reproducible output and is not
committed. The database test target and API build depend on `prisma-generate`,
which uses a non-secret placeholder URL because client generation does not
connect to PostgreSQL.

This library owns Daylo's PostgreSQL readiness probe and the
`GET /api/health/ready` controller.

## Running unit tests

Run `npm exec nx -- run api-core-database:test` to execute its Vitest tests.
The PostgreSQL integration suite is opt-in and expects an already migrated,
isolated database:

```powershell
$env:DATABASE_URL = 'postgresql://daylo:daylo-local@localhost:5433/daylo_test'
$env:RUN_DATABASE_INTEGRATION = 'true'
npm exec nx -- run api-core-database:test --skipNxCache
```
