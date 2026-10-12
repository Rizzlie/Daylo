import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@daylo/api/core/database';

export interface NewOAuthTransaction {
  stateHash: string;
  browserBindingHash: string;
  nonce: string;
  expiresAt: Date;
}

@Injectable()
export class OAuthTransactionStore {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(transaction: NewOAuthTransaction, now: Date): Promise<void> {
    // Remove expired sign-in attempts without ever touching users or sessions.
    await this.prisma.client.oAuthTransaction.deleteMany({
      where: { expiresAt: { lte: now } },
    });
    await this.prisma.client.oAuthTransaction.create({ data: transaction });
  }

  async consume(
    stateHash: string,
    browserBindingHash: string,
    now: Date,
  ): Promise<string | null> {
    // One PostgreSQL statement arbitrates concurrent callbacks. No preceding read
    // can allow two callers to receive the nonce or exchange the same code.
    const rows = await this.prisma.client.$queryRaw<{ nonce: string }[]>`
      DELETE FROM oauth_transactions
      WHERE state_hash = ${stateHash}
        AND browser_binding_hash = ${browserBindingHash}
        AND expires_at > ${now}
      RETURNING nonce
    `;
    return rows[0]?.nonce ?? null;
  }
}
