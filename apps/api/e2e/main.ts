import { Test } from '@nestjs/testing';
import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_OAUTH_CLIENT } from '@daylo/api/auth/feature';
import { RuntimeAppModule } from '../src/app/runtime-app.module';
import { setupOpenApi } from '../src/app/openapi';
import { writeFile } from 'node:fs/promises';

async function bootstrap(): Promise<void> {
  const runId = process.env['DAYLO_E2E_RUN_ID'];
  const database = new URL(process.env['DATABASE_URL'] ?? 'http://invalid');
  const provider = new URL(process.env['DAYLO_E2E_PROVIDER_ORIGIN'] ?? 'http://invalid');
  if (process.env['NODE_ENV'] !== 'test' || !runId || !/^[a-f0-9]{24}$/.test(runId)
    || database.hostname !== '127.0.0.1' || database.pathname !== `/daylo_e2e_${runId}`
    || provider.hostname !== '127.0.0.1' || provider.protocol !== 'http:') {
    throw new Error('The E2E bootstrap requires an isolated runner-owned test environment');
  }
  const client = new OAuth2Client({
    clientId: process.env['GOOGLE_CLIENT_ID'],
    clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
    redirectUri: process.env['GOOGLE_CALLBACK_URL'],
    endpoints: {
      oauth2AuthBaseUrl: `${provider.origin}/authorize`,
      oauth2TokenUrl: `${provider.origin}/token`,
      oauth2FederatedSignonPemCertsUrl: `${provider.origin}/certs`,
    },
    transporterOptions: { timeout: 10_000, retry: false },
  });
  const module = await Test.createTestingModule({ imports: [RuntimeAppModule] })
    .overrideProvider(GOOGLE_OAUTH_CLIENT).useValue(client).compile();
  const app = module.createNestApplication();
  app.enableShutdownHooks();
  app.setGlobalPrefix('api');
  setupOpenApi(app);
  await app.listen(0, '127.0.0.1');
  await writeFile(process.env['DAYLO_E2E_READY_FILE'] as string,
    JSON.stringify({ runId, origin: await app.getUrl() }));
}

bootstrap().catch(() => {
  console.error('E2E API startup failed');
  process.exit(1);
});
