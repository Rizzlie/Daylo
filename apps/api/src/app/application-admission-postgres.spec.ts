import { randomUUID } from 'node:crypto';
import { ForbiddenException, INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ApplicationAdmissionService, GOOGLE_OAUTH_CLIENT } from '@daylo/api/auth/feature';
import { PrismaService } from '@daylo/api/core/database';
import { TRANSACTION_RUNNER, TransactionRunner } from '@daylo/api/core/transactions/contracts';
import { INVITATION_ADMISSION, InvitationAdmission } from '@daylo/api/groups/contracts';
import { OAuth2Client } from 'google-auth-library';
import { AppModule } from './app.module';

const databaseUrl = process.env['F06_TEST_DATABASE_URL'];
const enabled = process.env['RUN_F06_DATABASE_INTEGRATION'] === 'true';

describe.skipIf(!enabled || !databaseUrl)('application admission PostgreSQL acceptance', () => {
  const prefix = `f06-02-${randomUUID()}`;
  const ownerEmail = `${prefix}-owner@example.test`;
  const groupIds: string[] = [];
  let app: INestApplication;
  let prisma: PrismaService;
  let admission: ApplicationAdmissionService;

  beforeAll(async () => {
    if (!databaseUrl || !/^\/daylo_f06_[a-z0-9_]+$/.test(new URL(databaseUrl).pathname)) {
      throw new Error('F06 integration requires an isolated daylo_f06_* database');
    }
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ ignoreEnvFile: true, isGlobal: true, load: [() => ({ runtime: { databaseUrl, initialOwnerEmail: ownerEmail } })] }), AppModule],
    }).overrideProvider(GOOGLE_OAUTH_CLIENT).useValue(new OAuth2Client()).compile();
    app = module.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    admission = app.get(ApplicationAdmissionService);
  });

  afterEach(async () => {
    // Other suites now issue sessions concurrently in the same isolated DB.
    const sessionCount = await prisma.client.session.count({ where: { user: { googleSubject: { startsWith: prefix } } } });
    await prisma.client.invitation.deleteMany({ where: { groupId: { in: groupIds } } });
    await prisma.client.group.deleteMany({ where: { id: { in: groupIds.splice(0) } } });
    await prisma.client.user.deleteMany({ where: { googleSubject: { startsWith: prefix } } });
    expect(sessionCount).toBe(0);
  });
  afterAll(async () => { await app?.close(); });

  function identity(suffix = 'person', email = `${prefix}-${suffix}@example.test`) {
    return { googleSubject: `${prefix}-${suffix}`, email, emailAuthoritative: true, displayName: 'Synthetic Person' };
  }
  async function seedUser(suffix: string, accessStatus: 'ACTIVE' | 'PENDING', email = identity(suffix).email) {
    const profile = identity(suffix, email);
    return prisma.client.user.create({ data: { googleSubject: profile.googleSubject, email, displayName: profile.displayName, accessStatus } });
  }

  it('denies non-authoritative owner and invitation admission without database writes', async () => {
    const invited = identity('external');
    await invite(invited.email);
    for (const person of [identity('owner', ownerEmail), invited]) {
      await expect(admission.admit({ ...person, emailAuthoritative: false })).rejects.toBeInstanceOf(ForbiddenException);
      expect(await prisma.client.user.findUnique({ where: { googleSubject: person.googleSubject } })).toBeNull();
    }
  });
  async function invite(email: string, status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' = 'PENDING', expiresAt = new Date(Date.now() + 60_000)) {
    const inviter = await seedUser(`inviter-${randomUUID()}`, 'ACTIVE');
    const group = await prisma.client.group.create({ data: { name: 'Synthetic group', ownerId: inviter.id } });
    groupIds.push(group.id);
    return prisma.client.invitation.create({ data: { groupId: group.id, invitedById: inviter.id, email, status, expiresAt, resolvedAt: status === 'PENDING' ? null : new Date() } });
  }

  it('creates the configured owner once and keeps its UUID across normalized repeat sign-in', async () => {
    const first = await admission.admit(identity('owner', ownerEmail.toUpperCase()));
    const second = await admission.admit(identity('owner', ownerEmail));
    expect(first).toMatchObject({ email: ownerEmail, accessStatus: 'active' });
    expect(second.id).toBe(first.id);
    expect(await prisma.client.user.count({ where: { googleSubject: identity('owner').googleSubject } })).toBe(1);
  });

  it('refreshes active profile by subject without invitation and preserves UUID and missing name', async () => {
    const original = await seedUser('active', 'ACTIVE');
    const renamed = { ...identity('active', `${prefix}-new@example.test`), displayName: 'Updated Name' };
    const updated = await admission.admit(renamed);
    expect(updated).toMatchObject({ id: original.id, email: renamed.email, displayName: 'Updated Name', accessStatus: 'active' });
    const withoutName = { googleSubject: renamed.googleSubject, email: renamed.email, emailAuthoritative: false };
    expect(await admission.admit(withoutName)).toMatchObject({ id: original.id, displayName: 'Updated Name' });
    expect(await prisma.client.user.findUnique({ where: { email: original.email } })).toBeNull();
  });

  it('promotes an existing pending owner to active without changing its identity', async () => {
    const original = await seedUser('owner', 'PENDING', ownerEmail);
    expect(await admission.admit(identity('owner', ownerEmail))).toMatchObject({ id: original.id, accessStatus: 'active' });
    expect(await prisma.client.user.findUnique({ where: { id: original.id } })).toMatchObject({ accessStatus: 'ACTIVE' });
  });

  it('creates only pending access for a valid invitation without resolving it or adding membership', async () => {
    const person = identity();
    const invitation = await invite(person.email);
    const admitted = await admission.admit({ googleSubject: person.googleSubject, email: person.email.toUpperCase(), emailAuthoritative: true });
    expect(admitted).toMatchObject({ accessStatus: 'pending', email: person.email, displayName: person.email.split('@')[0] });
    expect(await prisma.client.membership.count({ where: { userId: admitted.id } })).toBe(0);
    expect(await prisma.client.invitation.findUnique({ where: { id: invitation.id } })).toMatchObject({ status: 'PENDING', resolvedAt: null });
  });

  it('rechecks existing pending access and preserves the whole profile after its invite expires', async () => {
    const pending = await seedUser('pending', 'PENDING');
    const invitation = await invite(pending.email);
    expect(await admission.admit(identity('pending'))).toMatchObject({ id: pending.id, accessStatus: 'pending' });
    await prisma.client.invitation.update({ where: { id: invitation.id }, data: { expiresAt: new Date(Date.now() - 1) } });
    const before = await prisma.client.user.findUniqueOrThrow({ where: { id: pending.id } });
    await expect(admission.admit({ ...identity('pending'), displayName: 'Must not persist' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(await prisma.client.user.findUnique({ where: { id: pending.id } })).toEqual(before);
  });

  it.each(['outsider', 'wrong-email', 'expired', 'ACCEPTED', 'REJECTED', 'CANCELLED'] as const)('denies %s without creating a user', async (scenario) => {
    const person = identity();
    if (scenario === 'wrong-email') await invite(`${prefix}-different@example.test`);
    else if (scenario === 'expired') await invite(person.email, 'PENDING', new Date(Date.now() - 1));
    else if (scenario !== 'outsider') await invite(person.email, scenario);
    await expect(admission.admit(person)).rejects.toBeInstanceOf(ForbiddenException);
    expect(await prisma.client.user.findUnique({ where: { googleSubject: person.googleSubject } })).toBeNull();
  });

  it('rejects an invitation at its exact deadline without changing its status', async () => {
    const deadline = new Date(Date.now() + 60_000);
    const invitation = await invite(identity().email, 'PENDING', deadline);
    const transactions = app.get<TransactionRunner>(TRANSACTION_RUNNER);
    const invitations = app.get<InvitationAdmission>(INVITATION_ADMISSION);
    expect(await transactions.run((context) => invitations.hasEligibleInvitation(identity().email, new Date(deadline.getTime() - 1), context))).toBe(true);
    expect(await transactions.run((context) => invitations.hasEligibleInvitation(identity().email, deadline, context))).toBe(false);
    expect(await prisma.client.invitation.findUnique({ where: { id: invitation.id } })).toMatchObject({ status: 'PENDING' });
  });

  it('never merges a new subject into an account with the same verified email', async () => {
    const original = await seedUser('original', 'ACTIVE', ownerEmail);
    await expect(admission.admit(identity('other-subject', ownerEmail))).rejects.toBeInstanceOf(ForbiddenException);
    expect(await prisma.client.user.findUnique({ where: { id: original.id } })).toEqual(original);
    expect(await prisma.client.user.count({ where: { email: ownerEmail } })).toBe(1);
  });

  it('rolls back attempted email/name changes when another subject owns the new email', async () => {
    const first = await seedUser('first', 'ACTIVE');
    const second = await seedUser('second', 'ACTIVE');
    await expect(admission.admit({ ...identity('first', second.email), displayName: 'Must not persist' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(await prisma.client.user.findUnique({ where: { id: first.id } })).toEqual(first);
    expect(await prisma.client.user.findUnique({ where: { id: second.id } })).toEqual(second);
  });

  it('serializes eight first logins of one subject into one stable pending identity', async () => {
    const person = identity();
    await invite(person.email);
    const results = await Promise.all(Array.from({ length: 8 }, () => admission.admit(person)));
    expect(new Set(results.map((result) => result.id)).size).toBe(1);
    expect(results.every((result) => result.accessStatus === 'pending')).toBe(true);
    expect(await prisma.client.user.count({ where: { googleSubject: person.googleSubject } })).toBe(1);
  });

  it('admits only one subject when eight concurrent first logins claim the owner email', async () => {
    const results = await Promise.allSettled(Array.from({ length: 8 }, (_, i) => admission.admit(identity(`contender-${i}`, ownerEmail))));
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const denied = results.filter((result) => result.status === 'rejected');
    expect(denied).toHaveLength(7);
    for (const result of denied) if (result.status === 'rejected') expect(result.reason).toBeInstanceOf(ForbiddenException);
    expect(await prisma.client.user.count({ where: { email: ownerEmail } })).toBe(1);
  });

  it('preserves subject identity across concurrent profile updates to different emails', async () => {
    const original = await seedUser('active', 'ACTIVE');
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) => admission.admit(identity('active', `${prefix}-change-${i}@example.test`))));
    expect(results.every((result) => result.id === original.id && result.accessStatus === 'active')).toBe(true);
    expect(await prisma.client.user.count({ where: { googleSubject: original.googleSubject } })).toBe(1);
  });
});
