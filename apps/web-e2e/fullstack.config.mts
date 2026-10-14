import { defineConfig } from '@playwright/test';
import base from './playwright.config.mts';

if (!process.env['DAYLO_E2E_RUN_ID'] || !process.env['DAYLO_E2E_BASE_URL'] || !process.env['DAYLO_E2E_DATABASE_URL']) {
  throw new Error('Run the managed web-e2e:e2e-fullstack Nx target');
}

export default defineConfig({
  ...base,
  webServer: undefined,
  testIgnore: [],
  workers: 1,
  testMatch: ['**/shell.spec.ts', '**/authentication.spec.ts', '**/rate-limiting.spec.ts', '**/environment.spec.ts'],
  use: { ...base.use, baseURL: process.env['DAYLO_E2E_BASE_URL'] },
});
