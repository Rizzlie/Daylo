import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/api',
  plugins: [nxViteTsPaths()],
  // App and library exceptions must share the same NestJS constructor identity.
  resolve: { dedupe: ['@nestjs/common', '@nestjs/core'] },
  test: {
    name: 'api',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/api',
      provider: 'v8' as const,
    },
  },
}));
