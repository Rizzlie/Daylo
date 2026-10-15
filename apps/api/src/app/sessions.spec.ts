import { createHash, randomUUID } from 'node:crypto';
import { Controller, Get, INestApplication, Post, Req, SetMetadata } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { SessionService, SESSION_SECONDS, GOOGLE_OAUTH_CLIENT } from '@daylo/api/auth/feature';
// eslint-disable-next-line @nx/enforce-module-boundaries -- Test-only persistence fixture; the PostgreSQL variant uses the production adapter.
import {
  SessionStore,
  NewSession,
  StoredSession,
  SESSION_MAX_AGE_SECONDS,
} from '@daylo/api/auth/data-access';
import { PrismaService } from '@daylo/api/core/database';
import { SecurityEventWriter } from '@daylo/api/core/security-events';
import { ALLOW_PENDING_SESSION, ActorContext } from '@daylo/api/core/identity/contracts';
import { currentSessionResponseSchema, csrfTokenResponseSchema } from '@daylo/shared/schemas';
import { OAuth2Client } from 'google-auth-library';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { BoundedThrottlerStorage } from './rate-limiting/bounded-throttler-storage';

const databaseUrl = process.env['F06_TEST_DATABASE_URL'];
const databaseEnabled = process.env['RUN_F06_DATABASE_INTEGRATION'] === 'true' && !!databaseUrl;
const frontendOrigin = 'http://localhost:4200';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
type SessionRequest = Request & { actor: ActorContext };

// Test-only endpoints exercise the default guard and the narrow pending exception.
// No test authentication or synthetic business endpoints enter runtime modules.
@Controller('session-test')
class SessionTestController {
  @Get('protected')
  read(@Req() request: SessionRequest) {
    return request.actor;
  }

  @Post('protected')
  write(@Req() request: SessionRequest) {
    return { userId: request.actor.userId };
  }

  @Post('invitation')
  @SetMetadata(ALLOW_PENDING_SESSION, true)
  invitation(@Req() request: SessionRequest) {
    return { userId: request.actor.userId };
  }
}

for (const postgres of [false, true]) {
  describe.skipIf(postgres && !databaseEnabled)(
    postgres ? 'Sessions and CSRF with real PostgreSQL' : 'Sessions and CSRF HTTP policy',
    () => {
      let app: INestApplication;
      let baseUrl: string;
      let service: SessionService;
      let store: SessionStore;
      let prisma: PrismaService;
      let user: StoredSession['user'];
      const eventLines: string[] = [];
      const prefix = `f06-session-${randomUUID()}`;
      const rows = new Map<string, StoredSession & { tokenHash: string; createdAt: Date }>();
      const users = new Map<string, StoredSession['user']>();
      const fixtureStore = {
        async create(data: NewSession, previousTokenHash?: string) {
          if (previousTokenHash) rows.delete(previousTokenHash);
          rows.set(data.tokenHash, {
            ...data,
            id: randomUUID(),
            user: users.get(data.userId)!,
            createdAt: new Date(),
          });
        },
        async findValid(tokenHash: string, now: Date) {
          const row = rows.get(tokenHash);
          return row &&
            row.expiresAt > now &&
            row.createdAt.getTime() + SESSION_MAX_AGE_SECONDS * 1000 > now.getTime()
            ? { ...row, user: users.get(row.user.id)! }
            : null;
        },
        async renew(tokenHash: string, now: Date, expiresAt: Date) {
          const row = rows.get(tokenHash);
          if (
            !row ||
            row.expiresAt <= now ||
            row.createdAt.getTime() + SESSION_MAX_AGE_SECONDS * 1000 <= now.getTime()
          )
            return null;
          row.expiresAt = new Date(
            Math.min(
              Math.max(row.expiresAt.getTime(), expiresAt.getTime()),
              row.createdAt.getTime() + SESSION_MAX_AGE_SECONDS * 1000,
            ),
          );
          return { ...row, user: users.get(row.user.id)! };
        },
        async revoke(id: string) {
          for (const [tokenHash, row] of rows) if (row.id === id) rows.delete(tokenHash);
        },
      };

      beforeAll(async () => {
        if (
          postgres &&
          (!databaseUrl || !/^\/daylo_f06_[a-z0-9_]+$/.test(new URL(databaseUrl).pathname))
        ) {
          throw new Error('Session integration requires an isolated daylo_f06_* database');
        }
        const builder = Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              ignoreEnvFile: true,
              isGlobal: true,
              load: [
                () => ({
                  runtime: {
                    databaseUrl,
                    frontendOrigin,
                    environment: 'development',
                    initialOwnerEmail: `${prefix}-owner@example.test`,
                    googleClientId: 'synthetic.apps.googleusercontent.com',
                    googleCallbackUrl: `${frontendOrigin}/api/auth/google/callback`,
                  },
                }),
              ],
            }),
            AppModule,
          ],
          controllers: [SessionTestController],
        })
          .overrideProvider(GOOGLE_OAUTH_CLIENT)
          .useValue(new OAuth2Client());
        if (!postgres) {
          builder.overrideProvider(PrismaService).useValue({});
          builder.overrideProvider(SessionStore).useValue(fixtureStore);
        }
        const module = await builder.compile();
        app = module.createNestApplication();
        app.setGlobalPrefix('api');
        service = app.get(SessionService);
        store = app.get(SessionStore);
        prisma = app.get(PrismaService);
        await app.listen(0, '127.0.0.1');
        baseUrl = await app.getUrl();
      });

      beforeEach(async () => {
        eventLines.length = 0;
        vi.spyOn(app.get(SecurityEventWriter), 'write').mockImplementation((line) => {
          eventLines.push(line);
          return true;
        });
        app.get(BoundedThrottlerStorage).clear();
        vi.useFakeTimers({ toFake: ['Date'] });
        app.get(ConfigService).set('runtime.environment', 'development');
        app.get(ConfigService).set('runtime.frontendOrigin', frontendOrigin);
        const data = {
          id: randomUUID(),
          googleSubject: `${prefix}-${randomUUID()}`,
          email: `${prefix}-${randomUUID()}@example.test`,
          displayName: 'Session User',
          accessStatus: 'ACTIVE' as const,
        };
        user = postgres ? await prisma.client.user.create({ data }) : data;
        users.set(user.id, user);
      });

      afterEach(async () => {
        vi.restoreAllMocks();
        vi.useRealTimers();
        if (postgres)
          await prisma.client.user.deleteMany({ where: { googleSubject: { startsWith: prefix } } });
        rows.clear();
        users.clear();
      });
      afterAll(async () => {
        await app?.close();
      });

      async function login(previous?: string) {
        let token = '';
        let cookieName = '';
        let options: Record<string, unknown> = {};
        let xsrf: { value: string; options: Record<string, unknown> } | undefined;
        const response = {
          cookie: (name: string, value: string, attributes: Record<string, unknown>) => {
            if (name === 'daylo_xsrf') xsrf = { value, options: attributes };
            else {
              cookieName = name;
              token = value;
              options = attributes;
            }
          },
        } as unknown as Response;
        await service.issue(user.id, { headers: { cookie: previous } } as Request, response);
        return { token, cookie: `${cookieName}=${token}`, options, xsrf };
      }

      async function persisted(token: string) {
        return store.findValid(hash(token), new Date());
      }

      async function ageSession(token: string, ageMs: number) {
        const createdAt = new Date(Date.now() - ageMs);
        const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
        if (postgres) {
          await prisma.client.session.update({
            where: { tokenHash: hash(token) },
            data: { createdAt, expiresAt },
          });
        } else {
          const row = rows.get(hash(token));
          if (!row) throw new Error('Missing synthetic session');
          row.createdAt = createdAt;
          row.expiresAt = expiresAt;
        }
        return new Date(createdAt.getTime() + SESSION_MAX_AGE_SECONDS * 1000);
      }

      it('logs CSRF refusal and committed sign-out with verified user ID and no session proof', async () => {
        const issued = await login();
        const proof = await csrf(issued.cookie);
        expect((await mutate('auth/sign-out', issued.cookie, 'private-csrf-sentinel')).status).toBe(
          403,
        );
        expect(await persisted(issued.token)).not.toBeNull();
        const rejected = JSON.parse(eventLines[0]);
        expect(rejected).toMatchObject({
          event: 'csrf_rejected',
          reason: 'invalid_proof',
          actorUserId: user.id,
        });
        expect(eventLines).toHaveLength(1);
        let committed = false;
        const revoke = store.revoke.bind(store);
        vi.spyOn(store, 'revoke').mockImplementation(async (id) => {
          await revoke(id);
          committed = true;
        });
        vi.spyOn(app.get(SecurityEventWriter), 'write').mockImplementation((line) => {
          if (JSON.parse(line).event === 'session_revoked') expect(committed).toBe(true);
          eventLines.push(line);
          return true;
        });
        expect((await mutate('auth/sign-out', issued.cookie, proof)).status).toBe(204);
        expect(await persisted(issued.token)).toBeNull();
        expect(JSON.parse(eventLines[1])).toMatchObject({
          event: 'session_revoked',
          reason: 'sign_out',
          actorUserId: user.id,
        });
        expect(JSON.parse(eventLines[1]).requestId).not.toBe(rejected.requestId);
        for (const secret of [
          issued.token,
          hash(issued.token),
          proof,
          user.email,
          user.displayName,
          'private-csrf-sentinel',
        ]) {
          expect(eventLines.join('')).not.toContain(secret);
        }
      });

      it('does not claim revocation on rollback and still revokes when stdout fails', async () => {
        const issued = await login();
        const proof = await csrf(issued.cookie);
        const failure = vi
          .spyOn(store, 'revoke')
          .mockRejectedValue(new Error('private-database-secret'));
        expect((await mutate('auth/sign-out', issued.cookie, proof)).status).toBe(503);
        expect(await persisted(issued.token)).not.toBeNull();
        expect(eventLines).toHaveLength(0);
        failure.mockRestore();
        vi.spyOn(app.get(SecurityEventWriter), 'write').mockImplementation(() => {
          throw new Error('private-sink-secret');
        });
        expect((await mutate('auth/sign-out', issued.cookie, proof)).status).toBe(204);
        expect(await persisted(issued.token)).toBeNull();
        expect((await get('auth/session', issued.cookie)).status).toBe(401);
      });

      it('caps renewal and cookie expiry at the 30-day absolute deadline', async () => {
        const issued = await login();
        const deadline = await ageSession(
          issued.token,
          SESSION_MAX_AGE_SECONDS * 1000 - 60 * 60 * 1000,
        );
        const response = await get('auth/session', issued.cookie);
        expect(response.status).toBe(200);
        expect(response.headers.get('set-cookie')).toContain(`Expires=${deadline.toUTCString()}`);
        expect((await persisted(issued.token))?.expiresAt).toEqual(deadline);
      });

      it.each([0, 1])(
        'rejects reads and renewal at/after the absolute deadline (%s ms)',
        async (offset) => {
          const issued = await login();
          await ageSession(issued.token, SESSION_MAX_AGE_SECONDS * 1000 + offset);
          expect((await get('auth/csrf', issued.cookie)).status).toBe(401);
          expect((await get('auth/session', issued.cookie)).status).toBe(401);
          expect(await persisted(issued.token)).toBeNull();
        },
      );

      async function csrf(cookie: string): Promise<string> {
        const response = await fetch(`${baseUrl}/api/auth/csrf`, { headers: { cookie } });
        expect(response.status).toBe(200);
        expect(response.headers.get('cache-control')).toBe('no-store');
        expect(response.headers.get('set-cookie')).toBeNull();
        return csrfTokenResponseSchema.parse(await response.json()).csrfToken;
      }

      const get = (path: string, cookie?: string) =>
        fetch(`${baseUrl}/api/${path}`, {
          headers: cookie ? { cookie } : {},
        });
      const mutate = (
        path: string,
        cookie: string,
        token?: string,
        origin: string | null = frontendOrigin,
      ) =>
        fetch(`${baseUrl}/api/${path}`, {
          method: 'POST',
          headers: {
            cookie,
            ...(token ? { 'X-CSRF-Token': token } : {}),
            ...(origin ? { origin } : {}),
          },
        });

      it('issues only hashes, uses the agreed cookie attributes and survives repeated HTTP reloads', async () => {
        const issued = await login();
        expect(issued.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
        expect(issued.options).toMatchObject({
          httpOnly: true,
          sameSite: 'lax',
          secure: false,
          path: '/',
        });
        expect((issued.options['expires'] as Date).getTime()).toBe(
          Date.now() + SESSION_SECONDS * 1000,
        );
        const record = await persisted(issued.token);
        expect(record?.csrfTokenHash).toMatch(/^[a-f0-9]{64}$/);
        if (postgres) {
          const row = await prisma.client.session.findUniqueOrThrow({
            where: { tokenHash: hash(issued.token) },
          });
          expect(row.tokenHash).not.toBe(issued.token);
          expect(row.csrfTokenHash).not.toBe(await csrf(issued.cookie));
        }
        for (let i = 0; i < 2; i++) {
          const response = await get('auth/session', issued.cookie);
          expect(response.status).toBe(200);
          expect(response.headers.get('cache-control')).toBe('no-store');
          expect(currentSessionResponseSchema.parse(await response.json())).toEqual({
            status: 'active',
            user: { id: user.id, email: user.email, displayName: user.displayName },
          });
        }
      });

      it('issues readable session-bound XSRF proof and repairs the same value on session reload', async () => {
        const issued = await login();
        const proof = await csrf(issued.cookie);
        expect(issued.xsrf?.value).toBe(proof);
        expect(issued.xsrf?.options).toMatchObject({
          httpOnly: false,
          sameSite: 'lax',
          secure: false,
          path: '/',
          expires: issued.options['expires'],
        });
        expect(issued.xsrf?.options['domain']).toBeUndefined();
        expect(issued.xsrf?.value).not.toBe(issued.token);
        for (const cookie of [issued.cookie, `${issued.cookie}; daylo_xsrf=injected`]) {
          const response = await get('auth/session', cookie);
          const xsrf = response.headers
            .getSetCookie()
            .find((value) => value.startsWith('daylo_xsrf='));
          expect(xsrf).toContain(`daylo_xsrf=${proof};`);
          expect(xsrf).not.toContain('HttpOnly');
          expect(
            response.headers.getSetCookie().find((value) => value.startsWith('daylo_session=')),
          ).toContain('HttpOnly');
        }
      });

      it('never accepts the readable cookie instead of proof, even when it contains a valid token', async () => {
        const first = await login();
        const second = await login();
        const firstProof = await csrf(first.cookie);
        const secondProof = await csrf(second.cookie);
        expect(
          (await mutate('session-test/protected', `${first.cookie}; daylo_xsrf=${firstProof}`))
            .status,
        ).toBe(403);
        expect(
          (
            await mutate(
              'session-test/protected',
              `${first.cookie}; daylo_xsrf=${secondProof}`,
              secondProof,
            )
          ).status,
        ).toBe(403);
        expect(
          (
            await mutate(
              'session-test/protected',
              `${first.cookie}; daylo_xsrf=injected`,
              firstProof,
            )
          ).status,
        ).toBe(201);
        expect(await persisted(first.token)).not.toBeNull();
      });

      it('extends database expiry and cookie by seven days only on current-session retrieval', async () => {
        const issued = await login();
        const deadline = (await persisted(issued.token))!.expiresAt;
        vi.setSystemTime(new Date(deadline.getTime() - 86400_000));
        const expected = Date.now() + SESSION_SECONDS * 1000;
        const response = await get('auth/session', issued.cookie);
        expect(response.status).toBe(200);
        expect((await persisted(issued.token))!.expiresAt.getTime()).toBe(expected);
        expect(response.headers.get('set-cookie')).toContain(
          `Expires=${new Date(expected).toUTCString()}`,
        );
        expect(response.headers.get('set-cookie')).toContain(issued.cookie);
      });

      it('does not renew for CSRF retrieval, authenticated reads or mutations', async () => {
        const issued = await login();
        const deadline = (await persisted(issued.token))!.expiresAt;
        vi.setSystemTime(new Date(deadline.getTime() - 86400_000));
        const proof = await csrf(issued.cookie);
        const head = await fetch(`${baseUrl}/api/auth/session`, {
          method: 'HEAD',
          headers: { cookie: issued.cookie },
        });
        expect(head.status).toBe(200);
        expect(head.headers.get('set-cookie')).toBeNull();
        expect((await get('session-test/protected', issued.cookie)).status).toBe(200);
        expect((await mutate('session-test/protected', issued.cookie, proof)).status).toBe(201);
        expect((await persisted(issued.token))!.expiresAt).toEqual(deadline);
      });

      it.each(['auth/session', 'auth/csrf', 'session-test/protected'])(
        'rejects missing, malformed, unknown and ambiguous cookies on %s',
        async (path) => {
          const issued = await login();
          for (const cookie of [
            undefined,
            'daylo_session=invalid',
            `daylo_session=${'x'.repeat(43)}`,
            `${issued.cookie}; ${issued.cookie}`,
          ]) {
            const response = await get(path, cookie);
            expect(response.status).toBe(401);
            expect(await response.json()).toEqual({
              statusCode: 401,
              code: 'AUTHENTICATION_REQUIRED',
              message: 'Authentication required',
            });
            expect(response.headers.get('set-cookie')).toContain('daylo_session=;');
          }
        },
      );

      it.each([0, 1])(
        'cannot renew or use a session at/after its exact deadline (%s ms)',
        async (offset) => {
          const issued = await login();
          const proof = await csrf(issued.cookie);
          const deadline = (await persisted(issued.token))!.expiresAt;
          vi.setSystemTime(new Date(deadline.getTime() + offset));
          expect((await get('auth/session', issued.cookie)).status).toBe(401);
          expect((await get('auth/csrf', issued.cookie)).status).toBe(401);
          expect((await mutate('auth/sign-out', issued.cookie, proof)).status).toBe(401);
          expect(
            await store.renew(
              hash(issued.token),
              new Date(),
              new Date(Date.now() + SESSION_SECONDS * 1000),
            ),
          ).toBeNull();
        },
      );

      it('returns stable CSRF across retrievals and binds it to one session', async () => {
        const first = await login();
        const second = await login();
        const firstProof = await csrf(first.cookie);
        expect(await csrf(first.cookie)).toBe(firstProof);
        const secondProof = await csrf(second.cookie);
        expect(secondProof).not.toBe(firstProof);
        expect((await mutate('auth/sign-out', first.cookie, secondProof)).status).toBe(403);
        expect((await get('auth/session', first.cookie)).status).toBe(200);
      });

      it.each([undefined, 'invalid', 'x'.repeat(43)])(
        'rejects absent/invalid CSRF %s without revoking the session',
        async (proof) => {
          const issued = await login();
          const response = await mutate('auth/sign-out', issued.cookie, proof);
          expect(response.status).toBe(403);
          expect(await response.json()).toMatchObject({ code: 'ACCESS_FORBIDDEN' });
          expect(await persisted(issued.token)).not.toBeNull();
        },
      );

      it.each([
        'missing',
        'null',
        'http://attacker.example',
        `${frontendOrigin}.attacker.example`,
        'http://localhost:4201',
        `${frontendOrigin}/`,
      ])('rejects %s Origin with otherwise valid CSRF', async (origin) => {
        const issued = await login();
        const proof = await csrf(issued.cookie);
        const response = await mutate(
          'auth/sign-out',
          issued.cookie,
          proof,
          origin === 'missing' ? null : origin,
        );
        expect(response.status).toBe(403);
        expect(await persisted(issued.token)).not.toBeNull();
      });

      it('revokes only the current session, clears its cookie and prevents renewal/replay', async () => {
        const first = await login();
        const second = await login();
        const proof = await csrf(first.cookie);
        const response = await mutate('auth/sign-out', first.cookie, proof);
        expect(response.status).toBe(204);
        expect(await response.text()).toBe('');
        expect(response.headers.get('set-cookie')).toMatch(
          /daylo_session=; Path=\/; Expires=.*; HttpOnly; SameSite=Lax/,
        );
        const xsrf = response.headers
          .getSetCookie()
          .find((value) => value.startsWith('daylo_xsrf='));
        expect(xsrf).toContain('daylo_xsrf=; Path=/; Expires=');
        expect(xsrf).not.toContain('HttpOnly');
        expect((await get('auth/session', first.cookie)).status).toBe(401);
        expect((await mutate('auth/sign-out', first.cookie, proof)).status).toBe(401);
        expect((await get('auth/session', second.cookie)).status).toBe(200);
      });

      it('replaces the presented browser session on successful new sign-in without accepting fixation', async () => {
        const first = await login();
        const second = await login(first.cookie);
        expect(second.token).not.toBe(first.token);
        expect((await get('auth/session', first.cookie)).status).toBe(401);
        expect((await get('auth/session', second.cookie)).status).toBe(200);
      });

      it('restricts pending users by default while allowing identity, CSRF, invitation exceptions and sign-out', async () => {
        user.accessStatus = 'PENDING';
        if (postgres)
          await prisma.client.user.update({
            where: { id: user.id },
            data: { accessStatus: 'PENDING' },
          });
        const issued = await login();
        const response = await get('auth/session', issued.cookie);
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ status: 'pending' });
        const proof = await csrf(issued.cookie);
        expect((await get('session-test/protected', issued.cookie)).status).toBe(403);
        expect((await mutate('session-test/protected', issued.cookie, proof)).status).toBe(403);
        expect(eventLines.map((line) => JSON.parse(line))).toEqual([
          expect.objectContaining({
            event: 'admission_denied',
            reason: 'pending_access',
            actorUserId: user.id,
          }),
          expect.objectContaining({
            event: 'admission_denied',
            reason: 'pending_access',
            actorUserId: user.id,
          }),
        ]);
        expect((await mutate('session-test/invitation', issued.cookie)).status).toBe(403);
        expect((await mutate('session-test/invitation', issued.cookie, proof)).status).toBe(201);
        expect((await mutate('auth/sign-out', issued.cookie, proof)).status).toBe(204);
      });

      it('reads current profile/access from persistence without embedding it in the cookie', async () => {
        const issued = await login();
        user.displayName = 'Updated Name';
        user.accessStatus = 'PENDING';
        if (postgres)
          await prisma.client.user.update({
            where: { id: user.id },
            data: { displayName: user.displayName, accessStatus: user.accessStatus },
          });
        const response = await get('auth/session', issued.cookie);
        expect(await response.json()).toMatchObject({
          status: 'pending',
          user: { displayName: 'Updated Name' },
        });
      });

      it.each(['production', 'test', 'https-development'])(
        'sets and clears Secure cookies in %s',
        async (mode) => {
          app
            .get(ConfigService)
            .set('runtime.environment', mode === 'https-development' ? 'development' : mode);
          if (mode === 'https-development')
            app.get(ConfigService).set('runtime.frontendOrigin', 'https://daylo.example');
          const issued = await login();
          expect(issued.options['secure']).toBe(true);
          expect(issued.xsrf?.options['secure']).toBe(true);
          expect(issued.xsrf?.options['httpOnly']).toBe(false);
          expect(issued.cookie).toMatch(/^__Host-daylo_session=/);
          expect(issued.options['path']).toBe('/');
          expect(issued.options['domain']).toBeUndefined();
          expect((await get('auth/session', issued.cookie.replace('__Host-', ''))).status).toBe(
            401,
          );
          expect((await get('auth/session', `${issued.cookie}; ${issued.cookie}`)).status).toBe(
            401,
          );
          const current = await get('auth/session', issued.cookie);
          expect(current.headers.get('set-cookie')).toContain('Secure');
          const proof = await csrf(issued.cookie);
          const response = await mutate(
            'auth/sign-out',
            issued.cookie,
            proof,
            app.get(ConfigService).getOrThrow<string>('runtime.frontendOrigin'),
          );
          expect(response.status).toBe(204);
          expect(response.headers.get('set-cookie')).toContain('Secure');
        },
      );

      it.each(['findValid', 'renew', 'revoke'] as const)(
        'returns safe 503 on persistence %s failure without leaking diagnostics',
        async (method) => {
          const issued = await login();
          const proof = await csrf(issued.cookie);
          vi.spyOn(store, method).mockRejectedValue(new Error('private-database-credentials'));
          const response =
            method === 'revoke'
              ? await mutate('auth/sign-out', issued.cookie, proof)
              : await get('auth/session', issued.cookie);
          expect(response.status).toBe(503);
          expect(await response.json()).toEqual({
            statusCode: 503,
            code: 'SERVICE_UNAVAILABLE',
            message: 'Service unavailable',
          });
          expect(response.headers.get('set-cookie')).toBeNull();
        },
      );

      it('never issues a cookie if session persistence fails', async () => {
        vi.spyOn(store, 'create').mockRejectedValue(new Error('private-database-credentials'));
        await expect(login()).rejects.toThrow('Service Unavailable');
      });

      it('does not resurrect a session during concurrent renewal and sign-out', async () => {
        const issued = await login();
        const proof = await csrf(issued.cookie);
        const responses = await Promise.all([
          ...Array.from({ length: 8 }, () => get('auth/session', issued.cookie)),
          mutate('auth/sign-out', issued.cookie, proof),
        ]);
        expect(responses.at(-1)?.status).toBe(204);
        expect(
          responses.slice(0, -1).every((response) => [200, 401].includes(response.status)),
        ).toBe(true);
        expect(await persisted(issued.token)).toBeNull();
        expect((await get('auth/session', issued.cookie)).status).toBe(401);
      });

      it('cannot shorten a deadline through an out-of-order renewal', async () => {
        const issued = await login();
        const now = new Date();
        const later = new Date(Date.now() + 2 * SESSION_SECONDS * 1000);
        await store.renew(hash(issued.token), now, later);
        await store.renew(hash(issued.token), now, new Date(Date.now() + SESSION_SECONDS * 1000));
        expect((await persisted(issued.token))?.expiresAt).toEqual(later);
      });
    },
  );
}
