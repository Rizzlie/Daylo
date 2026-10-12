import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
  GOOGLE_OAUTH_CLIENT,
} from '@daylo/api/auth/feature';
// eslint-disable-next-line @nx/enforce-module-boundaries -- Test-only persistence override; production application composition still imports feature modules only.
import {
  NewOAuthTransaction,
  OAuthTransactionStore,
  SessionStore,
} from '@daylo/api/auth/data-access';
import { PrismaService } from '@daylo/api/core/database';
import { TRANSACTION_RUNNER, TransactionContext } from '@daylo/api/core/transactions/contracts';
import { USER_IDENTITY, AdmittedProfile } from '@daylo/api/users/contracts';
import { INVITATION_ADMISSION } from '@daylo/api/groups/contracts';
import { AppModule } from './app.module';
import { OAuth2Client } from 'google-auth-library';
import { ApiHttpModule } from './api-http.module';
import { createOpenApiDocument } from './openapi';

const clientId = 'synthetic.apps.googleusercontent.com';
const cookieName = 'daylo_oauth_browser';
const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const keyPair = generateKeyPairSync('rsa', { modulusLength: 2048 });
const wrongKey = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicKey = keyPair.publicKey.export({ type: 'spki', format: 'pem' });
function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new Error('Missing test fixture value');
  return value;
}

// Only the external Google transport is controlled. Production provider logic,
// JWT verification, transaction services and HTTP protections remain real.
describe('Google OIDC HTTP flow', () => {
  let app: INestApplication;
  let baseUrl: string;
  let client: OAuth2Client;
  let tokenOverrides: Record<string, unknown>;
  let omittedClaim: string | undefined;
  let invalidSignature: boolean;
  let algorithm: string;
  let missingToken: boolean;
  let providerStatus: number | undefined;
  let certificateFailure: boolean;
  let tokenRequests: number;
  let currentNonce: string;
  let databaseFailure: boolean;
  const rows = new Map<string, NewOAuthTransaction>();
  const store = {
    async create(row: NewOAuthTransaction, now: Date) {
      if (databaseFailure) throw new Error('private-database-url');
      for (const [state, existing] of rows)
        if (existing.expiresAt <= now) rows.delete(state);
      rows.set(row.stateHash, row);
    },
    async consume(stateHash: string, bindingHash: string, now: Date) {
      if (databaseFailure) throw new Error('private-database-url');
      const row = rows.get(stateHash);
      if (
        !row ||
        row.browserBindingHash !== bindingHash ||
        row.expiresAt <= now
      )
        return null;
      rows.delete(stateHash);
      return row.nonce;
    },
  };

  beforeAll(async () => {
    client = new OAuth2Client({
      clientId,
      clientSecret: 'synthetic-secret',
      redirectUri: 'http://localhost:4200/api/auth/google/callback',
    });
    vi.spyOn(client.transporter, 'request').mockImplementation(
      async (options) => {
        if (String(options.url).includes('/token')) {
          tokenRequests++;
          if (providerStatus !== undefined)
            throw {
              response: { status: providerStatus },
              message: 'private-provider-response',
            };
          const now = Math.floor(Date.now() / 1000);
          const claims: Record<string, unknown> = {
            iss: 'https://accounts.google.com',
            aud: clientId,
            sub: 'synthetic-google-subject',
            email: 'synthetic@example.test',
            email_verified: true,
            name: 'Synthetic User',
            nonce: currentNonce,
            iat: now,
            exp: now + 3600,
            ...tokenOverrides,
          };
          if (omittedClaim) delete claims[omittedClaim];
          const header = Buffer.from(
            JSON.stringify({ alg: algorithm, kid: 'synthetic-key' }),
          ).toString('base64url');
          const payload = Buffer.from(JSON.stringify(claims)).toString(
            'base64url',
          );
          const signed = `${header}.${payload}`;
          const signature = sign(
            'RSA-SHA256',
            Buffer.from(signed),
            invalidSignature ? wrongKey.privateKey : keyPair.privateKey,
          ).toString('base64url');
          return {
            data: {
              ...(missingToken ? {} : { id_token: `${signed}.${signature}` }),
              access_token: 'private-access-token',
              refresh_token: 'private-refresh-token',
            },
            headers: new Headers(),
          } as never;
        }
        if (String(options.url).includes('/certs')) {
          if (certificateFailure) throw new Error('private-cert-network-error');
          return {
            data: { 'synthetic-key': publicKey },
            headers: new Headers({ 'cache-control': 'max-age=0' }),
          } as never;
        }
        throw new Error('Unexpected provider request');
      },
    );

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          isGlobal: true,
          load: [
            () => ({
              runtime: {
                googleClientId: clientId,
                googleCallbackUrl:
                  'http://localhost:4200/api/auth/google/callback',
                environment: 'development',
                initialOwnerEmail: 'synthetic@example.test',
                frontendOrigin: 'http://localhost:4200',
              },
            }),
          ],
        }),
        ApiHttpModule,
        AppModule,
      ],
    })
      .overrideProvider(TRANSACTION_RUNNER)
      .useValue({ run: (operation: (context: TransactionContext) => Promise<unknown>) => operation({} as TransactionContext) })
      .overrideProvider(USER_IDENTITY)
      .useValue({
        lockIdentity: async () => undefined,
        findBySubject: async () => null,
        emailAvailable: async () => true,
        saveProfile: async (profile: AdmittedProfile) => ({ id: 'synthetic-user', ...profile }),
      })
      .overrideProvider(INVITATION_ADMISSION)
      .useValue({ hasEligibleInvitation: async () => false })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(OAuthTransactionStore)
      .useValue(store)
      .overrideProvider(SessionStore)
      .useValue({ create: async () => undefined })
      .overrideProvider(GOOGLE_OAUTH_CLIENT)
      .useValue(client)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  beforeEach(() => {
    rows.clear();
    tokenOverrides = {};
    omittedClaim = undefined;
    invalidSignature = false;
    algorithm = 'RS256';
    missingToken = false;
    providerStatus = undefined;
    certificateFailure = false;
    tokenRequests = 0;
    databaseFailure = false;
    app.get(ConfigService).set('runtime.environment', 'development');
    app
      .get(ConfigService)
      .set(
        'runtime.googleCallbackUrl',
        'http://localhost:4200/api/auth/google/callback',
      );
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
    const location = new URL(required(response.headers.get('location')));
    currentNonce = required(location.searchParams.get('nonce'));
    return {
      response,
      location,
      state: required(location.searchParams.get('state')),
      cookie: required(response.headers.get('set-cookie')).split(';')[0],
    };
  }

  function callback(
    state: string,
    cookie?: string,
    extra = 'code=synthetic-code',
  ) {
    return fetch(
      `${baseUrl}/api/auth/google/callback?state=${encodeURIComponent(state)}&${extra}`,
      {
        redirect: 'manual',
        headers: cookie ? { cookie } : {},
      },
    );
  }

  async function expectAuthFailure(response: Response) {
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      statusCode: 401,
      code: 'GOOGLE_AUTHENTICATION_FAILED',
      message: 'Google authentication failed',
    });
  }

  it('creates a ten-minute hashed browser-bound transaction and redirects with only identity scopes', async () => {
    const { response, location, state, cookie } = await start();
    expect(location.origin).toBe('https://accounts.google.com');
    expect(location.searchParams.get('client_id')).toBe(clientId);
    expect(location.searchParams.get('redirect_uri')).toBe(
      'http://localhost:4200/api/auth/google/callback',
    );
    expect(location.searchParams.get('response_type')).toBe('code');
    expect(location.searchParams.get('scope')).toBe('openid email profile');
    expect(location.searchParams.get('access_type')).toBe('online');
    const row = required(rows.get(hash(state)));
    expect(row.browserBindingHash).toBe(hash(cookie.split('=')[1]));
    expect(row.nonce).toBe(currentNonce);
    expect(row.expiresAt.getTime() - Date.now()).toBeGreaterThan(590_000);
    expect(row.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(600_000);
    const serialized = JSON.stringify(row);
    expect(serialized).not.toContain(state);
    expect(serialized).not.toContain(cookie.split('=')[1]);
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).toContain('SameSite=Lax');
    expect(response.headers.get('set-cookie')).toContain('Max-Age=600');
    expect(response.headers.get('set-cookie')).not.toContain('Secure');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  });

  it('verifies a signed token, consumes the attempt, clears binding and issues a session cookie', async () => {
    const { state, cookie } = await start();
    const response = await callback(state, cookie);
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('http://localhost:4200/today');
    expect(response.headers.get('set-cookie')).toContain(`${cookieName}=;`);
    expect(response.headers.get('set-cookie')).toContain('daylo_session');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(rows.size).toBe(0);
    expect(tokenRequests).toBe(1);
    expect(client.credentials).toEqual({});
    expect(
      (await fetch(`${baseUrl}/api/auth/session`, { headers: { cookie } }))
        .status,
    ).toBe(401);
    await expectAuthFailure(await callback(state, cookie));
    expect(tokenRequests).toBe(1);
  });

  it.each([
    'absent-cookie',
    'wrong-cookie',
    'duplicate-cookie',
    'wrong-state',
    'expired',
  ])('rejects %s before provider exchange', async (reason) => {
    const { state, cookie } = await start();
    let binding: string | undefined = cookie;
    if (reason === 'absent-cookie') binding = undefined;
    if (reason === 'wrong-cookie') binding = `${cookieName}=${'x'.repeat(43)}`;
    if (reason === 'duplicate-cookie') binding = `${cookie}; ${cookie}`;
    if (reason === 'expired')
      required(rows.get(hash(state))).expiresAt = new Date(Date.now() - 1);
    await expectAuthFailure(
      await callback(
        reason === 'wrong-state' ? 'x'.repeat(43) : state,
        binding,
      ),
    );
    expect(tokenRequests).toBe(0);
  });

  it('rejects nonce mismatch and cannot retry a failed validation', async () => {
    const { state, cookie } = await start();
    tokenOverrides.nonce = 'different-nonce';
    await expectAuthFailure(await callback(state, cookie));
    await expectAuthFailure(await callback(state, cookie));
    expect(rows.size).toBe(0);
    expect(tokenRequests).toBe(1);
  });

  it('allows only one concurrent callback to reach the provider', async () => {
    const { state, cookie } = await start();
    const responses = await Promise.all([
      callback(state, cookie),
      callback(state, cookie),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      302, 401,
    ]);
    expect(tokenRequests).toBe(1);
  });

  it.each([
    ['issuer', { iss: 'https://attacker.example' }],
    ['audience', { aud: 'other-client' }],
    ['expired', { exp: Math.floor(Date.now() / 1000) - 1 }],
    ['future-issued', { iat: Math.floor(Date.now() / 1000) + 120 }],
    ['unverified-email', { email_verified: false }],
    ['string-email-verification', { email_verified: 'true' }],
    ['invalid-email', { email: 'invalid' }],
    ['empty-subject', { sub: '' }],
    ['wrong-authorized-party', { azp: 'other-client' }],
    ['string-expiry', { exp: String(Math.floor(Date.now() / 1000) + 3600) }],
    ['not-yet-valid', { nbf: Math.floor(Date.now() / 1000) + 120 }],
  ])('rejects a signed token with invalid %s', async (_name, claims) => {
    const { state, cookie } = await start();
    tokenOverrides = claims as Record<string, unknown>;
    await expectAuthFailure(await callback(state, cookie));
  });

  it.each([
    'sub',
    'email',
    'email_verified',
    'nonce',
    'exp',
    'iat',
    'iss',
    'aud',
  ])('rejects missing %s', async (claim) => {
    const { state, cookie } = await start();
    omittedClaim = claim;
    await expectAuthFailure(await callback(state, cookie));
  });

  it.each(['signature', 'algorithm', 'missing-token'])(
    'rejects invalid %s without exposing token details',
    async (reason) => {
      const { state, cookie } = await start();
      invalidSignature = reason === 'signature';
      algorithm = reason === 'algorithm' ? 'none' : 'RS256';
      missingToken = reason === 'missing-token';
      await expectAuthFailure(await callback(state, cookie));
    },
  );

  it('accepts the documented alternate Google issuer', async () => {
    const { state, cookie } = await start();
    tokenOverrides.iss = 'accounts.google.com';
    expect((await callback(state, cookie)).status).toBe(302);
  });

  it.each([
    'error=access_denied',
    'error=access_denied&code=synthetic-code',
    '',
  ])('consumes provider refusal or missing code (%s)', async (query) => {
    const { state, cookie } = await start();
    await expectAuthFailure(await callback(state, cookie, query));
    expect(rows.size).toBe(0);
    expect(tokenRequests).toBe(0);
    await expectAuthFailure(await callback(state, cookie));
  });

  it('rejects repeated query values through Zod', async () => {
    const { state, cookie } = await start();
    const response = await callback(state, cookie, 'code=one&code=two');
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe('VALIDATION_ERROR');
    expect(tokenRequests).toBe(0);
  });

  it.each([400, 401, 500])(
    'maps provider HTTP %s safely and consumes the attempt',
    async (status) => {
      const { state, cookie } = await start();
      providerStatus = status;
      const response = await callback(state, cookie);
      expect(response.status).toBe(status < 500 ? 401 : 503);
      expect(await response.text()).not.toContain('private-');
      await expectAuthFailure(await callback(state, cookie));
      expect(tokenRequests).toBe(1);
    },
  );

  it('maps certificate transport failure to 503 without leaking provider errors', async () => {
    const { state, cookie } = await start();
    certificateFailure = true;
    const response = await callback(state, cookie);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private-');
  });

  it('maps database failures to safe 503 responses on start and callback', async () => {
    const { state, cookie } = await start();
    databaseFailure = true;
    for (const response of [
      await callback(state, cookie),
      await fetch(`${baseUrl}/api/auth/google`, { redirect: 'manual' }),
    ]) {
      expect(response.status).toBe(503);
      expect(await response.text()).not.toContain('private-');
    }
    expect(tokenRequests).toBe(0);
  });

  it('documents browser navigation and the session callback contract', () => {
    const document = createOpenApiDocument(app);
    const start = required(document.paths['/api/auth/google'].get);
    const complete = required(document.paths['/api/auth/google/callback'].get);
    expect(start.operationId).toBe('startGoogleAuthentication');
    expect(start.responses['302']).toBeDefined();
    expect(complete.operationId).toBe('completeGoogleAuthentication');
    expect(Object.keys(complete.responses).sort()).toEqual([
      '302',
      '400',
      '401',
      '403',
      '503',
    ]);
    expect(complete.responses['403'].content['application/json'].example).toEqual({
      statusCode: 403,
      code: 'ACCESS_FORBIDDEN',
      message: 'Access forbidden',
    });
    expect(complete.description).toContain(
      'Identity and provider tokens are never returned',
    );
  });

  it.each(['production', 'test', 'https-development'])(
    'sets and clears a Secure binding cookie in %s',
    async (mode) => {
      app
        .get(ConfigService)
        .set(
          'runtime.environment',
          mode === 'https-development' ? 'development' : mode,
        );
      if (mode === 'https-development')
        app
          .get(ConfigService)
          .set(
            'runtime.googleCallbackUrl',
            'https://daylo.example/api/auth/google/callback',
          );
      const { response, state, cookie } = await start();
      expect(response.headers.get('set-cookie')).toContain('Secure');
      const completion = await callback(state, cookie, 'error=access_denied');
      expect(completion.headers.get('set-cookie')).toContain('Secure');
    },
  );

  it('rejects missing state and ignores arbitrary redirect targets', async () => {
    const response = await fetch(
      `${baseUrl}/api/auth/google/callback?code=synthetic-code&returnTo=https://attacker.example`,
    );
    await expectAuthFailure(response);
    expect(response.headers.get('location')).toBeNull();
    expect(tokenRequests).toBe(0);
  });
});
