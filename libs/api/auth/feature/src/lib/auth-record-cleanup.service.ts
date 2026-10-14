import { performance } from 'node:perf_hooks';
import { Interval } from '@nestjs/schedule';
import { Inject, Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { AUTH_CLEANUP_BATCH_SIZE, AuthCleanupKind, AuthRecordCleanupStore } from '@daylo/api/auth/data-access';

export const AUTH_CLEANUP_INTERVAL_MS = 15 * 60 * 1000;
export const AUTH_CLEANUP_RUN_BUDGET_MS = 5000;
const MINIMUM_BATCH_BUDGET_MS = 200;

type CleanupOutcome = 'completed' | 'stopped' | 'budget_exhausted' | 'worker_busy' | 'failed';
interface CleanupRun {
  started: number;
  cutoff: Date;
  deleted: Record<AuthCleanupKind, number>;
}

const remainingBudget = (run: CleanupRun) =>
  Math.floor(AUTH_CLEANUP_RUN_BUDGET_MS - (performance.now() - run.started));

@Injectable()
export class AuthRecordCleanupService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AuthRecordCleanupService.name);
  private running?: Promise<void>;
  private stopped = false;

  constructor(@Inject(AuthRecordCleanupStore) private readonly store: AuthRecordCleanupStore) {}

  onApplicationBootstrap(): void {
    void this.run();
  }

  async onModuleDestroy(): Promise<void> {
    this.stopped = true;
    await this.running;
  }

  @Interval('auth-record-cleanup', AUTH_CLEANUP_INTERVAL_MS)
  run(): Promise<void> {
    if (this.stopped) return Promise.resolve();
    return this.running ??= this.clean().finally(() => { this.running = undefined; });
  }

  private async clean(): Promise<void> {
    const run: CleanupRun = {
      started: performance.now(),
      cutoff: new Date(),
      deleted: { sessions: 0, oauth: 0 },
    };
    const outcome = await this.deletePendingBatches(run).catch((): CleanupOutcome => 'failed');
    this.report(run, outcome);
  }

  private async deletePendingBatches(run: CleanupRun): Promise<CleanupOutcome> {
    let pending: AuthCleanupKind[] = ['sessions', 'oauth'];
    while (pending.length) {
      const budget = remainingBudget(run);
      const stopReason = this.stopReason(budget);
      if (stopReason) return stopReason;

      const [kind, ...remaining] = pending;
      const count = await this.store.deleteBatch(kind, run.cutoff, budget);
      if (count === null) return 'worker_busy';

      run.deleted[kind] += count;
      // A full batch rejoins the tail, alternating tables until each is drained.
      pending = count === AUTH_CLEANUP_BATCH_SIZE ? [...remaining, kind] : remaining;
    }
    return 'completed';
  }

  private stopReason(budget: number): CleanupOutcome | undefined {
    if (this.stopped) return 'stopped';
    if (budget < MINIMUM_BATCH_BUDGET_MS) return 'budget_exhausted';
    return undefined;
  }

  private report(run: CleanupRun, outcome: CleanupOutcome): void {
    const summary = JSON.stringify({
      event: 'auth_record_cleanup', outcome,
      sessionsDeleted: run.deleted.sessions, oauthDeleted: run.deleted.oauth,
      durationMs: Math.round(performance.now() - run.started),
    });
    try {
      if (outcome === 'failed') this.logger.warn(summary);
      else this.logger.log(summary);
    } catch { /* Operational output must not stop the API or escape the timer. */ }
  }
}
