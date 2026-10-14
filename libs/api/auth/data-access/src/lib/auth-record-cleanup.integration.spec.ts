import { randomBytes, randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@daylo/api/core/database';
import { AuthRecordCleanupStore } from './auth-record-cleanup.store';
import { OAuthTransactionStore } from './oauth-transaction.store';
import { SessionStore, SESSION_MAX_AGE_SECONDS } from './session.store';

const databaseUrl = process.env['F06_CLEANUP_TEST_DATABASE_URL'];
const hash = () => randomBytes(32).toString('hex');
const now = new Date('2026-10-14T12:00:00.000Z');
const absolute = new Date(now.getTime() - SESSION_MAX_AGE_SECONDS * 1000);
const later = new Date(now.getTime() + 60_000);

// Cleanup is global: this suite requires its own fresh database, separate from
// HTTP/repository regression fixtures and all development/production databases.
describe.skipIf(!databaseUrl)('authentication record cleanup PostgreSQL', () => {
  let prisma: PrismaService;
  let store: AuthRecordCleanupStore;
  let userId: string;
  const oauthIds: string[] = [];

  beforeAll(async () => {
    if (!databaseUrl || !/^\/daylo_f06_cleanup(?:_[a-z0-9_]+)?$/.test(new URL(databaseUrl).pathname))
      throw new Error('Cleanup tests require a dedicated daylo_f06_cleanup database');
    prisma = new PrismaService(new ConfigService({ runtime: { databaseUrl } }));
    await prisma.onModuleInit();
    if (await prisma.client.user.count() || await prisma.client.session.count() || await prisma.client.oAuthTransaction.count())
      throw new Error('Cleanup tests require an empty disposable database');
    store = new AuthRecordCleanupStore(prisma);
  });
  beforeEach(async () => {
    userId = '';
    const id = randomUUID();
    const user = await prisma.client.user.create({ data: {
      googleSubject: id, email: `${id}@example.test`, displayName: 'Synthetic cleanup user', accessStatus: 'ACTIVE',
    } });
    userId = user.id;
  });
  afterEach(async () => {
    // Never let an absent fixture ID turn a cleanup filter into an unscoped delete.
    if (!prisma || !userId) return;
    await prisma.client.oAuthTransaction.deleteMany({ where: { id: { in: oauthIds.splice(0) } } });
    await prisma.client.task.deleteMany({ where: { createdById: userId } });
    await prisma.client.invitation.deleteMany({ where: { invitedById: userId } });
    await prisma.client.group.deleteMany({ where: { ownerId: userId } });
    await prisma.client.user.deleteMany({ where: { id: userId } });
  });
  afterAll(async () => { await prisma?.onModuleDestroy(); });

  async function session(expiresAt = later, createdAt = now) {
    return prisma.client.session.create({ data: { userId, tokenHash: hash(), csrfTokenHash: hash(), expiresAt, createdAt } });
  }
  async function oauth(expiresAt = later) {
    const row = await prisma.client.oAuthTransaction.create({ data: {
      stateHash: hash(), browserBindingHash: hash(), nonce: hash(), encryptedVerifier: 'synthetic-ciphertext', expiresAt,
    } });
    oauthIds.push(row.id);
    return row;
  }
  async function withLock(sql: string, values: unknown[], action: (client: Client) => Promise<void>) {
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql, values);
      await action(client);
    } finally {
      await client.query('ROLLBACK');
      await client.end();
    }
  }

  it('removes both exact session cutoffs and legacy rows while keeping valid sessions and business data', async () => {
    const valid = await session(new Date(now.getTime() + 1), new Date(absolute.getTime() + 1));
    await session(now);
    await session(later, absolute);
    await session(later, new Date(absolute.getTime() - 1));
    const group = await prisma.client.group.create({ data: { ownerId: userId, name: 'Synthetic group' } });
    const invitation = await prisma.client.invitation.create({ data: {
      groupId: group.id, invitedById: userId, email: 'invitee@example.test', expiresAt: now,
    } });
    const task = await prisma.client.task.create({ data: { createdById: userId, title: 'Keep', scheduledDate: now } });
    await prisma.client.userPreferences.create({ data: { userId } });
    expect(await store.deleteBatch('sessions', now, 5000)).toBe(3);
    expect(await prisma.client.session.findUnique({ where: { id: valid.id } })).not.toBeNull();
    expect(await prisma.client.user.findUnique({ where: { id: userId } })).not.toBeNull();
    expect(await prisma.client.group.findUnique({ where: { id: group.id } })).not.toBeNull();
    expect(await prisma.client.invitation.findUnique({ where: { id: invitation.id } })).not.toBeNull();
    expect(await prisma.client.task.findUnique({ where: { id: task.id } })).not.toBeNull();
    expect(await prisma.client.userPreferences.findUnique({ where: { userId } })).not.toBeNull();
    expect(await store.deleteBatch('sessions', now, 5000)).toBe(0);
  });

  it('removes OAuth at the exact cutoff but preserves the next millisecond', async () => {
    await oauth(now);
    const valid = await oauth(new Date(now.getTime() + 1));
    expect(await store.deleteBatch('oauth', now, 5000)).toBe(1);
    expect(await prisma.client.oAuthTransaction.findUnique({ where: { id: valid.id } })).not.toBeNull();
    expect(await store.deleteBatch('oauth', now, 5000)).toBe(0);
  });

  it.each(['sessions', 'oauth'] as const)('limits each %s batch to 500 rows', async (kind) => {
    if (kind === 'sessions') {
      await prisma.client.session.createMany({ data: Array.from({ length: 503 }, () => ({
        userId, tokenHash: hash(), csrfTokenHash: hash(), expiresAt: now, createdAt: now,
      })) });
    } else {
      const data = Array.from({ length: 503 }, () => ({ id: randomUUID(), stateHash: hash(), browserBindingHash: hash(), nonce: hash(), expiresAt: now }));
      oauthIds.push(...data.map((row) => row.id));
      await prisma.client.oAuthTransaction.createMany({ data });
    }
    expect(await store.deleteBatch(kind, now, 5000)).toBe(500);
    expect(await store.deleteBatch(kind, now, 5000)).toBe(3);
    expect(await store.deleteBatch(kind, now, 5000)).toBe(0);
  });

  it('skips another worker without deleting and retries after its lock is released', async () => {
    const expired = await session(now);
    await withLock('SELECT pg_advisory_xact_lock(60611)', [], async () => {
      expect(await store.deleteBatch('sessions', now, 5000)).toBeNull();
      expect(await prisma.client.session.findUnique({ where: { id: expired.id } })).not.toBeNull();
    });
    expect(await store.deleteBatch('sessions', now, 5000)).toBe(1);
  });

  it('coordinates concurrent workers without double deletion', async () => {
    for (let i = 0; i < 5; i++) await session(now);
    const results = await Promise.all(Array.from({ length: 4 }, () => store.deleteBatch('sessions', now, 5000)));
    expect(results.reduce<number>((sum, count) => sum + (count ?? 0), 0)).toBe(5);
    expect(await store.deleteBatch('sessions', now, 5000)).toBe(0);
  });

  it('skips an in-flight renewal and keeps the committed renewed session', async () => {
    const row = await session(now);
    await withLock('UPDATE sessions SET expires_at = $1 WHERE id = $2::uuid', [later, row.id], async (client) => {
      expect(await store.deleteBatch('sessions', now, 5000)).toBe(0);
      await client.query('COMMIT');
    });
    expect(await store.deleteBatch('sessions', now, 5000)).toBe(0);
    expect(await new SessionStore(prisma).findValid(row.tokenHash, now)).not.toBeNull();
  });

  it('does not restore a concurrent revoked session', async () => {
    const row = await session(now);
    await withLock('DELETE FROM sessions WHERE id = $1::uuid', [row.id], async (client) => {
      expect(await store.deleteBatch('sessions', now, 5000)).toBe(0);
      await client.query('COMMIT');
    });
    expect(await new SessionStore(prisma).renew(row.tokenHash, now, later)).toBeNull();
    expect(await prisma.client.session.findUnique({ where: { id: row.id } })).toBeNull();
  });

  it('does not restore or reuse a concurrently consumed OAuth transaction', async () => {
    const row = await oauth(now);
    // Callback started one millisecond before the cleanup cutoff.
    await withLock('DELETE FROM oauth_transactions WHERE state_hash = $1 AND expires_at > $2',
      [row.stateHash, new Date(now.getTime() - 1)], async (client) => {
        expect(await store.deleteBatch('oauth', now, 5000)).toBe(0);
        await client.query('COMMIT');
      });
    expect(await new OAuthTransactionStore(prisma).consume(row.stateHash, row.browserBindingHash, now)).toBeNull();
  });

  it('times out blocked queries, keeps expired credentials invalid and retries afterwards', async () => {
    const row = await session(now);
    await withLock('LOCK TABLE sessions IN ACCESS EXCLUSIVE MODE', [], async () => {
      await expect(store.deleteBatch('sessions', now, 300)).rejects.toThrow();
    });
    expect(await prisma.client.session.findUnique({ where: { id: row.id } })).not.toBeNull();
    expect(await new SessionStore(prisma).findValid(row.tokenHash, now)).toBeNull();
    expect(await store.deleteBatch('sessions', now, 5000)).toBe(1);
  });

  it('retains valid sessions during real concurrent renewal and valid OAuth during callback', async () => {
    const row = await session();
    const attempt = await oauth();
    const [renewed, sessionCount, consumed, oauthCount] = await Promise.all([
      new SessionStore(prisma).renew(row.tokenHash, now, later),
      store.deleteBatch('sessions', now, 5000),
      new OAuthTransactionStore(prisma).consume(attempt.stateHash, attempt.browserBindingHash, now),
      store.deleteBatch('oauth', now, 5000),
    ]);
    expect(renewed).not.toBeNull();
    expect(consumed?.nonce).toBe(attempt.nonce);
    expect(sessionCount ?? 0).toBe(0);
    expect(oauthCount ?? 0).toBe(0);
  });

  it('rejects invalid time budgets before reaching the database', async () => {
    await expect(store.deleteBatch('sessions', now, 0)).rejects.toThrow(RangeError);
    await expect(store.deleteBatch('sessions', now, 5001)).rejects.toThrow(RangeError);
  });

  it('provides usable indexes for both expiry predicates and OAuth expiry', async () => {
    await session(now);
    await oauth(now);
    const plans = await prisma.client.$transaction(async (client) => {
      // Tiny fixtures normally favor sequential scans; disable them locally to
      // verify index eligibility, rather than claim a production benchmark.
      await client.$executeRaw`SET LOCAL enable_seqscan = off`;
      const sessions = await client.$queryRaw<{ 'QUERY PLAN': string }[]>`
        EXPLAIN SELECT id FROM sessions
        WHERE expires_at <= ${now} OR created_at <= ${absolute}
      `;
      const oauth = await client.$queryRaw<{ 'QUERY PLAN': string }[]>`
        EXPLAIN SELECT id FROM oauth_transactions WHERE expires_at <= ${now}
      `;
      return [...sessions, ...oauth].map((row) => row['QUERY PLAN']).join('\n');
    });
    expect(plans).toContain('sessions_expires_at_idx');
    expect(plans).toContain('sessions_created_at_idx');
    expect(plans).toContain('oauth_transactions_expires_at_idx');
  });
});
