import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

const preset = nxE2EPreset(import.meta.dirname, {
  testDir: './src',
  openHtmlReport: 'never',
});

export default defineConfig({
  ...preset,
  testIgnore: [
    '**/environment.spec.ts',
    '**/access.spec.ts',
    '**/personal-tasks.spec.ts',
    '**/personal-task-editor.spec.ts',
    '**/xsrf.spec.ts',
  ],
  reporter: [['list'], ...preset.reporter],
  // The local proxy deliberately shares one per-IP budget across browser contexts.
  workers: process.env['DAYLO_E2E_DATABASE_URL'] ? 1 : undefined,
  use: {
    baseURL: process.env['DAYLO_E2E_BASE_URL'] ?? 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: process.env['DAYLO_E2E_BASE_URL']
    ? undefined
    : {
        command: 'npx nx run web:serve',
        url: 'http://localhost:4200',
        // Nx infers the serve dependency and readiness gate before Playwright runs.
        reuseExistingServer: true,
        cwd: workspaceRoot,
      },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
    },
  ],
});
