import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApplicationAdmissionService } from '@daylo/api/auth/feature';
import { TransactionContext, TransactionRunner } from '@daylo/api/core/transactions/contracts';
import { IdentityUser, UserIdentity } from '@daylo/api/users/contracts';
import { InvitationAdmission } from '@daylo/api/groups/contracts';

describe('application admission policy', () => {
  const context = {} as TransactionContext;
  const identity = { googleSubject: 'verified-subject', email: 'person@example.test', displayName: 'Person' };
  let users: UserIdentity;
  let invitations: InvitationAdmission;
  let transactions: TransactionRunner;
  let service: ApplicationAdmissionService;

  beforeEach(() => {
    users = {
      lockIdentity: vi.fn(async () => undefined),
      findBySubject: vi.fn(async () => null),
      emailAvailable: vi.fn(async () => true),
      saveProfile: vi.fn(async (profile) => ({ id: 'user-id', email: profile.email, displayName: profile.displayName ?? 'person', accessStatus: profile.accessStatus })),
    };
    invitations = { hasEligibleInvitation: vi.fn(async () => false) };
    transactions = { run: (operation) => operation(context) };
    service = new ApplicationAdmissionService(transactions, users, invitations, new ConfigService({ runtime: { initialOwnerEmail: 'owner@example.test' } }));
  });

  it('normalizes verified owner email and grants active access without an invite', async () => {
    expect(await service.admit({ ...identity, email: ' Owner@Example.test ' })).toMatchObject({ email: 'owner@example.test', accessStatus: 'active' });
    expect(invitations.hasEligibleInvitation).not.toHaveBeenCalled();
    expect(users.lockIdentity).toHaveBeenCalledWith(identity.googleSubject, 'owner@example.test', context);
  });

  it('keeps a subject-identified active account active when its verified email changes', async () => {
    vi.mocked(users.findBySubject).mockResolvedValue({ id: 'existing-id', email: 'old@example.test', displayName: 'Old', accessStatus: 'active' });
    await expect(service.admit(identity)).resolves.toMatchObject({ accessStatus: 'active' });
    expect(users.findBySubject).toHaveBeenCalledWith(identity.googleSubject, context);
    expect(invitations.hasEligibleInvitation).not.toHaveBeenCalled();
  });

  it.each([null, { id: 'pending-id', email: identity.email, displayName: 'Person', accessStatus: 'pending' } as IdentityUser])('admits a new or existing pending identity only through an eligible invite', async (existing) => {
    vi.mocked(users.findBySubject).mockResolvedValue(existing);
    vi.mocked(invitations.hasEligibleInvitation).mockResolvedValue(true);
    await expect(service.admit(identity)).resolves.toMatchObject({ accessStatus: 'pending' });
    expect(invitations.hasEligibleInvitation).toHaveBeenCalledWith(identity.email, expect.any(Date), context);
  });

  it.each([null, { id: 'pending-id', email: identity.email, displayName: 'Person', accessStatus: 'pending' } as IdentityUser])('denies outsiders and existing pending users without an eligible invitation without profile writes', async (existing) => {
    vi.mocked(users.findBySubject).mockResolvedValue(existing);
    await expect(service.admit(identity)).rejects.toBeInstanceOf(ForbiddenException);
    expect(users.saveProfile).not.toHaveBeenCalled();
  });

  it.each(['owner@example.test', identity.email])('denies an email collision even for otherwise admitted accounts', async (email) => {
    vi.mocked(users.emailAvailable).mockResolvedValue(false);
    vi.mocked(invitations.hasEligibleInvitation).mockResolvedValue(true);
    await expect(service.admit({ ...identity, email })).rejects.toBeInstanceOf(ForbiddenException);
    expect(users.saveProfile).not.toHaveBeenCalled();
    expect(invitations.hasEligibleInvitation).not.toHaveBeenCalled();
  });

  it('preserves dots and plus suffixes instead of treating a different address as the owner', async () => {
    await expect(service.admit({ ...identity, email: 'own.er+tag@example.test' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(invitations.hasEligibleInvitation).toHaveBeenCalledWith('own.er+tag@example.test', expect.any(Date), context);
  });

  it.each(['lockIdentity', 'findBySubject', 'emailAvailable', 'saveProfile'] as const)('maps %s infrastructure failure to a safe 503', async (method) => {
    vi.mocked(users[method]).mockRejectedValue(new Error('private-database-diagnostics'));
    try {
      await service.admit({ ...identity, email: 'owner@example.test' });
      throw new Error('Expected admission failure');
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect(String(error)).not.toContain('private-database-diagnostics');
    }
  });

  it('maps transaction and invitation failures to 503 without identity writes', async () => {
    vi.mocked(invitations.hasEligibleInvitation).mockRejectedValue(new Error('private-invitation-query'));
    await expect(service.admit(identity)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(users.saveProfile).not.toHaveBeenCalled();
    transactions.run = async () => { throw new Error('private-commit-error'); };
    await expect(service.admit(identity)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
