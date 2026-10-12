import { TransactionContext } from '@daylo/api/core/transactions/contracts';

export const INVITATION_ADMISSION = Symbol('INVITATION_ADMISSION');

export interface InvitationAdmission {
  /** Check and hold an eligible invite through the surrounding transaction. */
  hasEligibleInvitation(
    email: string,
    now: Date,
    context: TransactionContext,
  ): Promise<boolean>;
}
