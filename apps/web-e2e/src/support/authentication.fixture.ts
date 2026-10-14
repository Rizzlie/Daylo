/* eslint playwright/no-standalone-expect: "off" -- Assertions in reusable fixture operations run inside the consuming test. */
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { Pool } from 'pg';
import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';
import { isolatedDatabaseUrl } from './isolated-database';
import { waitForApiBudget } from './rate-limit-budget';

export type Account = 'owner' | 'member' | 'invited' | 'outsider';
export interface AuthActor {
  page: Page;
  context: BrowserContext;
  session(): Promise<{ status: number; body: unknown }>;
  sessionCount(): Promise<number>;
  expire(kind?: 'sliding' | 'absolute'): Promise<void>;
}
type Fixtures = {
  actors: { login(account: Account): Promise<AuthActor> };
  browserClock: {
    install(page: Page): Promise<void>;
    advance(page: Page, milliseconds: number): Promise<void>;
  };
};

export const test = base.extend<Fixtures>({
  actors: async ({ browser, request }, use, testInfo) => {
    testInfo.setTimeout(180_000);
    const pool = new Pool({ connectionString: isolatedDatabaseUrl() });
    const owned: { context: BrowserContext; hash?: string }[] = [];
    try {
      await waitForApiBudget(request);
      await use({
        login: async (account) => {
          // Preserve the project's mobile/device options for every additional actor.
          const context = await browser.newContext({ ...testInfo.project.use, storageState: undefined });
          const resource: (typeof owned)[number] = { context };
          owned.push(resource);
          const page = await context.newPage();
          // Retry only quota rejection. Each successful start is followed once;
          // real per-IP Google limits stay enabled across the complete suite.
          const deadline = Date.now() + 75_000;
          while (true) {
            await waitForApiBudget(request);
            await page.goto('/login');
            const started = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/auth/google');
            await page.getByRole('link', { name: 'Zaloguj się przez Google' }).click();
            const response = await started;
            const quotaRedirect = response.headers()['location']?.endsWith('/login?error=rate-limit');
            if (response.status() !== 429 && !quotaRedirect) {
              expect(response.status()).toBe(302);
              break;
            }
            if (Date.now() >= deadline) throw new Error('Google-start quota did not recover within 75 seconds');
            const retrySeconds = Number(response.headers()['retry-after']);
            const remaining = deadline - Date.now();
            await delay(Math.min(remaining, Number.isFinite(retrySeconds) ? Math.max(1, retrySeconds) * 1000 : 1000, 60_000));
          }
          await expect(page.getByRole('heading', { name: 'Synthetic Google accounts' })).toBeVisible();
          const state = new URL(page.url()).searchParams.get('state');
          if (!state) throw new Error('The OAuth provider navigation must contain state');
          const stateHash = createHash('sha256').update(state).digest('hex');
          await page.getByRole('link', { name: account, exact: true }).click();
          await expect(page).toHaveURL(account === 'outsider' ? /\/login\?error=denied$/
            : account === 'invited' ? /\/invitations$/ : /\/today$/);
          const cookie = (await context.cookies()).find((value) => value.name === '__Host-daylo_session');
          resource.hash = cookie ? createHash('sha256').update(cookie.value).digest('hex') : undefined;
          expect(Boolean(cookie)).toBe(account !== 'outsider');
          if (cookie) expect({ secure: cookie.secure, httpOnly: cookie.httpOnly, sameSite: cookie.sameSite, path: cookie.path })
            .toEqual({ secure: true, httpOnly: true, sameSite: 'Lax', path: '/' });
          expect((await pool.query('SELECT id FROM oauth_transactions WHERE state_hash=$1', [stateHash])).rowCount).toBe(0);
          const sessionCount = async () => (await pool.query('SELECT id FROM sessions WHERE token_hash=$1', [resource.hash ?? ''])).rowCount ?? 0;
          return {
            page, context, sessionCount,
            // Chromium treats loopback as trustworthy for Secure cookies;
            // APIRequestContext does not share that browser transport behavior.
            session: () => page.evaluate(async () => {
              const response = await fetch('/api/auth/session');
              return { status: response.status, body: await response.json() };
            }),
            expire: async (kind = 'sliding') => {
              if (!resource.hash) throw new Error('Only a session owned by this actor can be expired');
              const query = kind === 'absolute'
                ? "UPDATE sessions SET created_at=now()-interval '30 days', expires_at=now()+interval '7 days' WHERE token_hash=$1"
                : "UPDATE sessions SET expires_at=now()-interval '1 second' WHERE token_hash=$1";
              expect((await pool.query(query, [resource.hash])).rowCount).toBe(1);
            },
          };
        },
      });
    } finally {
      try {
        const results = await Promise.allSettled(owned.map(async (resource) => {
          try { await resource.context.close(); }
          finally {
            // Exact session ownership: never delete another context's session.
            if (resource.hash) await pool.query('DELETE FROM sessions WHERE token_hash=$1', [resource.hash]);
          }
        }));
        await Promise.all(results.map((result) => result.status === 'rejected' ? Promise.reject(result.reason) : Promise.resolve()));
      } finally { await pool.end(); }
    }
  },
  browserClock: async ({ browserName }, use) => {
    if (browserName !== 'chromium') throw new Error('The managed acceptance suite requires Chromium');
    await use({
      install: (page) => page.clock.install({ time: new Date('2030-01-15T12:00:00Z') }),
      advance: (page, milliseconds) => page.clock.fastForward(milliseconds),
    });
  },
});

export { expect } from '@playwright/test';
