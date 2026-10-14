import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { assertContainer, assertDatabase } from './safety.mjs';
import { close, listen } from './process.mjs';

const runId = 'a'.repeat(24);
const database = `postgresql://daylo_e2e:synthetic@127.0.0.1:54321/daylo_e2e_${runId}`;
test('database guard rejects developer, remote and other-run destinations', () => {
  assert.equal(assertDatabase(database, runId), database);
  for (const invalid of [database.replace(`/daylo_e2e_${runId}`, '/daylo'),
    database.replace('127.0.0.1', 'database.example.test'), database.replace(runId, 'b'.repeat(24)),
    `${database}?schema=public`, database.replace('daylo_e2e:', 'daylo:')]) {
    assert.throws(() => assertDatabase(invalid, runId));
  }
});
test('cleanup refuses containers without both exact name and run label', () => {
  const container = { Name: `/daylo-e2e-${runId}`, Config: { Labels: { 'daylo.e2e.run': runId } } };
  assert.doesNotThrow(() => assertContainer(container, runId));
  assert.throws(() => assertContainer({ ...container, Name: '/daylo-postgres' }, runId));
  assert.throws(() => assertContainer({ ...container, Config: { Labels: {} } }, runId));
});
test('an occupied port fails and its existing listener stays alive', async () => {
  const owner = createServer();
  const contender = createServer();
  try {
    const origin = await listen(owner);
    await assert.rejects(listen(contender, Number(new URL(origin).port)), { code: 'EADDRINUSE' });
    assert.equal(owner.listening, true);
  } finally { await close(owner); await close(contender); }
});
