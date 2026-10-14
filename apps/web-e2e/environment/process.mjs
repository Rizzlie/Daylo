import { spawn } from 'node:child_process';
import { once } from 'node:events';

export function start(command, args, options = {}) {
  const child = spawn(command, args, { windowsHide: true, stdio: 'inherit', ...options });
  // Attach immediately so a failed executable cannot become an unhandled error.
  child.failure = undefined;
  child.on('error', (error) => { child.failure = error; });
  child.completion = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code, signal) => resolve({ code, signal }));
  });
  child.completion.catch(() => undefined);
  return child;
}

export async function run(command, args, options = {}) {
  const child = start(command, args, { timeout: 60_000, ...options });
  let output = '';
  child.stdout?.on('data', (chunk) => { output += chunk; });
  const { code } = await child.completion;
  if (code !== 0) throw new Error(`${command} failed (exit ${code})`);
  return output.trim();
}

export async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode || child.failure) return;
  if (process.platform === 'win32') {
    // This tree belongs to this runner; do not search for or kill port owners.
    await run('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
    const exited = await Promise.race([child.completion.then(() => true),
      new Promise((resolve) => { const timer = setTimeout(() => resolve(false), 5000); timer.unref(); })]);
    if (!exited) child.kill('SIGKILL');
  }
  await child.completion;
}

export async function listen(server, port = 0) {
  server.listen(port, '127.0.0.1');
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}`;
}

export async function close(server) {
  if (!server?.listening) return;
  server.closeAllConnections?.();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

export async function waitForReady(url, child, timeout = 30_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (child?.failure || (child && child.exitCode !== null)) throw new Error('Owned service exited before readiness');
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch { /* An owned service may still be starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Owned service readiness timed out');
}
