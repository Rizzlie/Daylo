import { Injectable } from '@nestjs/common';
import { PrismaTransactionContext } from '@daylo/api/core/database';
import { TransactionContext } from '@daylo/api/core/transactions/contracts';
import { InvitationAdmission } from '@daylo/api/groups/contracts';

@Injectable()
export class InvitationAdmissionStore implements InvitationAdmission {
  async hasEligibleInvitation(
    email: string,
    now: Date,
    context: TransactionContext,
  ): Promise<boolean> {
    if (!(context instanceof PrismaTransactionContext))
      throw new Error('Unsupported transaction context');
    // Keep cancellation/replacement from changing an admitted invite before commit.
    // This grants pending access only; it never accepts an invite or adds membership.
    const rows = await context.client.$queryRaw<{ id: string }[]>`
      SELECT id FROM invitations
      WHERE email = ${email} AND status = 'pending' AND expires_at > ${now}
      ORDER BY id LIMIT 1 FOR SHARE
    `;
    return rows.length > 0;
  }
}
