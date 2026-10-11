import { Injectable } from '@nestjs/common';
import { TransactionRunner } from '@daylo/api/core/transactions/contracts';
import { PrismaTransactionContext } from './prisma-transaction-context';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaTransactionRunner implements TransactionRunner {
  constructor(private readonly prisma: PrismaService) {}

  run<Result>(
    operation: (context: PrismaTransactionContext) => Promise<Result>,
  ): Promise<Result> {
    return this.prisma.client.$transaction((client) =>
      operation(new PrismaTransactionContext(client)),
    );
  }
}
