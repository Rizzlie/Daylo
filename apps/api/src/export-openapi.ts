import 'reflect-metadata';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { exportOpenApiDocument, serializeOpenApiDocument } from './app/openapi-export';

async function main(): Promise<void> {
  const output = resolve(process.argv[2] ?? 'docs/api/openapi.json');
  const document = await exportOpenApiDocument();
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, serializeOpenApiDocument(document), 'utf8');
  console.log('OpenAPI document exported successfully.');
}

main().catch(() => {
  console.error('OpenAPI export failed.');
  process.exitCode = 1;
});
