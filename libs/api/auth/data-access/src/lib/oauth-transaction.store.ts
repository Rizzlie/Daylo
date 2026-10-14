import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@daylo/api/core/database';

export interface NewOAuthTransaction {
  stateHash: string;
  browserBindingHash: string;
  nonce: string;
  encryptedVerifier: string;
  expiresAt: Date;
}

@Injectable()
export class OAuthTransactionStore {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(transaction: NewOAuthTransaction): Promise<void> {
    await this.prisma.client.oAuthTransaction.create({ data: transaction });
  }

  async consume(
    stateHash: string,
    browserBindingHash: string,
    now: Date,
  ): Promise<{ nonce: string; encryptedVerifier: string | null } | null> {
    // One PostgreSQL statement arbitrates concurrent callbacks. No preceding read
    // can allow two callers to receive the nonce or exchange the same code.
    const rows = await this.prisma.client.$queryRaw<{ nonce: string; encryptedVerifier: string | null }[]>`
      DELETE FROM oauth_transactions
      WHERE state_hash = ${stateHash}
        AND browser_binding_hash = ${browserBindingHash}
        AND expires_at > ${now}
      RETURNING nonce, encrypted_verifier AS "encryptedVerifier"
    `;
    return rows[0] ?? null;
  }
}
