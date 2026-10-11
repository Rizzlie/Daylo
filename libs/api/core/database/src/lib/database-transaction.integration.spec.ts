import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  TRANSACTION_RUNNER,
  TransactionContext,
  TransactionRunner,
} from '@daylo/api/core/transactions/contracts';
import { ApiCoreDatabaseModule } from './api-core-database.module';
import { PrismaService } from './prisma.service';

@Injectable()
class UserTransactionFixture {
  constructor(private readonly prisma: PrismaService) {}

  async create(context: TransactionContext, id: string): Promise<void> {
    await this.prisma.getTransactionClient(context).user.create({
      data: {
        id,
        googleSubject: `f03-02-${id}`,
        email: `f03-02-${id}@example.test`,
        displayName: 'F03-02 transaction fixture',
      },
    });
  }
}

@Injectable()
class PreferencesTransactionFixture {
  constructor(private readonly prisma: PrismaService) {}

  async create(context: TransactionContext, userId: string): Promise<void> {
    await this.prisma.getTransactionClient(context).userPreferences.create({
      data: { userId },
    });
  }
}

const databaseUrl = process.env['DATABASE_URL'];
const runDatabaseIntegration =
  process.env['RUN_DATABASE_INTEGRATION'] === 'true';

describe.skipIf(!databaseUrl || !runDatabaseIntegration)(
  'database transaction integration',
  () => {
    let module: TestingModule;
    let prisma: PrismaService;
    let runner: TransactionRunner;
    let users: UserTransactionFixture;
    let preferences: PreferencesTransactionFixture;
    const createdUserIds: string[] = [];

    beforeAll(async () => {
      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [() => ({ runtime: { databaseUrl } })],
          }),
          ApiCoreDatabaseModule,
        ],
        providers: [UserTransactionFixture, PreferencesTransactionFixture],
      }).compile();
      await module.init();

      prisma = module.get(PrismaService);
      runner = module.get<TransactionRunner>(TRANSACTION_RUNNER);
      users = module.get(UserTransactionFixture);
      preferences = module.get(PreferencesTransactionFixture);
    });

    afterEach(async () => {
      await prisma.client.user.deleteMany({
        where: { id: { in: createdUserIds.splice(0) } },
      });
    });

    afterAll(async () => {
      await module.close();
    });

    it('resolves the transaction runner through the NestJS module', () => {
      expect(runner).toBeDefined();
    });

    it('commits work performed by two adapters with one context', async () => {
      const userId = randomUUID();
      createdUserIds.push(userId);

      await runner.run(async (context) => {
        await users.create(context, userId);
        await preferences.create(context, userId);
      });

      await expect(
        prisma.client.user.findUnique({
          where: { id: userId },
          include: { preferences: true },
        }),
      ).resolves.toMatchObject({
        id: userId,
        preferences: { userId },
      });
    });

    it('rolls back work performed by both adapters after a failure', async () => {
      const userId = randomUUID();

      await expect(
        runner.run(async (context) => {
          await users.create(context, userId);
          await preferences.create(context, userId);
          throw new Error('rollback fixture');
        }),
      ).rejects.toThrow('rollback fixture');

      await expect(
        prisma.client.user.findUnique({ where: { id: userId } }),
      ).resolves.toBeNull();
    });

    it('rejects a context that was not created by the transaction runner', () => {
      expect(() =>
        prisma.getTransactionClient({} as TransactionContext),
      ).toThrow('Invalid database transaction context');
    });
  },
);
