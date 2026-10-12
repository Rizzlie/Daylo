import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export const specificationPath = 'docs/api/openapi.json';
export const clientPath = 'libs/web/shared/api-client/src/generated';

// Include every file, including unexpected non-TypeScript files in generated output.
export async function readArtifacts(root) {
  const files = new Map();
  async function visit(path) {
    let entries;
    try {
      entries = await readdir(join(root, path), { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const child = `${path}/${entry.name}`;
      if (entry.isDirectory()) await visit(child);
      else if (entry.isFile()) files.set(child, await readFile(join(root, child)));
      else throw new Error(`Unsupported generated artifact: ${child}`);
    }
  }
  try {
    files.set(specificationPath, await readFile(join(root, specificationPath)));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await visit(clientPath);
  return files;
}

// Paths describe what regeneration would add, remove or change in source.
export function compareArtifacts(current, expected) {
  return [...new Set([...current.keys(), ...expected.keys()])].sort().flatMap((path) => {
    if (!current.has(path)) return [`added: ${path}`];
    if (!expected.has(path)) return [`removed: ${path}`];
    return current.get(path).equals(expected.get(path)) ? [] : [`changed: ${path}`];
  });
}
