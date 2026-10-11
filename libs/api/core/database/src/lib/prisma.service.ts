import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { TransactionContext } from '@daylo/api/core/transactions/contracts';
import { Prisma, PrismaClient } from '../generated/prisma/client';
import { PrismaTransactionContext } from './prisma-transaction-context';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client: PrismaClient;

  constructor(config: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: config.getOrThrow<string>('runtime.databaseUrl'),
    });
    this.client = new PrismaClient({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }

  getTransactionClient(
    context: TransactionContext,
  ): Prisma.TransactionClient {
    if (!(context instanceof PrismaTransactionContext)) {
      throw new TypeError('Invalid database transaction context');
    }

    return context.client;
  }
}
