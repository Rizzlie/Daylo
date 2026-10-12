import { resolve } from 'node:path';
import { generateClient } from './generator.mjs';

const root = process.cwd();
await generateClient(
  root,
  resolve(root, 'docs/api/openapi.json'),
  resolve(root, 'libs/web/shared/api-client/src/generated'),
);
