import { Module } from '@nestjs/common';
import { TRANSACTION_RUNNER } from '@daylo/api/core/transactions/contracts';
import { DatabaseReadinessController } from './database-readiness.controller';
import { DatabaseReadinessService } from './database-readiness.service';
import { PrismaTransactionRunner } from './prisma-transaction-runner';
import { PrismaService } from './prisma.service';

@Module({
  controllers: [DatabaseReadinessController],
  providers: [
    DatabaseReadinessService,
    PrismaService,
    PrismaTransactionRunner,
    {
      provide: TRANSACTION_RUNNER,
      useExisting: PrismaTransactionRunner,
    },
  ],
  exports: [PrismaService, TRANSACTION_RUNNER],
})
export class ApiCoreDatabaseModule {}
