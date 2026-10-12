import { Injectable } from '@nestjs/common';
import { PrismaTransactionContext } from '@daylo/api/core/database';
import { TransactionContext } from '@daylo/api/core/transactions/contracts';
import {
  AdmittedProfile,
  IdentityUser,
  UserIdentity,
} from '@daylo/api/users/contracts';

function client(context: TransactionContext) {
  if (!(context instanceof PrismaTransactionContext))
    throw new Error('Unsupported transaction context');
  return context.client;
}

const identitySelect = {
  id: true,
  email: true,
  displayName: true,
  accessStatus: true,
} as const;

function mapUser(row: {
  id: string;
  email: string;
  displayName: string;
  accessStatus: 'PENDING' | 'ACTIVE';
}): IdentityUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    accessStatus: row.accessStatus === 'ACTIVE' ? 'active' : 'pending',
  };
}

@Injectable()
export class UserIdentityStore implements UserIdentity {
  async lockIdentity(
    googleSubject: string,
    email: string,
    context: TransactionContext,
  ): Promise<void> {
    // Transaction-scoped locks work even before the first user row exists.
    // A consistent order prevents deadlocks between subject/email locks.
    const keys = [
      `daylo:identity:subject:${googleSubject}`,
      `daylo:identity:email:${email}`,
    ].sort();
    for (const key of keys) {
      await client(context).$queryRaw`
        SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text AS locked
      `;
    }
  }

  async findBySubject(
    googleSubject: string,
    context: TransactionContext,
  ): Promise<IdentityUser | null> {
    const row = await client(context).user.findUnique({
      where: { googleSubject },
      select: identitySelect,
    });
    return row ? mapUser(row) : null;
  }

  async emailAvailable(
    email: string,
    googleSubject: string,
    context: TransactionContext,
  ): Promise<boolean> {
    const row = await client(context).user.findUnique({
      where: { email },
      select: { googleSubject: true },
    });
    return !row || row.googleSubject === googleSubject;
  }

  async saveProfile(
    profile: AdmittedProfile,
    context: TransactionContext,
  ): Promise<IdentityUser> {
    const accessStatus = profile.accessStatus === 'active' ? 'ACTIVE' : 'PENDING';
    const row = await client(context).user.upsert({
      where: { googleSubject: profile.googleSubject },
      create: {
        googleSubject: profile.googleSubject,
        email: profile.email,
        displayName: profile.displayName ?? profile.email.split('@')[0].slice(0, 200),
        accessStatus,
      },
      update: {
        email: profile.email,
        ...(profile.displayName !== undefined
          ? { displayName: profile.displayName }
          : {}),
        accessStatus,
      },
      select: identitySelect,
    });
    return mapUser(row);
  }
}
