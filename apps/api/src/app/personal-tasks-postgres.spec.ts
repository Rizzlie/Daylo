import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { GOOGLE_OAUTH_CLIENT, SessionService } from '@daylo/api/auth/feature';
import { PrismaService } from '@daylo/api/core/database';
import { personalTaskResponseSchema, todayResponseSchema } from '@daylo/shared/schemas';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { BoundedThrottlerStorage } from './rate-limiting/bounded-throttler-storage';
import { createOpenApiDocument } from './openapi';

const databaseUrl = process.env['F06_TEST_DATABASE_URL'];
const enabled = process.env['RUN_F06_DATABASE_INTEGRATION'] === 'true' && !!databaseUrl;
const origin = 'http://localhost:4200';
type Actor = { id: string; cookie: string; csrf: string };

describe.skipIf(!enabled)('Personal task PostgreSQL HTTP acceptance', () => {
  const prefix = `m01-01-${randomUUID()}`;
  let app: INestApplication;
  let prisma: PrismaService;
  let baseUrl: string;
  let owner: Actor;
  let member: Actor;
  let pending: Actor;
  let groupId: string;

  beforeAll(async () => {
    if (!databaseUrl || !/^\/daylo_f06_[a-z0-9_]+$/.test(new URL(databaseUrl).pathname)) {
      throw new Error('Task acceptance requires an isolated daylo_f06_* database');
    }
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          isGlobal: true,
          load: [
            () => ({
              runtime: {
                databaseUrl,
                timeZone: 'Europe/Warsaw',
                frontendOrigin: origin,
                environment: 'development',
                initialOwnerEmail: `${prefix}@example.test`,
              },
            }),
          ],
        }),
        AppModule,
      ],
    })
      .overrideProvider(GOOGLE_OAUTH_CLIENT)
      .useValue(new OAuth2Client())
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');
    baseUrl = `${await app.getUrl()}/api/tasks/personal`;
    prisma = app.get(PrismaService);
    owner = await actor('owner');
    member = await actor('member');
    pending = await actor('pending', true);
    const group = await prisma.client.group.create({
      data: { name: 'Synthetic task group', ownerId: owner.id },
    });
    groupId = group.id;
    await prisma.client.membership.createMany({
      data: [owner, member].map((user) => ({ userId: user.id, groupId })),
    });
  });

  beforeEach(() => app.get(BoundedThrottlerStorage).clear());
  afterEach(async () => {
    vi.restoreAllMocks();
    await prisma.client.task.deleteMany({
      where: { createdBy: { googleSubject: { startsWith: prefix } } },
    });
  });
  afterAll(async () => {
    try {
      if (groupId) {
        await prisma.client.membership.deleteMany({ where: { groupId } });
        await prisma.client.group.delete({ where: { id: groupId } });
      }
      if (prisma)
        await prisma.client.user.deleteMany({ where: { googleSubject: { startsWith: prefix } } });
    } finally {
      await app?.close();
    }
  });

  async function actor(role: string, isPending = false): Promise<Actor> {
    const user = await prisma.client.user.create({
      data: {
        googleSubject: `${prefix}-${role}`,
        email: `${prefix}-${role}@example.test`,
        displayName: `Synthetic ${role}`,
        accessStatus: isPending ? 'PENDING' : 'ACTIVE',
      },
    });
    let cookie = '';
    await app.get(SessionService).issue(
      user.id,
      { headers: {} } as Request,
      {
        cookie: (name: string, value: string) => {
          if (name.endsWith('daylo_session')) cookie = `${name}=${value}`;
        },
      } as unknown as Response,
    );
    const csrfResponse = await fetch(`${await app.getUrl()}/api/auth/csrf`, {
      headers: { cookie },
    });
    expect(csrfResponse.status).toBe(200);
    return { id: user.id, cookie, csrf: (await csrfResponse.json()).csrfToken };
  }

  async function call(
    method: string,
    path = '',
    body?: unknown,
    user: Actor | null = owner,
    extra: Record<string, string> = {},
  ) {
    return fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(user ? { Cookie: user.cookie, Origin: origin, 'X-CSRF-Token': user.csrf } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...extra,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }

  async function create(input = {}) {
    const response = await call('POST', '', { title: '  Personal plan  ', ...input });
    expect(response.status).toBe(201);
    expect(response.headers.get('cache-control')).toBe('no-store');
    return personalTaskResponseSchema.parse(await response.json());
  }

  async function today(user: Actor | null = owner, query = '') {
    return fetch(`${await app.getUrl()}/api/tasks/today${query}`, {
      headers: user ? { Cookie: user.cookie } : {},
    });
  }

  async function withTodayClock(now: string, action: () => Promise<void>) {
    const sessions = await prisma.client.session.findMany({ where: { userId: owner.id } });
    const instant = new Date(now);
    // Keep the real session valid under the controlled business clock, without bypassing access checks.
    await prisma.client.session.updateMany({
      where: { userId: owner.id },
      data: {
        createdAt: instant,
        expiresAt: new Date(instant.getTime() + 7 * 86400000),
      },
    });
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(instant);
    try {
      await action();
    } finally {
      vi.useRealTimers();
      for (const session of sessions)
        await prisma.client.session.update({
          where: { id: session.id },
          data: { createdAt: session.createdAt, expiresAt: session.expiresAt },
        });
    }
  }

  it('returns the complete private Today union without pagination and maps SQL date/time values', async () => {
    const date = '2030-01-15';
    const due = new Date(`${date}T00:00:00Z`);
    await prisma.client.task.createMany({
      data: Array.from({ length: 125 }, (_, index) => ({
        title: `Visible ${index}`,
        createdById: owner.id,
        scheduledDate: due,
        scheduledTime: index === 0 ? new Date('1970-01-01T09:30:00Z') : null,
      })),
    });
    const overdue = await create({ scheduledDate: '2020-02-29', scheduledTime: '23:59' });
    const completed = await prisma.client.task.createManyAndReturn({
      data: [
        { title: 'Both', scheduledDate: due, completedAt: new Date('2030-01-15T11:00:00Z') },
        {
          title: 'Due today, completed earlier',
          scheduledDate: due,
          completedAt: new Date('2030-01-10T11:00:00Z'),
        },
        {
          title: 'Past completed today',
          scheduledDate: new Date('2020-02-29'),
          completedAt: new Date('2030-01-15T11:00:00Z'),
        },
        {
          title: 'Future completed today',
          scheduledDate: new Date('2030-02-01'),
          completedAt: new Date('2030-01-15T11:00:00Z'),
        },
      ].map((row) => ({ ...row, createdById: owner.id, completedById: owner.id })),
    });
    await prisma.client.task.createMany({
      data: [
        { title: 'Other personal', createdById: member.id, scheduledDate: due },
        { title: 'Group task', createdById: owner.id, scheduledDate: due, groupId },
        { title: 'Future open', createdById: owner.id, scheduledDate: new Date('2030-02-01') },
        {
          title: 'Old completed',
          createdById: owner.id,
          scheduledDate: new Date('2020-02-29'),
          completedAt: new Date('2030-01-14T11:00:00Z'),
          completedById: owner.id,
        },
      ],
    });
    await withTodayClock('2030-01-15T12:00:00Z', async () => {
      const response = await today(owner, '?date=2020-01-01&userId=ignored&limit=1');
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('no-store');
      const body = todayResponseSchema.parse(await response.json());
      expect(body).toMatchObject({ date, timeZone: 'Europe/Warsaw' });
      expect(body.items).toHaveLength(130);
      expect(new Set(body.items.map((row) => row.id)).size).toBe(130);
      expect(body.items.every((row) => row.createdById === owner.id && row.groupId === null)).toBe(
        true,
      );
      expect(body.items.find((row) => row.title === 'Visible 0')?.scheduledTime).toBe('09:30');
      expect(body.items.find((row) => row.id === overdue.id)).toEqual(overdue);
      expect(
        body.items
          .filter((row) => row.completedAt !== null)
          .map((row) => row.id)
          .sort(),
      ).toEqual(completed.map((row) => row.id).sort());
    });
  });

  it.each([
    ['Europe/Warsaw', '2026-03-29', '2026-03-28T23:00:00Z', '2026-03-29T22:00:00Z'],
    ['Europe/Warsaw', '2026-10-25', '2026-10-24T22:00:00Z', '2026-10-25T23:00:00Z'],
    ['Pacific/Kiritimati', '2030-01-15', '2030-01-14T10:00:00Z', '2030-01-15T10:00:00Z'],
  ])('selects the exact local completion day in %s on %s', async (zone, date, start, end) => {
    const config = app.get(ConfigService);
    const previous = config.get('runtime.timeZone');
    config.set('runtime.timeZone', zone);
    const instants = [
      new Date(Date.parse(start) - 1),
      new Date(start),
      new Date(Date.parse(end) - 1),
      new Date(end),
    ];
    await prisma.client.task.createMany({
      data: instants.map((completedAt, index) => ({
        title: `Boundary ${index}`,
        createdById: owner.id,
        completedById: owner.id,
        scheduledDate: new Date('2020-02-29'),
        completedAt,
      })),
    });
    try {
      await withTodayClock(new Date(Date.parse(start) + 60 * 60 * 1000).toISOString(), async () => {
        const response = await today();
        expect(response.status).toBe(200);
        const body = todayResponseSchema.parse(await response.json());
        expect(body).toMatchObject({ date, timeZone: zone });
        expect(body.items.map((row) => row.title).sort()).toEqual(['Boundary 1', 'Boundary 2']);
      });
    } finally {
      config.set('runtime.timeZone', previous);
    }
  });

  it('updates feed inclusion on complete/reopen and midnight without changing scheduled dates', async () => {
    const task = await create({ scheduledDate: '2030-01-16' });
    await withTodayClock('2030-01-15T12:00:00Z', async () => {
      expect((await (await today()).json()).items).toEqual([]);
      expect((await call('POST', `/${task.id}/complete`, { version: 1 })).status).toBe(200);
      expect((await (await today()).json()).items.map((row: { id: string }) => row.id)).toEqual([
        task.id,
      ]);
      expect((await call('POST', `/${task.id}/reopen`, { version: 2 })).status).toBe(200);
      expect((await (await today()).json()).items).toEqual([]);
      vi.setSystemTime(new Date('2030-01-15T23:00:00Z'));
      expect((await (await today()).json()).items).toMatchObject([
        { id: task.id, scheduledDate: '2030-01-16', completedAt: null },
      ]);
      vi.setSystemTime(new Date('2030-01-16T23:00:00Z'));
      expect((await (await today()).json()).items).toMatchObject([
        { id: task.id, scheduledDate: '2030-01-16' },
      ]);
    });
  });

  it('requires an active valid session for Today', async () => {
    expect((await today(null)).status).toBe(401);
    expect((await today(pending)).status).toBe(403);
    const response = await today(member);
    expect(response.status).toBe(200);
    expect(todayResponseSchema.parse(await response.json()).items).toEqual([]);
  });

  it('creates, reads, edits, completes, reopens and deletes with durable explicit fields', async () => {
    const task = await create({
      scheduledDate: '2020-02-29',
      scheduledTime: '23:59',
      description: 'Notes',
    });
    expect(task).toMatchObject({
      title: 'Personal plan',
      createdById: owner.id,
      groupId: null,
      version: 1,
      scheduledDate: '2020-02-29',
      scheduledTime: '23:59',
      completedAt: null,
      completedById: null,
    });
    expect(Object.keys(task).sort()).toEqual(
      [
        'id',
        'createdById',
        'groupId',
        'title',
        'description',
        'scheduledDate',
        'scheduledTime',
        'completedAt',
        'completedById',
        'version',
        'createdAt',
        'updatedAt',
      ].sort(),
    );
    expect(await (await call('GET', `/${task.id}`)).json()).toEqual(task);
    expect(await prisma.client.task.findUnique({ where: { id: task.id } })).toMatchObject({
      title: task.title,
      version: 1,
    });
    const edited = await (
      await call('PATCH', `/${task.id}`, {
        version: 1,
        title: 'Changed',
        description: '',
        scheduledTime: null,
      })
    ).json();
    expect(edited).toMatchObject({
      title: 'Changed',
      description: null,
      scheduledTime: null,
      scheduledDate: '2020-02-29',
      version: 2,
    });
    const completed = await (await call('POST', `/${task.id}/complete`, { version: 2 })).json();
    expect(completed).toMatchObject({ version: 3, completedById: owner.id });
    expect(Number.isFinite(Date.parse(completed.completedAt))).toBe(true);
    expect(await (await call('POST', `/${task.id}/complete`, { version: 3 })).json()).toEqual(
      completed,
    );
    const reopened = await (await call('POST', `/${task.id}/reopen`, { version: 3 })).json();
    expect(reopened).toMatchObject({ version: 4, completedAt: null, completedById: null });
    expect(await (await call('POST', `/${task.id}/reopen`, { version: 4 })).json()).toEqual(
      reopened,
    );
    expect(
      await (await call('PATCH', `/${task.id}`, { version: 4, title: ' Changed ' })).json(),
    ).toEqual(reopened);
    const deleted = await call('DELETE', `/${task.id}?version=4`);
    expect(deleted.status).toBe(204);
    expect(await deleted.text()).toBe('');
    expect((await call('GET', `/${task.id}`)).status).toBe(404);
    expect(await prisma.client.task.findUnique({ where: { id: task.id } })).toBeNull();
  });

  it('defaults date from the backend Warsaw clock and normalizes blank optional fields', async () => {
    // Mock Date alone: database drivers and HTTP continue to use real timers.
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date('2026-07-15T22:00:00Z'));
      expect(await create({ scheduledTime: '', description: ' \n ' })).toMatchObject({
        scheduledDate: '2026-07-16',
        scheduledTime: null,
        description: null,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('paginates only owned personal tasks, even for members of the same group', async () => {
    const tasks = await Promise.all([create(), create(), create()]);
    await prisma.client.task.createMany({
      data: [
        { createdById: member.id, title: 'Member private', scheduledDate: new Date('2026-01-01') },
        {
          createdById: owner.id,
          groupId,
          title: 'Group task',
          scheduledDate: new Date('2026-01-01'),
        },
      ],
    });
    const first = await (await call('GET', '?limit=2')).json();
    const second = await (await call('GET', `?limit=2&after=${first.nextCursor}`)).json();
    expect([...first.items, ...second.items].map((task: { id: string }) => task.id)).toEqual(
      tasks.map((task) => task.id).sort(),
    );
    expect(first.nextCursor).toBe(first.items[1].id);
    expect(second.nextCursor).toBeNull();
    const memberList = await (await call('GET', '', undefined, member)).json();
    expect(memberList.items).toHaveLength(1);
    expect(memberList.items[0].title).toBe('Member private');
  });

  it.each(['GET', 'PATCH', 'DELETE', 'complete', 'reopen'])(
    'hides foreign, missing and group task IDs for %s',
    async (operation) => {
      const task = await create();
      const groupTask = await prisma.client.task.create({
        data: {
          createdById: member.id,
          groupId,
          title: 'Shared fixture',
          scheduledDate: new Date('2026-01-01'),
        },
      });
      for (const id of [task.id, groupTask.id, randomUUID()]) {
        const path = `/${id}${operation === 'DELETE' ? '?version=99' : ['complete', 'reopen'].includes(operation) ? `/${operation}` : ''}`;
        const method = ['complete', 'reopen'].includes(operation) ? 'POST' : operation;
        const response = await call(
          method,
          path,
          method === 'POST'
            ? { version: 99 }
            : method === 'PATCH'
              ? { version: 99, title: 'Attempt' }
              : undefined,
          member,
        );
        expect(response.status).toBe(404);
        expect(await response.json()).toMatchObject({ code: 'RESOURCE_NOT_FOUND' });
      }
      expect(await (await call('GET', `/${task.id}`)).json()).toEqual(task);
    },
  );

  it.each(['PATCH', 'DELETE', 'complete', 'reopen'])(
    'rejects stale %s before considering no-op behavior',
    async (operation) => {
      const task = await create();
      const path = `/${task.id}${operation === 'DELETE' ? '?version=2' : ['complete', 'reopen'].includes(operation) ? `/${operation}` : ''}`;
      const method = ['complete', 'reopen'].includes(operation) ? 'POST' : operation;
      const response = await call(
        method,
        path,
        method === 'POST'
          ? { version: 2 }
          : method === 'PATCH'
            ? { version: 2, title: task.title }
            : undefined,
      );
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ code: 'VERSION_CONFLICT' });
      expect(await (await call('GET', `/${task.id}`)).json()).toEqual(task);
    },
  );

  it.each(['edit/edit', 'edit/complete', 'complete/reopen', 'edit/delete'])(
    'serializes concurrent %s without losing changes',
    async (pair) => {
      const task = await create();
      const request = (action: string, title: string) =>
        action === 'edit'
          ? call('PATCH', `/${task.id}`, { version: 1, title })
          : action === 'delete'
            ? call('DELETE', `/${task.id}?version=1`)
            : call('POST', `/${task.id}/${action}`, { version: 1 });
      const [left, right] = pair.split('/');
      const responses = await Promise.all([request(left, 'Left'), request(right, 'Right')]);
      const statuses = responses.map((response) => response.status);
      // A reopen of an already open task may validly finish before completion
      // without consuming a version. Every actual write still uses version 1 once.
      if (pair === 'complete/reopen') {
        expect(statuses[0]).toBe(200);
        expect([200, 409]).toContain(statuses[1]);
        expect(await prisma.client.task.findUnique({ where: { id: task.id } })).toMatchObject({
          version: 2,
          completedById: owner.id,
        });
      } else if (pair === 'edit/delete' && statuses[1] === 204) {
        expect(statuses[0]).toBe(404);
        expect(await prisma.client.task.findUnique({ where: { id: task.id } })).toBeNull();
      } else {
        expect(statuses.sort()).toEqual([200, 409]);
        expect(await prisma.client.task.findUnique({ where: { id: task.id } })).toMatchObject({
          version: 2,
        });
      }
    },
  );

  it('requires active sessions and session-bound CSRF/Origin without writes', async () => {
    expect((await call('POST', '', { title: 'Denied' }, null)).status).toBe(401);
    expect((await call('GET', '', undefined, pending)).status).toBe(403);
    expect((await call('POST', '', { title: 'Denied' }, pending)).status).toBe(403);
    for (const headers of [
      { Origin: '' },
      { Origin: 'https://other.example.test' },
      { 'X-CSRF-Token': '' },
      { 'X-CSRF-Token': member.csrf },
    ]) {
      expect((await call('POST', '', { title: 'Denied' }, owner, headers)).status).toBe(403);
    }
    expect(await prisma.client.task.count({ where: { createdById: owner.id } })).toBe(0);
  });

  it.each([
    { title: ' ' },
    { title: 'a'.repeat(201) },
    { title: 'Plan', description: 'x'.repeat(5001) },
    { title: 'Plan', scheduledDate: '2026-02-29' },
    { title: 'Plan', scheduledTime: '24:00' },
    { title: 'Plan', createdById: randomUUID() },
    { title: 'Plan', groupId: randomUUID() },
    { title: 'Plan', completedById: randomUUID() },
    { title: 'Plan', version: 2 },
  ])('rejects malformed or server-owned creation input %# without writes', async (input) => {
    const response = await call('POST', '', input);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(await prisma.client.task.count({ where: { createdById: owner.id } })).toBe(0);
  });

  it('validates mutation versions, IDs, patch fields and query pagination', async () => {
    const task = await create();
    for (const [method, path, body] of [
      ['GET', '/not-a-uuid', undefined],
      ['GET', '?limit=101', undefined],
      ['GET', '?after=no', undefined],
      ['DELETE', `/${task.id}`, undefined],
      ['POST', `/${task.id}/complete`, { version: '1' }],
      ['PATCH', `/${task.id}`, { version: 1 }],
      ['PATCH', `/${task.id}`, { version: 1, groupId: null }],
      ['PATCH', `/${task.id}`, { version: 1, title: null }],
    ] as const) {
      expect((await call(method, path, body)).status).toBe(400);
    }
    expect(await (await call('GET', `/${task.id}`)).json()).toEqual(task);
  });

  it('rolls back failed updates and exposes only a safe 503 envelope', async () => {
    const task = await create();
    const transaction = prisma.client.$transaction.bind(prisma.client);
    vi.spyOn(prisma.client, '$transaction').mockImplementation(((
      operation: (client: unknown) => Promise<unknown>,
    ) =>
      transaction(async (client) => {
        await operation(client);
        throw new Error('private-database-diagnostics');
      })) as typeof prisma.client.$transaction);
    const response = await call('PATCH', `/${task.id}`, { version: 1, title: 'Rolled back' });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: 'Service unavailable',
    });
    vi.restoreAllMocks();
    expect(await (await call('GET', `/${task.id}`)).json()).toEqual(task);
  });

  it('documents stable operations, version conflicts and mutation proof in OpenAPI', () => {
    const document = createOpenApiDocument(app);
    const paths = document.paths;
    expect(paths['/api/tasks/personal'].post.operationId).toBe('createPersonalTask');
    expect(paths['/api/tasks/personal'].get.operationId).toBe('listPersonalTasks');
    expect(paths['/api/tasks/personal/{id}'].patch.responses['409']).toBeDefined();
    expect(paths['/api/tasks/personal/{id}'].delete.responses['204'].content).toBeUndefined();
    expect(paths['/api/tasks/personal/{id}/complete'].post.parameters).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'X-CSRF-Token' })]),
    );
    expect(paths['/api/tasks/personal'].post.security).toEqual([
      { dayloSession: [], dayloCsrf: [] },
    ]);
  });
});
