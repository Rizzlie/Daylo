import { TransactionContext } from '@daylo/api/core/transactions/contracts';

export const USER_IDENTITY = Symbol('USER_IDENTITY');

export interface IdentityUser {
  id: string;
  email: string;
  displayName: string;
  accessStatus: 'pending' | 'active';
}

export interface AdmittedProfile {
  googleSubject: string;
  email: string;
  displayName?: string;
  accessStatus: 'pending' | 'active';
}

export interface UserIdentity {
  /** Serialize admission for the incoming subject and normalized email. */
  lockIdentity(
    googleSubject: string,
    email: string,
    context: TransactionContext,
  ): Promise<void>;
  findBySubject(
    googleSubject: string,
    context: TransactionContext,
  ): Promise<IdentityUser | null>;
  emailAvailable(
    email: string,
    googleSubject: string,
    context: TransactionContext,
  ): Promise<boolean>;
  /** Caller must check admission and email availability in the same transaction. */
  saveProfile(
    profile: AdmittedProfile,
    context: TransactionContext,
  ): Promise<IdentityUser>;
}
