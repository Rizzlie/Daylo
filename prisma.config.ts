import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'libs/api/core/database/prisma/schema.prisma',
  migrations: {
    path: 'libs/api/core/database/prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
