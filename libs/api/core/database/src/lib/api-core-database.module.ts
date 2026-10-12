import { Module } from '@nestjs/common';
import { TRANSACTION_RUNNER } from '@daylo/api/core/transactions/contracts';
import { DatabaseReadinessService } from './database-readiness.service';
import { PrismaTransactionRunner } from './prisma-transaction-runner';
import { PrismaService } from './prisma.service';

@Module({
  providers: [
    DatabaseReadinessService,
    PrismaService,
    PrismaTransactionRunner,
    {
      provide: TRANSACTION_RUNNER,
      useExisting: PrismaTransactionRunner,
    },
  ],
  exports: [DatabaseReadinessService, PrismaService, TRANSACTION_RUNNER],
})
export class ApiCoreDatabaseModule {}
