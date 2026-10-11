# api-core-database

This infrastructure library owns Daylo's PostgreSQL schema, versioned Prisma
migrations, generated Prisma client and database readiness probe. Business
repositories and transaction orchestration belong to later feature tasks.

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
committed.

This library owns Daylo's PostgreSQL readiness probe and the
`GET /api/health/ready` controller.

## Running unit tests

Run `npm exec nx -- run api-core-database:test` to execute its Vitest tests.
