import { TransactionContext } from '@daylo/api/core/transactions/contracts';
import { Prisma } from '../generated/prisma/client';

export class PrismaTransactionContext extends TransactionContext {
  constructor(readonly client: Prisma.TransactionClient) {
    super();
  }
}
