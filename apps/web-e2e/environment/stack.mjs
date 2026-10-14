import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { mkdir, open, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { createProvider } from './provider.mjs';
import { createFrontend } from './frontend.mjs';
import { seed, accounts } from './fixtures.mjs';
import { assertContainer, assertDatabase, containerName } from './safety.mjs';
import { close, listen, run, start, stop, waitForReady } from './process.mjs';

export const workspace = resolve(import.meta.dirname, '../../..');
const require = createRequire(import.meta.url);
const nxPackage = require.resolve('nx/package.json');
const nx = resolve(dirname(nxPackage), require(nxPackage).bin.nx);
const capture = { stdio: ['ignore', 'pipe', 'inherit'] };

// Keep personal configuration/secrets out of child processes. All application
// values below are generated, rather than loaded from the owner's .env files.
function systemEnvironment() {
  return Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    /^(path|systemroot|windir|comspec|pathext|temp|tmp|home|userprofile|appdata|localappdata|programfiles|programfiles\(x86\)|ci|docker_host|docker_context|docker_config)$/i.test(key)));
}

export async function startStack({ failAfter } = {}) {
  const runId = randomBytes(12).toString('hex');
  const name = containerName(runId);
  const directory = resolve(workspace, 'dist/.playwright/environment', runId);
  await mkdir(directory, { recursive: true });
  const containerIdFile = resolve(directory, 'container.id');
  const password = randomBytes(24).toString('hex');
  const clientId = 'daylo-e2e.apps.googleusercontent.com';
  const clientSecret = randomBytes(24).toString('hex');
  const env = { ...systemEnvironment(), NX_DAEMON: 'false', NX_NO_CLOUD: 'true',
    NODE_ENV: 'test', DAYLO_E2E_RUN_ID: runId,
    POSTGRES_PASSWORD: password, GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret,
    INITIAL_OWNER_EMAIL: accounts.owner.email, OAUTH_PKCE_ENCRYPTION_KEY: randomBytes(32).toString('hex') };
  let container;
  let api;
  let provider;
  let frontend;
  let reservation;
  let log;
  let cleanupPromise;
  const cleanup = () => cleanupPromise ??= (async () => {
    const failures = [];
    // Continue cleanup when an individual resource fails to stop.
    for (const action of [() => close(frontend), () => stop(api), () => close(provider),
      () => close(reservation), async () => {
        if (!container) {
          try { container = (await readFile(containerIdFile, 'utf8')).trim(); }
          catch (error) { if (error.code === 'ENOENT') return; throw error; }
        }
        if (!/^[a-f0-9]{64}$/.test(container)) throw new Error('Invalid owned container identity');
        const [details] = JSON.parse(await run('docker', ['inspect', container], capture));
        assertContainer(details, runId);
        await run('docker', ['rm', '--force', container], capture);
      }, () => log?.close()]) {
      try { await action(); } catch (error) { failures.push(error); }
    }
    await writeFile(resolve(directory, 'cleanup.json'), JSON.stringify({ runId, completed: failures.length === 0 }));
    if (failures.length) throw new AggregateError(failures, 'E2E cleanup incomplete');
  })();
  try {
    await run('docker', ['create', '--cidfile', containerIdFile, '--name', name, '--label', `daylo.e2e.run=${runId}`,
      '--publish', '127.0.0.1::5432', '--env', 'POSTGRES_PASSWORD', '--env', 'POSTGRES_USER=daylo_e2e',
      '--env', `POSTGRES_DB=daylo_e2e_${runId}`, '--tmpfs', '/var/lib/postgresql/data', 'postgres:17-alpine'],
    { ...capture, env, timeout: 180_000 });
    container = (await readFile(containerIdFile, 'utf8')).trim();
    await run('docker', ['start', container], capture);
    const [details] = JSON.parse(await run('docker', ['inspect', container], capture));
    assertContainer(details, runId);
    const port = details.NetworkSettings.Ports['5432/tcp'][0].HostPort;
    const databaseUrl = assertDatabase(`postgresql://daylo_e2e:${password}@127.0.0.1:${port}/daylo_e2e_${runId}`, runId);
    env.DATABASE_URL = databaseUrl;
    env.DAYLO_E2E_DATABASE_URL = databaseUrl;
    // PostgreSQL readiness is checked inside the exact container we created.
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        await run('docker', ['exec', container, 'pg_isready', '-U', 'daylo_e2e', '-d', `daylo_e2e_${runId}`], { stdio: 'ignore' });
        ready = true; break;
      } catch { await new Promise((resolve) => setTimeout(resolve, 250)); }
    }
    if (!ready) throw new Error('Isolated PostgreSQL did not become ready');
    if (failAfter === 'database') throw new Error('Injected failure after database startup');
    await run(process.execPath, [nx, 'run', 'api-core-database:prisma-migrate-deploy'], { cwd: workspace, env });
    await seed(databaseUrl, runId);
    // Reserve the frontend port until the actual server binds. Neither it nor
    // the API ever reuses an existing server. Kernel-assigned ports avoid races.
    reservation = createServer();
    const baseUrl = await listen(reservation);
    env.FRONTEND_ORIGIN = baseUrl;
    env.DAYLO_E2E_BASE_URL = baseUrl;
    env.GOOGLE_CALLBACK_URL = `${baseUrl}/api/auth/google/callback`;
    provider = createProvider({ clientId, clientSecret, callback: env.GOOGLE_CALLBACK_URL });
    env.DAYLO_E2E_PROVIDER_ORIGIN = await listen(provider);
    // The test bootstrap binds port 0 and communicates its actual address over
    // a run-private file; no unrelated listener can satisfy readiness.
    env.PORT = '1'; // Validated configuration; listen(0) below is test-bootstrap only.
    env.DAYLO_E2E_READY_FILE = resolve(directory, 'api-ready.json');
    log = await open(resolve(directory, 'api.log'), 'w');
    api = start(process.execPath, [resolve(workspace, 'dist/tools/e2e-api/main.js')],
      { cwd: directory, env, stdio: ['ignore', log.fd, log.fd] });
    let apiOrigin;
    for (let attempt = 0; attempt < 120; attempt++) {
      if (api.exitCode !== null || api.failure) throw new Error(`E2E API exited; see ${directory}/api.log`);
      try {
        const info = JSON.parse(await readFile(env.DAYLO_E2E_READY_FILE, 'utf8'));
        if (info.runId !== runId) throw new Error('API identity mismatch');
        apiOrigin = info.origin; break;
      } catch { await new Promise((resolve) => setTimeout(resolve, 250)); }
    }
    if (!apiOrigin) throw new Error('E2E API readiness file timed out');
    await waitForReady(`${apiOrigin}/api/health/ready`, api);
    if (failAfter === 'api') throw new Error('Injected failure after API startup');
    frontend = createFrontend(resolve(workspace, 'dist/apps/web/browser'), apiOrigin);
    await close(reservation);
    await listen(frontend, Number(new URL(baseUrl).port));
    await waitForReady(`${baseUrl}/login`, api);
    // Persist only public addresses, never credentials, tokens or browser state.
    await writeFile(resolve(directory, 'stack.json'), JSON.stringify({ runId, baseUrl, apiOrigin, container: name }));
    console.log(`E2E stack ${runId}: ${baseUrl}`);
    return { runId, baseUrl, databaseUrl, env, directory, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
