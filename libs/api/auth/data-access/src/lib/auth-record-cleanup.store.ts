import { Inject, Injectable } from '@nestjs/common';
import { PrismaService, PrismaTransactionContext } from '@daylo/api/core/database';
import { SESSION_MAX_AGE_SECONDS } from './session.store';

export const AUTH_CLEANUP_BATCH_SIZE = 500;
export type AuthCleanupKind = 'sessions' | 'oauth';
type CleanupClient = PrismaTransactionContext['client'];

function cleanupTimeouts(budgetMs: number) {
  if (!Number.isFinite(budgetMs) || budgetMs < 200 || budgetMs > 5000)
    throw new RangeError('Invalid authentication cleanup budget');
  return {
    transaction: { maxWait: 100, timeout: budgetMs - 100 },
    statementMs: Math.min(2000, budgetMs - 150),
  };
}

@Injectable()
export class AuthRecordCleanupStore {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async deleteBatch(kind: AuthCleanupKind, now: Date, budgetMs: number): Promise<number | null> {
    const timeouts = cleanupTimeouts(budgetMs);
    return this.prisma.client.$transaction(async (client) => {
      if (!await this.acquireCleanupLock(client)) return null;
      await this.setStatementTimeout(client, timeouts.statementMs);
      return kind === 'oauth'
        ? this.deleteExpiredOAuth(client, now)
        : this.deleteExpiredSessions(client, now);
    }, timeouts.transaction);
  }

  private async acquireCleanupLock(client: CleanupClient): Promise<boolean> {
    // Transaction-scoped coordination releases automatically on commit/error.
    // A busy worker skips rather than waiting behind another cleanup process.
    const [lock] = await client.$queryRaw<{ acquired: boolean }[]>`
      SELECT pg_try_advisory_xact_lock(60611) AS acquired
    `;
    return lock.acquired;
  }

  private async setStatementTimeout(client: CleanupClient, milliseconds: number): Promise<void> {
    await client.$queryRaw`
      SELECT set_config('statement_timeout', ${String(milliseconds)}, true)
    `;
  }

  private deleteExpiredOAuth(client: CleanupClient, now: Date): Promise<number> {
    return client.$executeRaw`
      WITH eligible AS (
        SELECT id FROM oauth_transactions
        WHERE expires_at <= ${now}
        ORDER BY expires_at, id
        LIMIT ${AUTH_CLEANUP_BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      )
      DELETE FROM oauth_transactions AS record USING eligible
      WHERE record.id = eligible.id
    `;
  }

  private deleteExpiredSessions(client: CleanupClient, now: Date): Promise<number> {
    const absoluteCutoff = new Date(now.getTime() - SESSION_MAX_AGE_SECONDS * 1000);
    // Row locks arbitrate with renewal/revocation. PostgreSQL rechecks updated
    // rows before locking; a renewed row cannot be deleted from a stale ID list.
    return client.$executeRaw`
      WITH eligible AS (
        SELECT id FROM sessions
        WHERE expires_at <= ${now} OR created_at <= ${absoluteCutoff}
        ORDER BY expires_at, id
        LIMIT ${AUTH_CLEANUP_BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      )
      DELETE FROM sessions AS record USING eligible
      WHERE record.id = eligible.id
    `;
  }
}
