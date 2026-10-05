import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

const preset = nxE2EPreset(import.meta.dirname, {
  testDir: './src',
  openHtmlReport: 'never',
});

export default defineConfig({
  ...preset,
  reporter: [['list'], ...preset.reporter],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
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
