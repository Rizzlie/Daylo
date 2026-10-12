import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
  ApiAuthFeatureModule,
  GOOGLE_OAUTH_CLIENT,
} from '@daylo/api/auth/feature';
import { PrismaService } from '@daylo/api/core/database';
import { OAuth2Client } from 'google-auth-library';
import { ApiHttpModule } from './api-http.module';

const databaseUrl = process.env['F06_TEST_DATABASE_URL'];
const enabled = process.env['RUN_F06_DATABASE_INTEGRATION'] === 'true';
const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');

describe.skipIf(!enabled || !databaseUrl)(
  'Google OIDC real PostgreSQL HTTP flow',
  () => {
    let app: INestApplication;
    let baseUrl: string;
    let prisma: PrismaService;
    let nonce: string;
    let exchanges = 0;
    const stateHashes: string[] = [];
    const clientId = 'synthetic.apps.googleusercontent.com';
    const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });

    beforeAll(async () => {
      if (
        !databaseUrl ||
        !/^\/daylo_f06_[a-z0-9_]+$/.test(new URL(databaseUrl).pathname)
      ) {
        throw new Error(
          'F06 integration requires an isolated daylo_f06_* database',
        );
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
                  googleClientId: clientId,
                  googleClientSecret: 'synthetic-secret',
                  googleCallbackUrl:
                    'http://localhost:4200/api/auth/google/callback',
                  environment: 'development',
                },
              }),
            ],
          }),
          ApiHttpModule,
          ApiAuthFeatureModule,
        ],
      }).compile();
      app = module.createNestApplication();
      app.setGlobalPrefix('api');
      prisma = app.get(PrismaService);
      const client = app.get<OAuth2Client>(GOOGLE_OAUTH_CLIENT);
      vi.spyOn(client.transporter, 'request').mockImplementation(
        async (options) => {
          if (String(options.url).includes('/token')) {
            exchanges++;
            const now = Math.floor(Date.now() / 1000);
            const header = Buffer.from(
              JSON.stringify({ alg: 'RS256', kid: 'test-key' }),
            ).toString('base64url');
            const payload = Buffer.from(
              JSON.stringify({
                iss: 'https://accounts.google.com',
                aud: clientId,
                sub: 'synthetic-subject',
                email: 'synthetic@example.test',
                email_verified: true,
                nonce,
                iat: now,
                exp: now + 3600,
              }),
            ).toString('base64url');
            const value = `${header}.${payload}`;
            const signature = sign(
              'RSA-SHA256',
              Buffer.from(value),
              keys.privateKey,
            ).toString('base64url');
            return {
              data: {
                id_token: `${value}.${signature}`,
                access_token: 'discard-me',
              },
              headers: new Headers(),
            } as never;
          }
          if (String(options.url).includes('/certs')) {
            return {
              data: {
                'test-key': keys.publicKey.export({
                  type: 'spki',
                  format: 'pem',
                }),
              },
              headers: new Headers(),
            } as never;
          }
          throw new Error('Unexpected external provider request');
        },
      );
      await app.listen(0, '127.0.0.1');
      baseUrl = await app.getUrl();
    });

    beforeEach(() => {
      exchanges = 0;
    });
    afterEach(async () => {
      await prisma?.client.oAuthTransaction.deleteMany({
        where: { stateHash: { in: stateHashes.splice(0) } },
      });
    });
    afterAll(async () => {
      await app?.close();
      vi.restoreAllMocks();
    });

    async function start() {
      const response = await fetch(`${baseUrl}/api/auth/google`, {
        redirect: 'manual',
      });
      expect(response.status).toBe(302);
      const location = response.headers.get('location');
      const setCookie = response.headers.get('set-cookie');
      if (!location || !setCookie)
        throw new Error('Missing transaction redirect or cookie');
      const url = new URL(location);
      const state = url.searchParams.get('state');
      const transactionNonce = url.searchParams.get('nonce');
      if (!state || !transactionNonce)
        throw new Error('Missing state or nonce');
      nonce = transactionNonce;
      stateHashes.push(hash(state));
      return { state, cookie: setCookie.split(';')[0] };
    }
    const callback = (
      state: string,
      cookie: string,
      query = 'code=synthetic-code',
    ) =>
      fetch(`${baseUrl}/api/auth/google/callback?state=${state}&${query}`, {
        redirect: 'manual',
        headers: { cookie },
      });

    it('resolves the runtime provider graph, verifies Google identity and consumes the database transaction without users or sessions', async () => {
      const usersBefore = await prisma.client.user.count();
      const sessionsBefore = await prisma.client.session.count();
      const { state, cookie } = await start();
      const row = await prisma.client.oAuthTransaction.findUnique({
        where: { stateHash: hash(state) },
      });
      expect(row?.browserBindingHash).toBe(hash(cookie.split('=')[1]));
      const response = await callback(state, cookie);
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({
        statusCode: 503,
        code: 'SERVICE_UNAVAILABLE',
        message: 'Daylo sign-in completion is not yet available',
      });
      expect(
        await prisma.client.oAuthTransaction.findUnique({
          where: { stateHash: hash(state) },
        }),
      ).toBeNull();
      expect((await callback(state, cookie)).status).toBe(401);
      expect(exchanges).toBe(1);
      expect(await prisma.client.user.count()).toBe(usersBefore);
      expect(await prisma.client.session.count()).toBe(sessionsBefore);
    });

    it('allows only one of eight concurrent HTTP callbacks to exchange the provider code', async () => {
      const { state, cookie } = await start();
      const responses = await Promise.all(
        Array.from({ length: 8 }, () => callback(state, cookie)),
      );
      expect(
        responses.filter((response) => response.status === 503),
      ).toHaveLength(1);
      expect(
        responses.filter((response) => response.status === 401),
      ).toHaveLength(7);
      expect(exchanges).toBe(1);
    });

    it('keeps a mismatched browser from consuming the legitimate attempt and consumes refusal once', async () => {
      const { state, cookie } = await start();
      expect(
        (await callback(state, `daylo_oauth_browser=${'x'.repeat(43)}`)).status,
      ).toBe(401);
      expect(
        await prisma.client.oAuthTransaction.findUnique({
          where: { stateHash: hash(state) },
        }),
      ).not.toBeNull();
      expect(
        (await callback(state, cookie, 'error=access_denied')).status,
      ).toBe(401);
      expect((await callback(state, cookie)).status).toBe(401);
      expect(exchanges).toBe(0);
    });

    it('rejects expired persisted transactions before any external exchange', async () => {
      const { state, cookie } = await start();
      await prisma.client.oAuthTransaction.update({
        where: { stateHash: hash(state) },
        data: { expiresAt: new Date(Date.now() - 1) },
      });
      expect((await callback(state, cookie)).status).toBe(401);
      expect(exchanges).toBe(0);
    });
  },
);
