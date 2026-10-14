import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { test, expect, type Page } from '@playwright/test';
import { syntheticSessionCookie } from './support/session-cookie';
import { isolatedDatabaseUrl } from './support/isolated-database';
import { waitForApiBudget } from './support/rate-limit-budget';

const databaseUrl = process.env['DAYLO_E2E_DATABASE_URL'];
const baseUrl = process.env['DAYLO_E2E_BASE_URL'] ?? '';
const enabled = Boolean(databaseUrl && baseUrl);
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const csrfHash = (token: string) => hash(createHmac('sha256', token).update('daylo:session-csrf:v1').digest('base64url'));

function requiredOAuthState(location: URL): string {
  const state = location.searchParams.get('state');
  if (!state) throw new Error('The OAuth redirect must contain state');
  return state;
}

// Retained session-focused checks run against the managed F07 environment.
// Successful provider login is covered by the environment smoke test.
test.describe('real-stack authentication screens', () => {
  // eslint-disable-next-line playwright/no-skipped-test -- Shell-only checks do not provision a database; e2e-fullstack owns real-stack startup.
  test.skip(!enabled, 'Requires the managed e2e-fullstack target');
  let pool: Pool;
  test.beforeEach(async ({ request }) => {
    test.setTimeout(90_000);
    await waitForApiBudget(request);
  });
  test.beforeAll(() => {
    isolatedDatabaseUrl();
    pool = new Pool({ connectionString: databaseUrl });
  });
  test.afterAll(async () => { await pool?.end(); });

  for (const { status, destination, heading } of [
    { status: 'active', destination: '/today', heading: 'Dzisiaj' },
    { status: 'pending', destination: '/invitations', heading: 'Zaproszenia' },
  ]) {
    test(`${status} session survives reload and signs out with real CSRF`, async ({ page, context }) => {
      const id = randomUUID();
      const token = randomBytes(32).toString('base64url');
      try {
        await pool.query('INSERT INTO users (id, google_subject, email, display_name, access_status, updated_at) VALUES ($1,$2,$3,$4,$5,now())',
          [id, `f06-ui-${id}`, `${id}@example.test`, 'Synthetic User', status]);
        await pool.query('INSERT INTO sessions (id,user_id,token_hash,csrf_token_hash,expires_at) VALUES ($1,$2,$3,$4,now()+interval \'1 day\')',
          [randomUUID(), id, hash(token), csrfHash(token)]);
        await context.addCookies([syntheticSessionCookie(baseUrl, token)]);
        await page.goto(destination);
        await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
        await page.reload();
        await expect(page.getByRole('button', { name: 'Wyloguj się', exact: true })).toBeVisible();
        await page.goto('/today');
        await expect(page).toHaveURL(new URL(destination, baseUrl).href);
        const stored = await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookie: document.cookie }));
        expect(stored).toEqual({ local: 0, session: 0, cookie: '' });
        const signOut = page.waitForResponse((response) => response.url().endsWith('/api/auth/sign-out'), { timeout: 5_000 });
        await page.getByRole('button', { name: 'Wyloguj się', exact: true }).click();
        expect((await signOut).status()).toBe(204);
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole('alert')).toHaveCount(0);
        await expect(page.getByRole('link', { name: 'Zaloguj się przez Google' })).toBeVisible();
        const sessions = await pool.query('SELECT id FROM sessions WHERE user_id=$1', [id]);
        expect(sessions.rowCount).toBe(0);
      } finally {
        await pool.query('DELETE FROM sessions WHERE user_id=$1', [id]);
        await pool.query('DELETE FROM users WHERE id=$1', [id]);
      }
    });
  }

  for (const { detection, revalidate } of [
    { detection: 'reload', revalidate: (page: Page) => page.reload() },
    {
      detection: 'foreground',
      revalidate: async (page: Page) => {
        const sessionCheck = page.waitForResponse((response) => response.url().endsWith('/api/auth/session'));
        await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
        expect((await sessionCheck).status()).toBe(401);
      },
    },
  ]) {
    test(`expiry on ${detection} redirects to login with an error that survives another reload`, async ({ page, context }) => {
      const id = randomUUID();
      const token = randomBytes(32).toString('base64url');
      try {
        await pool.query('INSERT INTO users (id,google_subject,email,display_name,access_status,updated_at) VALUES ($1,$2,$3,$4,\'active\',now())',
          [id, `f06-ui-${id}`, `${id}@example.test`, 'Synthetic User']);
        await pool.query('INSERT INTO sessions (id,user_id,token_hash,csrf_token_hash,expires_at) VALUES ($1,$2,$3,$4,now()+interval \'1 day\')',
          [randomUUID(), id, hash(token), csrfHash(token)]);
        await context.addCookies([syntheticSessionCookie(baseUrl, token)]);
        await page.goto('/today');
        await expect(page.getByRole('heading', { name: 'Dzisiaj', exact: true })).toBeVisible();
        await pool.query('UPDATE sessions SET expires_at=now()-interval \'1 second\' WHERE user_id=$1', [id]);
        await revalidate(page);
        await expect(page).toHaveURL(/\/login\?error=expired$/);
        await expect(page.getByRole('alert')).toHaveText('Sesja wygasła. Zaloguj się ponownie.');
        await page.reload();
        await expect(page.getByRole('alert')).toHaveText('Sesja wygasła. Zaloguj się ponownie.');
      } finally {
        await pool.query('DELETE FROM sessions WHERE user_id=$1', [id]);
        await pool.query('DELETE FROM users WHERE id=$1', [id]);
      }
    });
  }

  test('absolute expiry requires login even when the sliding deadline is still valid', async ({ page, context }) => {
    const id = randomUUID();
    const token = randomBytes(32).toString('base64url');
    try {
      await pool.query('INSERT INTO users (id,google_subject,email,display_name,access_status,updated_at) VALUES ($1,$2,$3,$4,\'active\',now())',
        [id, `f06-ui-${id}`, `${id}@example.test`, 'Synthetic User']);
      await pool.query('INSERT INTO sessions (id,user_id,token_hash,csrf_token_hash,expires_at) VALUES ($1,$2,$3,$4,now()+interval \'1 day\')',
        [randomUUID(), id, hash(token), csrfHash(token)]);
      await context.addCookies([syntheticSessionCookie(baseUrl, token)]);
      await page.goto('/today');
      await expect(page.getByText('Cześć, Synthetic User', { exact: true })).toBeVisible();
      await pool.query('UPDATE sessions SET created_at=now()-interval \'30 days\', expires_at=now()+interval \'7 days\' WHERE user_id=$1', [id]);
      await page.reload();
      await expect(page).toHaveURL(/\/login\?error=expired$/);
      await expect(page.getByRole('alert')).toHaveText('Sesja wygasła. Zaloguj się ponownie.');
    } finally {
      await pool.query('DELETE FROM sessions WHERE user_id=$1', [id]);
      await pool.query('DELETE FROM users WHERE id=$1', [id]);
    }
  });

  test('anonymous entry and invalid Google navigation use real API states', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.goto('/api/auth/google/callback?code=synthetic-invalid');
    await expect(page).toHaveURL(/\/login\?error=failed$/);
    await expect(page.getByRole('alert')).toHaveText('Nie udało się zalogować. Spróbuj ponownie.');
  });

  test('real PKCE start hides the verifier and a damaged transaction recovers to login', async ({ page, context }) => {
    // Observe the real API redirect without following it to the external Google UI.
    const response = await context.request.get(`${baseUrl}/api/auth/google`, { maxRedirects: 0 });
    expect(response.status()).toBe(302);
    const location = new URL(response.headers()['location']);
    expect(location.searchParams.get('code_challenge_method')).toBe('S256');
    expect(location.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(location.searchParams.has('code_verifier')).toBe(false);
    const state = requiredOAuthState(location);
    expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    try {
      const rows = await pool.query('SELECT encrypted_verifier FROM oauth_transactions WHERE state_hash=$1', [hash(state)]);
      expect(rows.rows[0].encrypted_verifier).toMatch(/^v1\./);
      await pool.query('UPDATE oauth_transactions SET encrypted_verifier=NULL WHERE state_hash=$1', [hash(state)]);
      await page.goto(`/api/auth/google/callback?state=${state}&code=synthetic-invalid`);
      await expect(page).toHaveURL(/\/login\?error=failed$/);
      await expect(page.getByRole('alert')).toHaveText('Nie udało się zalogować. Spróbuj ponownie.');
      await expect(page.getByRole('link', { name: 'Zaloguj się przez Google' })).toBeVisible();
      expect((await context.cookies()).some((cookie) => cookie.name === '__Host-daylo_session')).toBe(false);
      expect((await pool.query('SELECT id FROM oauth_transactions WHERE state_hash=$1', [hash(state)])).rowCount).toBe(0);
      expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
    } finally {
      await pool.query('DELETE FROM oauth_transactions WHERE state_hash=$1', [hash(state)]);
    }
  });
});
