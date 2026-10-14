import { resolve } from 'node:path';
import { access } from 'node:fs/promises';
import { startStack, workspace } from './stack.mjs';
import { start, stop } from './process.mjs';

let stack;
let shuttingDown = false;
let startup;
let tests;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    await stop(tests);
    const running = stack ?? await startup?.catch(() => undefined);
    await running?.cleanup();
  } finally { process.exit(130); }
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
try {
  startup = startStack();
  stack = await startup;
  if (shuttingDown) { await stack.cleanup(); process.exit(130); }
  if (process.argv.includes('--inspect')) {
    console.log(`Ready for browser inspection. Stop this target or create ${resolve(stack.directory, 'stop')} to clean up.`);
    await new Promise((resolveStop) => {
      const timer = setInterval(() => {
        access(resolve(stack.directory, 'stop')).then(() => { clearInterval(timer); resolveStop(); }).catch(() => undefined);
      }, 500);
    });
  } else {
    tests = start(process.execPath, [resolve(workspace, 'node_modules/@playwright/test/cli.js'), 'test',
      '--config=apps/web-e2e/fullstack.config.mts', ...process.argv.slice(2)], { cwd: workspace, env: stack.env });
    const { code } = await tests.completion;
    if (code !== 0) throw new Error(`Playwright failed (exit ${code})`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  try { await stack?.cleanup(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
