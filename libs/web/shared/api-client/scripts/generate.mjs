import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { statSync } from 'node:fs';

const root = process.cwd();
const temporaryRoot = resolve(root, 'dist/tools/openapi-generator');
await mkdir(temporaryRoot, { recursive: true });
const staging = await mkdtemp(join(temporaryRoot, 'client-'));
const containerStaging = '/workspace/' + staging.slice(root.length + 1).replaceAll('\\', '/');
const image = 'openapitools/openapi-generator-cli:v7.26.0@sha256:a304ddf1e2e5f24f68fa3153568d6174cea4959d09aa8e3db6d526fd0782326d';
const destination = resolve(root, 'libs/web/shared/api-client/src/generated');

try {
  const result = spawnSync('docker', [
    'run', '--rm', '--mount', `type=bind,source=${root},target=/workspace`,
    ...(process.platform === 'win32' ? [] : ['--user', `${process.getuid()}:${process.getgid()}`]),
    image, 'generate', '-g', 'typescript-angular',
    '-i', '/workspace/docs/api/openapi.json',
    '-c', '/workspace/libs/web/shared/api-client/generator-config.json',
    '-o', containerStaging,
    '--global-property', 'apiDocs=false,modelDocs=false,apiTests=false,modelTests=false',
  ], { stdio: 'inherit', shell: false });
  if (result.error || result.status !== 0) {
    throw new Error('Client generation failed. Check Docker availability and generator output.');
  }
  // Replace only generated output after successful generation; handwritten files
  // and Nx configuration live outside this owned directory.
  await rm(destination, { recursive: true, force: true });
  // Publish only TypeScript sources, excluding generator bookkeeping, shell
  // scripts and package documentation that do not belong to this Nx library.
  await cp(staging, destination, {
    recursive: true,
    filter: (source) => statSync(source).isDirectory()
      ? !['.openapi-generator'].includes(source.split(/[\\/]/).at(-1))
      : source.endsWith('.ts'),
  });
} finally {
  await rm(staging, { recursive: true, force: true });
}
