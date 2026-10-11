import { TransactionContext } from '@daylo/api/core/transactions/contracts';
import { Prisma } from '../generated/prisma/client';
import { PrismaTransactionRunner } from './prisma-transaction-runner';
import { PrismaService } from './prisma.service';

describe('PrismaTransactionRunner', () => {
  it('passes one opaque context to the operation and returns its result', async () => {
    const transactionClient = {} as Prisma.TransactionClient;
    const prisma = {
      client: {
        $transaction: vi.fn(
          (operation: (client: Prisma.TransactionClient) => Promise<string>) =>
            operation(transactionClient),
        ),
      },
    } as unknown as PrismaService;
    const runner = new PrismaTransactionRunner(prisma);
    let receivedContext: TransactionContext | undefined;

    await expect(
      runner.run(async (context) => {
        receivedContext = context;
        return 'committed';
      }),
    ).resolves.toBe('committed');

    expect(prisma.client.$transaction).toHaveBeenCalledOnce();
    expect(receivedContext).toBeDefined();
  });

  it('propagates an operation failure to Prisma for rollback', async () => {
    const failure = new Error('operation failed');
    const prisma = {
      client: {
        $transaction: vi.fn(
          (operation: (client: Prisma.TransactionClient) => Promise<never>) =>
            operation({} as Prisma.TransactionClient),
        ),
      },
    } as unknown as PrismaService;
    const runner = new PrismaTransactionRunner(prisma);

    await expect(
      runner.run(async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);
  });
});
