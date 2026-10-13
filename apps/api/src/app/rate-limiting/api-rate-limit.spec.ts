import { createHash } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import { Controller, Get, INestApplication, Res, SetMetadata } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { GOOGLE_OAUTH_CLIENT } from '@daylo/api/auth/feature';
// eslint-disable-next-line @nx/enforce-module-boundaries -- Test-only persistence probes verify rejection before auth persistence.
import { OAuthTransactionStore, SessionStore } from '@daylo/api/auth/data-access';
import { DatabaseReadinessService, PrismaService } from '@daylo/api/core/database';
import { PUBLIC_ENDPOINT } from '@daylo/api/core/identity/contracts';
import { SecurityEventWriter } from '@daylo/api/core/security-events';
import { OAuth2Client } from 'google-auth-library';
import type { Response as ExpressResponse } from 'express';
import { AppModule } from '../app.module';
import { setupOpenApi } from '../openapi';
import { BoundedThrottlerStorage } from './bounded-throttler-storage';

@Controller('new-route')
class NewRouteController {
  @Get()
  read(@Res() response: ExpressResponse) { response.sendStatus(204); }

  @Get('public')
  @SetMetadata(PUBLIC_ENDPOINT, true)
  publicRead(@Res() response: ExpressResponse) { response.sendStatus(204); }
}

describe('global API rate limiting over real HTTP', () => {
  let app: INestApplication;
  let url: string;
  let storage: BoundedThrottlerStorage;
  const eventLines: string[] = [];
  const readiness = { isReady: vi.fn(async () => true) };
  const oauth = { create: vi.fn(async () => undefined), consume: vi.fn(async () => null) };
  const session = { findValid: vi.fn(async () => null) };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ ignoreEnvFile: true, isGlobal: true, load: [() => ({
        runtime: { oauthPkceEncryptionKey: 'a1'.repeat(32), environment: 'development', frontendOrigin: 'http://localhost:4200',
          googleClientId: 'synthetic.apps.googleusercontent.com', googleCallbackUrl: 'http://localhost:4200/api/auth/google/callback' },
      })] }), AppModule],
      controllers: [NewRouteController],
    }).overrideProvider(PrismaService).useValue({})
      .overrideProvider(DatabaseReadinessService).useValue(readiness)
      .overrideProvider(OAuthTransactionStore).useValue(oauth)
      .overrideProvider(SessionStore).useValue(session)
      .overrideProvider(GOOGLE_OAUTH_CLIENT).useValue(new OAuth2Client({ clientId: 'synthetic.apps.googleusercontent.com' }))
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    setupOpenApi(app);
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
    storage = app.get(BoundedThrottlerStorage);
  });
  beforeEach(() => {
    eventLines.length = 0;
    vi.spyOn(app.get(SecurityEventWriter), 'write').mockImplementation((line) => { eventLines.push(line); return true; });
    storage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-13T10:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());
  afterAll(async () => { await app?.close(); });

  const request = (path: string, init?: RequestInit) => fetch(`${url}/api/${path}`, { redirect: 'manual', ...init });
  async function expect429(response: Response, retry: number) {
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe(String(retry));
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(await response.json()).toEqual({ statusCode: 429, code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' });
  }

  it('shares the burst budget across public, protected and newly added routes', async () => {
    for (let index = 0; index < 10; index++) expect((await request('new-route/public')).status).toBe(204);
    for (let index = 0; index < 10; index++) expect((await request('new-route')).status).toBe(401);
    await expect429(await request('health/ready'), 10);
    expect(readiness.isReady).not.toHaveBeenCalled();
    expect(eventLines.map((line) => JSON.parse(line))).toEqual([expect.objectContaining({
      event: 'rate_limit_rejected', reason: 'quota_exceeded', requestId: expect.stringMatching(/^[a-f0-9-]{36}$/),
    })]);
  });

  it('rejects before readiness and session database work, regardless of cookies and forged IP headers', async () => {
    for (let index = 0; index < 20; index++) expect((await request('health/ready')).status).toBe(200);
    expect(readiness.isReady).toHaveBeenCalledTimes(20);
    await expect429(await request('auth/session', { headers: {
      cookie: `daylo_session=${'a'.repeat(43)}`, 'x-forwarded-for': '203.0.113.5',
      'x-real-ip': '203.0.113.6', forwarded: 'for=203.0.113.7',
    } }), 10);
    expect(session.findValid).not.toHaveBeenCalled();
    expect(eventLines.join('')).not.toMatch(/203\.0\.113|127\.0\.0|daylo_session|forwarded/);
  });

  it('isolates real peer IPs while keeping their own quotas intact', async () => {
    for (let index = 0; index < 20; index++) await request('new-route/public');
    await expect429(await request('new-route/public'), 10);
    const status = await new Promise<number | undefined>((resolve, reject) => {
      const secondClient = httpRequest(`${url}/api/new-route/public`, { localAddress: '127.0.0.2' }, (response) => {
        response.resume();
        response.on('end', () => resolve(response.statusCode));
      });
      secondClient.on('error', reject);
      secondClient.end();
    });
    expect(status).toBe(204);
    await expect429(await request('new-route/public'), 10);
  });

  it('keeps Google-start and callback budgets separate and rejects before transaction/provider work', async () => {
    for (let index = 0; index < 5; index++) expect((await request('auth/google')).status).toBe(302);
    await expect429(await request('auth/google'), 60);
    expect(oauth.create).toHaveBeenCalledTimes(5);
    expect((await request('auth/google/callback')).status).toBe(401);
    expect(oauth.consume).not.toHaveBeenCalled();
  });

  it('limits callbacks independently and covers HEAD and case/trailing-slash variants', async () => {
    for (let index = 0; index < 10; index++) expect((await request('AUTH/GOOGLE/CALLBACK/')).status).toBe(401);
    await expect429(await request('auth/google/callback'), 60);
    expect((await request('auth/google', { method: 'HEAD' })).status).toBe(302);
  });

  it('uses a fixed safe HTML redirect with Retry-After and preserves cookies', async () => {
    for (let index = 0; index < 5; index++) await request('auth/google');
    const response = await request('auth/google', { headers: { accept: 'text/html' } });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('http://localhost:4200/login?error=rate-limit');
    expect(response.headers.get('retry-after')).toBe('60');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('covers Swagger, OpenAPI, OPTIONS and unknown routes with the same admission', async () => {
    expect((await request('docs')).status).toBe(200);
    expect((await request('openapi.json')).status).toBe(200);
    for (let index = 0; index < 18; index++) await request('missing', { method: 'OPTIONS' });
    await expect429(await request('openapi.json'), 10);
    await expect429(await request('docs/swagger-ui.css'), 10);
    await expect429(await request('missing'), 10);
    expect(eventLines.map((line) => JSON.parse(line))).toEqual(Array.from({ length: 3 }, () => expect.objectContaining({
      event: 'rate_limit_rejected', reason: 'quota_exceeded',
    })));
  });

  it('admits exactly twenty parallel requests and recovers without extending the wait', async () => {
    const responses = await Promise.all(Array.from({ length: 30 }, () => request('new-route/public')));
    expect(responses.filter((response) => response.status === 204)).toHaveLength(20);
    expect(responses.filter((response) => response.status === 429)).toHaveLength(10);
    vi.setSystemTime(Date.now() + 9000);
    await expect429(await request('new-route/public'), 1);
    vi.setSystemTime(Date.now() + 1000);
    expect((await request('new-route/public')).status).toBe(204);
  });

  it('applies the minute budget across burst windows and resets at its deadline', async () => {
    for (let window = 0; window < 6; window++) {
      vi.setSystemTime(new Date('2026-10-13T10:00:00Z').getTime() + window * 10_000);
      const responses = await Promise.all(Array.from({ length: 20 }, () => request('new-route/public')));
      expect(responses.every((response) => response.status === 204)).toBe(true);
    }
    vi.setSystemTime(new Date('2026-10-13T10:01:00Z'));
    expect((await request('new-route/public')).status).toBe(204);
  });
});

describe('bounded expiring counter behavior', () => {
  let storage: BoundedThrottlerStorage;
  beforeEach(() => { storage = new BoundedThrottlerStorage(); vi.useFakeTimers(); });
  afterEach(() => { storage.onModuleDestroy(); vi.useRealTimers(); });

  it('isolates keys and never resets a blocked live quota', async () => {
    for (let index = 0; index < 120; index++) expect((await storage.increment('client-a', 60_000, 120)).isBlocked).toBe(false);
    expect((await storage.increment('client-a', 60_000, 120)).isBlocked).toBe(true);
    expect((await storage.increment('client-b', 60_000, 120)).isBlocked).toBe(false);
    vi.advanceTimersByTime(59_000);
    expect((await storage.increment('client-a', 60_000, 120)).timeToBlockExpire).toBe(1);
    vi.advanceTimersByTime(1000);
    expect((await storage.increment('client-a', 60_000, 120)).totalHits).toBe(1);
  });

  it('fails closed at capacity and periodically releases expired unused keys', async () => {
    storage.onModuleInit();
    for (let index = 0; index < storage.capacity; index++) await storage.increment(createHash('sha256').update(String(index)).digest('hex'), 1000, 1);
    expect((await storage.increment('new-client', 1000, 1)).isBlocked).toBe(true);
    expect((await storage.increment(createHash('sha256').update('0').digest('hex'), 1000, 1)).isBlocked).toBe(true);
    vi.advanceTimersByTime(1000);
    expect((await storage.increment('new-client', 1000, 1)).isBlocked).toBe(false);
  });
});
