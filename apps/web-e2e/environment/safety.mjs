export function assertRunId(runId) {
  if (!/^[a-f0-9]{24}$/.test(runId ?? '')) throw new Error('Invalid E2E run identity');
}

export function assertDatabase(databaseUrl, runId) {
  assertRunId(runId);
  const url = new URL(databaseUrl);
  if (url.protocol !== 'postgresql:' || url.hostname !== '127.0.0.1'
    || url.pathname !== `/daylo_e2e_${runId}` || url.username !== 'daylo_e2e'
    || !url.password || !url.port || url.search || url.hash) {
    throw new Error('Only this run\'s isolated E2E database is allowed');
  }
  return databaseUrl;
}

export function containerName(runId) {
  assertRunId(runId);
  return `daylo-e2e-${runId}`;
}

export function assertContainer(container, runId) {
  if (container.Name !== `/${containerName(runId)}`
    || container.Config.Labels?.['daylo.e2e.run'] !== runId) {
    throw new Error('Refusing to remove a container not owned by this run');
  }
}
