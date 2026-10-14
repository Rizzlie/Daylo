import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { startStack, workspace } from './stack.mjs';
import { close, listen, run, start, stop, waitForReady } from './process.mjs';

const capture = { stdio: ['ignore', 'pipe', 'inherit'] };
async function containers() {
  const output = await run('docker', ['ps', '-aq', '--filter', 'label=daylo.e2e.run'], capture);
  return output.split(/\s+/).filter(Boolean).sort();
}

test('partial startup failures remove their owned resources', { timeout: 120_000 }, async () => {
  const baseline = await containers();
  for (const failAfter of ['database', 'api']) {
    await assert.rejects(startStack({ failAfter }), /Injected failure/);
    assert.deepEqual(await containers(), baseline);
  }
});

test('two stacks isolate databases; normal API cannot enable test Google', { timeout: 180_000 }, async () => {
  let first;
  let second;
  let normalApi;
  let reservation;
  let pool;
  try {
    first = await startStack();
    second = await startStack();
    assert.notEqual(first.databaseUrl, second.databaseUrl);
    assert.notEqual(first.baseUrl, second.baseUrl);
    pool = new Pool({ connectionString: first.databaseUrl });
    await pool.query("UPDATE users SET display_name='first stack only' WHERE google_subject='daylo-e2e-owner'");
    const otherPool = new Pool({ connectionString: second.databaseUrl });
    try {
      const rows = await otherPool.query("SELECT display_name FROM users WHERE google_subject='daylo-e2e-owner'");
      assert.equal(rows.rows[0].display_name, 'E2E owner');
    } finally { await otherPool.end(); }
    await second.cleanup();
    assert.equal((await fetch(`${first.baseUrl}/api/health/ready`)).status, 200);
    reservation = createServer();
    const origin = await listen(reservation);
    await close(reservation);
    normalApi = start(process.execPath, [resolve(workspace, 'dist/apps/api/main.js')], {
      cwd: workspace, stdio: 'ignore', env: { ...first.env, PORT: new URL(origin).port },
    });
    await waitForReady(`${origin}/api/health/ready`, normalApi);
    const response = await fetch(`${origin}/api/auth/google`, { redirect: 'manual' });
    assert.equal(response.status, 302);
    assert.equal(new URL(response.headers.get('location')).hostname, 'accounts.google.com');
    // Production artifact contains no alternative entrypoint/provider switches.
    const bundle = await readFile(resolve(workspace, 'dist/apps/api/main.js'), 'utf8');
    assert.equal(bundle.includes('DAYLO_E2E_PROVIDER_ORIGIN'), false);
    assert.equal(bundle.includes('E2E bootstrap requires'), false);
    for (const environment of ['development', 'production']) {
      await assert.rejects(run(process.execPath, [resolve(workspace, 'dist/tools/e2e-api/main.js')],
        { env: { ...first.env, NODE_ENV: environment }, stdio: 'ignore' }));
    }
  } finally {
    await pool?.end();
    await stop(normalApi);
    await close(reservation);
    await second?.cleanup();
    await first?.cleanup();
  }
  const record = JSON.parse(await readFile(resolve(first.directory, 'cleanup.json'), 'utf8'));
  assert.equal(record.completed, true);
});
