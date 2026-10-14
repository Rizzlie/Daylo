import { assertDatabase } from '../../environment/safety.mjs';

export function isolatedDatabaseUrl(): string {
  return assertDatabase(process.env['DAYLO_E2E_DATABASE_URL'], process.env['DAYLO_E2E_RUN_ID']);
}
