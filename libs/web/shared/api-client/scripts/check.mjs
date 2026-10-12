import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { generateClient } from './generator.mjs';
import { clientPath, specificationPath, readArtifacts, compareArtifacts } from './artifacts.mjs';

const root = process.cwd();
const temporaryRoot = resolve(root, 'dist/tools/openapi-check');
await mkdir(temporaryRoot, { recursive: true });
const staging = await mkdtemp(join(temporaryRoot, 'check-'));

function run(script, output) {
  const result = spawnSync(process.execPath, [resolve(root, script), output], {
    cwd: root, stdio: 'inherit', shell: false,
  });
  if (result.error || result.status !== 0) throw new Error(`Failed: ${script}`);
}

try {
  const before = await readArtifacts(root);
  const generations = [];
  for (const name of ['first', 'second']) {
    const outputRoot = join(staging, name);
    const specification = join(outputRoot, specificationPath);
    run('dist/tools/openapi-export/main.js', specification);
    run('apps/api/scripts/validate-openapi.mjs', specification);
    await generateClient(root, specification, join(outputRoot, clientPath));
    generations.push(await readArtifacts(outputRoot));
  }
  const unstable = compareArtifacts(generations[0], generations[1]);
  if (unstable.length) throw new Error(`Generation is not deterministic:\n${unstable.join('\n')}`);
  const rewritten = compareArtifacts(before, await readArtifacts(root));
  if (rewritten.length) throw new Error(`Source artifacts changed during verification:\n${rewritten.join('\n')}`);
  const drift = compareArtifacts(before, generations[0]);
  if (drift.length) {
    throw new Error(`Generated artifacts are out of date:\n${drift.join('\n')}\nRun npm run api:generate and review the changes.`);
  }
  console.log('OpenAPI and Angular client are current; two generations are identical. Source artifacts were unchanged.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await rm(staging, { recursive: true, force: true });
}
