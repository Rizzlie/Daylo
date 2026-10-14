import { performance } from 'node:perf_hooks';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import { ApiAuthCleanupModule, AuthRecordCleanupService, AUTH_CLEANUP_INTERVAL_MS } from '@daylo/api/auth/feature';
import { PrismaService } from '@daylo/api/core/database';
// eslint-disable-next-line @nx/enforce-module-boundaries -- Test-only cleanup persistence override; runtime imports the auth feature module.
import { AuthRecordCleanupStore } from '@daylo/api/auth/data-access';

describe('authentication cleanup scheduling and budget', () => {
  const store = { deleteBatch: vi.fn() };
  let service: AuthRecordCleanupService;
  let lines: string[];

  beforeEach(() => {
    store.deleteBatch.mockReset().mockResolvedValue(0);
    service = new AuthRecordCleanupService(store as unknown as ConstructorParameters<typeof AuthRecordCleanupService>[0]);
    lines = [];
    vi.spyOn(Logger.prototype, 'log').mockImplementation((line) => { lines.push(String(line)); });
    vi.spyOn(Logger.prototype, 'warn').mockImplementation((line) => { lines.push(String(line)); });
  });
  afterEach(async () => { await service.onModuleDestroy(); vi.restoreAllMocks(); vi.useRealTimers(); });

  it('runs on bootstrap and uses the Nest scheduler for each 15-minute interval', async () => {
    vi.useFakeTimers();
    const module = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot(), ApiAuthCleanupModule],
    }).overrideProvider(PrismaService).useValue({})
      .overrideProvider(AuthRecordCleanupStore).useValue(store).compile();
    service = module.get(AuthRecordCleanupService);
    await module.init();
    await vi.advanceTimersByTimeAsync(0);
    expect(store.deleteBatch).toHaveBeenCalledTimes(2);
    expect(module.get(SchedulerRegistry).getIntervals()).toContain('auth-record-cleanup');
    await vi.advanceTimersByTimeAsync(AUTH_CLEANUP_INTERVAL_MS);
    expect(store.deleteBatch).toHaveBeenCalledTimes(4);
    await module.close();
    await vi.advanceTimersByTimeAsync(AUTH_CLEANUP_INTERVAL_MS);
    expect(store.deleteBatch).toHaveBeenCalledTimes(4);
  });

  it('does not overlap executions and waits for the active batch at shutdown', async () => {
    let finish!: (count: number) => void;
    store.deleteBatch.mockImplementationOnce(() => new Promise<number>((resolve) => { finish = resolve; }));
    const first = service.run();
    expect(service.run()).toBe(first);
    const shutdown = service.onModuleDestroy();
    finish(500);
    await Promise.all([first, shutdown]);
    expect(store.deleteBatch).toHaveBeenCalledTimes(1);
    await service.run();
    expect(store.deleteBatch).toHaveBeenCalledTimes(1);
  });

  it('alternates full batches and uses one cutoff for the entire run', async () => {
    store.deleteBatch.mockResolvedValueOnce(500).mockResolvedValueOnce(500)
      .mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    await service.run();
    expect(store.deleteBatch.mock.calls.map(([kind]) => kind)).toEqual(['sessions', 'oauth', 'sessions', 'oauth']);
    expect(new Set(store.deleteBatch.mock.calls.map(([, cutoff]) => cutoff)).size).toBe(1);
    expect(JSON.parse(lines[0])).toMatchObject({ outcome: 'completed', sessionsDeleted: 501, oauthDeleted: 502 });
  });

  it('stops issuing batches when its monotonic five-second budget is spent', async () => {
    let elapsed = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => elapsed);
    store.deleteBatch.mockImplementation(async () => { elapsed += 2500; return 500; });
    await service.run();
    expect(store.deleteBatch).toHaveBeenCalledTimes(2);
    expect(store.deleteBatch.mock.calls.map(([, , budget]) => budget)).toEqual([5000, 2500]);
    expect(JSON.parse(lines[0]).outcome).toBe('budget_exhausted');
  });

  it('skips a busy database worker and retries on the next execution', async () => {
    store.deleteBatch.mockResolvedValueOnce(null);
    await service.run();
    expect(JSON.parse(lines[0]).outcome).toBe('worker_busy');
    await service.run();
    expect(JSON.parse(lines[1]).outcome).toBe('completed');
  });

  it('redacts failures, preserves committed counts and retries without rejecting', async () => {
    store.deleteBatch.mockResolvedValueOnce(500).mockRejectedValueOnce(new Error('secret-token database-url user@example.test'));
    await expect(service.run()).resolves.toBeUndefined();
    expect(JSON.parse(lines[0])).toMatchObject({ outcome: 'failed', sessionsDeleted: 500, oauthDeleted: 0 });
    expect(lines.join('')).not.toMatch(/secret-token|database-url|user@example/);
    await service.run();
    expect(JSON.parse(lines[1]).outcome).toBe('completed');
  });
});
