import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { clientPath, specificationPath, readArtifacts, compareArtifacts } from './artifacts.mjs';

test('reports contract changes, missing files and unexpected files without rewriting source', async () => {
  const root = await mkdtemp(join(tmpdir(), 'daylo-drift-'));
  try {
    await mkdir(join(root, 'docs/api'), { recursive: true });
    await mkdir(join(root, clientPath, 'model'), { recursive: true });
    await writeFile(join(root, specificationPath), '{"oldContract":true}\n');
    await writeFile(join(root, clientPath, 'model/session.ts'), 'old model\n');
    await writeFile(join(root, clientPath, 'unexpected.txt'), 'unexpected file\n');
    const before = await readArtifacts(root);
    const expected = new Map([
      [specificationPath, Buffer.from('{"newContract":true}\n')],
      [`${clientPath}/model/session.ts`, Buffer.from('new model\n')],
      [`${clientPath}/api/session.ts`, Buffer.from('new service\n')],
    ]);
    assert.deepEqual(compareArtifacts(before, expected), [
      `changed: ${specificationPath}`,
      `added: ${clientPath}/api/session.ts`,
      `changed: ${clientPath}/model/session.ts`,
      `removed: ${clientPath}/unexpected.txt`,
    ]);
    assert.deepEqual(await readArtifacts(root), before);
    assert.deepEqual(compareArtifacts(before, before), []);
    await rm(join(root, clientPath), { recursive: true });
    await rm(join(root, specificationPath));
    assert.equal((await readArtifacts(root)).size, 0);
    assert.equal(compareArtifacts(await readArtifacts(root), expected).length, 3);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
