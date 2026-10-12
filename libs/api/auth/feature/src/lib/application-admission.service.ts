import {
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TRANSACTION_RUNNER,
  TransactionRunner,
} from '@daylo/api/core/transactions/contracts';
import {
  USER_IDENTITY,
  UserIdentity,
  IdentityUser,
} from '@daylo/api/users/contracts';
import {
  INVITATION_ADMISSION,
  InvitationAdmission,
} from '@daylo/api/groups/contracts';
import { VerifiedGoogleIdentity } from './google-oidc.provider';

@Injectable()
export class ApplicationAdmissionService {
  constructor(
    @Inject(TRANSACTION_RUNNER) private readonly transactions: TransactionRunner,
    @Inject(USER_IDENTITY) private readonly users: UserIdentity,
    @Inject(INVITATION_ADMISSION)
    private readonly invitations: InvitationAdmission,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async admit(identity: VerifiedGoogleIdentity): Promise<IdentityUser> {
    const email = identity.email.trim().toLowerCase();
    const ownerEmail = this.config.getOrThrow<string>('runtime.initialOwnerEmail');
    try {
      return await this.transactions.run(async (context) => {
        await this.users.lockIdentity(identity.googleSubject, email, context);
        const existing = await this.users.findBySubject(
          identity.googleSubject,
          context,
        );
        if (
          !(await this.users.emailAvailable(email, identity.googleSubject, context))
        ) {
          throw new ForbiddenException();
        }
        const active = email === ownerEmail || existing?.accessStatus === 'active';
        if (
          !active &&
          !(await this.invitations.hasEligibleInvitation(email, new Date(), context))
        ) {
          throw new ForbiddenException();
        }
        return this.users.saveProfile(
          { ...identity, email, accessStatus: active ? 'active' : 'pending' },
          context,
        );
      });
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      // Never return database diagnostics, subjects, emails or provider tokens.
      throw new ServiceUnavailableException();
    }
  }
}
