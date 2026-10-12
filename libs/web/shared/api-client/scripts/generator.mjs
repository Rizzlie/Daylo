import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const image = 'openapitools/openapi-generator-cli:v7.26.0@sha256:a304ddf1e2e5f24f68fa3153568d6174cea4959d09aa8e3db6d526fd0782326d';

export async function generateClient(root, specification, destination) {
  const temporaryRoot = resolve(root, 'dist/tools/openapi-generator');
  await mkdir(temporaryRoot, { recursive: true });
  const staging = await mkdtemp(join(temporaryRoot, 'client-'));
  try {
    const result = spawnSync('docker', [
      'run', '--rm',
      '--mount', `type=bind,source=${root},target=/workspace,readonly`,
      '--mount', `type=bind,source=${staging},target=/output`,
      ...(process.platform === 'win32' ? [] : ['--user', `${process.getuid()}:${process.getgid()}`]),
      image, 'generate', '-g', 'typescript-angular',
      '-i', '/workspace/' + relative(root, specification).replaceAll('\\', '/'),
      '-c', '/workspace/libs/web/shared/api-client/generator-config.json',
      '-o', '/output',
      '--global-property', 'apiDocs=false,modelDocs=false,apiTests=false,modelTests=false',
    ], { stdio: 'inherit', shell: false });
    if (result.error || result.status !== 0) {
      throw new Error('Client generation failed. Check Docker availability and generator output.');
    }
    // Publish only unmodified TypeScript sources after successful generation.
    // The caller chooses tracked output (generate) or temporary output (check).
    await rm(destination, { recursive: true, force: true });
    await cp(staging, destination, {
      recursive: true,
      filter: (source) => statSync(source).isDirectory()
        ? source.split(/[\\/]/).at(-1) !== '.openapi-generator'
        : source.endsWith('.ts'),
    });
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
