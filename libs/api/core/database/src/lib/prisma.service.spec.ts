import { ConfigService } from '@nestjs/config';
import { TransactionContext } from '@daylo/api/core/transactions/contracts';
import { Prisma } from '../generated/prisma/client';
import { PrismaTransactionContext } from './prisma-transaction-context';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  const config = {
    getOrThrow: vi
      .fn()
      .mockReturnValue('postgresql://daylo:secret@localhost:5433/daylo'),
  } as unknown as ConfigService;

  it('connects and disconnects with the NestJS module lifecycle', async () => {
    const service = new PrismaService(config);
    const connect = vi.spyOn(service.client, '$connect').mockResolvedValue();
    const disconnect = vi
      .spyOn(service.client, '$disconnect')
      .mockResolvedValue();

    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(connect).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('returns the Prisma client carried by its transaction context', () => {
    const service = new PrismaService(config);
    const transactionClient = {} as Prisma.TransactionClient;
    const context = new PrismaTransactionContext(transactionClient);

    expect(service.getTransactionClient(context)).toBe(transactionClient);
  });

  it('rejects a transaction context from outside the database runner', () => {
    const service = new PrismaService(config);

    expect(() =>
      service.getTransactionClient({} as TransactionContext),
    ).toThrow('Invalid database transaction context');
  });
});
