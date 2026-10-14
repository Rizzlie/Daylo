import { createHash, randomBytes } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@daylo/api/core/database';
import { OAuthTransactionStore } from './oauth-transaction.store';

const databaseUrl = process.env['F06_TEST_DATABASE_URL'];
const enabled = process.env['RUN_F06_DATABASE_INTEGRATION'] === 'true';
const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');

describe.skipIf(!enabled || !databaseUrl)(
  'OAuth transaction PostgreSQL integration',
  () => {
    let prisma: PrismaService;
    let store: OAuthTransactionStore;
    const stateHashes: string[] = [];

    beforeAll(async () => {
      if (
        !databaseUrl ||
        !/^\/daylo_f06_[a-z0-9_]+$/.test(new URL(databaseUrl).pathname)
      ) {
        throw new Error(
          'F06 integration requires an isolated daylo_f06_* database',
        );
      }
      prisma = new PrismaService(
        new ConfigService({ runtime: { databaseUrl } }),
      );
      await prisma.onModuleInit();
      store = new OAuthTransactionStore(prisma);
    });

    afterEach(async () => {
      await prisma?.client.oAuthTransaction.deleteMany({
        where: { stateHash: { in: stateHashes.splice(0) } },
      });
    });
    afterAll(async () => {
      await prisma?.onModuleDestroy();
    });

    async function create(expiresAt = new Date(Date.now() + 600_000)) {
      const stateHash = hash(randomBytes(32).toString('hex'));
      const browserBindingHash = hash(randomBytes(32).toString('hex'));
      const nonce = randomBytes(32).toString('base64url');
      const encryptedVerifier = 'synthetic-encrypted-verifier';
      stateHashes.push(stateHash);
      await store.create(
        { stateHash, browserBindingHash, nonce, encryptedVerifier, expiresAt },
      );
      return { stateHash, browserBindingHash, nonce, encryptedVerifier };
    }

    it('allows exactly one of concurrent callbacks and rejects all replays', async () => {
      const transaction = await create();
      const results = await Promise.all(
        Array.from({ length: 8 }, () =>
          store.consume(
            transaction.stateHash,
            transaction.browserBindingHash,
            new Date(),
          ),
        ),
      );
      expect(
        results.filter((row) => row?.nonce === transaction.nonce && row.encryptedVerifier === transaction.encryptedVerifier),
      ).toHaveLength(1);
      expect(results.filter((nonce) => nonce === null)).toHaveLength(7);
      expect(
        await store.consume(
          transaction.stateHash,
          transaction.browserBindingHash,
          new Date(),
        ),
      ).toBeNull();
      expect(
        await prisma.client.oAuthTransaction.findUnique({
          where: { stateHash: transaction.stateHash },
        }),
      ).toBeNull();
    });

    it('does not consume a transaction on a state or browser mismatch', async () => {
      const transaction = await create();
      expect(
        await store.consume(
          hash('wrong-state'),
          transaction.browserBindingHash,
          new Date(),
        ),
      ).toBeNull();
      expect(
        await store.consume(
          transaction.stateHash,
          hash('wrong-browser'),
          new Date(),
        ),
      ).toBeNull();
      expect(
        await store.consume(
          transaction.stateHash,
          transaction.browserBindingHash,
          new Date(),
        ),
      ).toEqual({ nonce: transaction.nonce, encryptedVerifier: transaction.encryptedVerifier });
    });

    it('rejects expiry at the exact deadline without cleaning on the next start', async () => {
      const deadline = new Date(Date.now() + 60_000);
      const transaction = await create(deadline);
      expect(
        await store.consume(
          transaction.stateHash,
          transaction.browserBindingHash,
          deadline,
        ),
      ).toBeNull();
      await store.create(
        {
          stateHash: hash('next-start'),
          browserBindingHash: hash('next-browser'),
          nonce: 'next-nonce',
          encryptedVerifier: 'next-encrypted-verifier',
          expiresAt: new Date(deadline.getTime() + 600_000),
        },
      );
      stateHashes.push(hash('next-start'));
      expect(
        await prisma.client.oAuthTransaction.findUnique({
          where: { stateHash: transaction.stateHash },
        }),
      ).not.toBeNull();
    });
  },
);
