import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { test, expect, type APIRequestContext } from '@playwright/test';
import { syntheticSessionCookie } from './support/session-cookie';
import { isolatedDatabaseUrl } from './support/isolated-database';
import { waitForApiBudget } from './support/rate-limit-budget';

const databaseUrl = process.env['DAYLO_E2E_DATABASE_URL'];
const baseUrl = process.env['DAYLO_E2E_BASE_URL'] ?? '';
const enabled = Boolean(databaseUrl && baseUrl);
const message = 'Zbyt wiele żądań. Spróbuj ponownie za chwilę.';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

async function exhaustBurst(request: APIRequestContext) {
  const responses = await Promise.all(
    Array.from({ length: 21 }, () => request.get('/api/health/ready')),
  );
  const rejected = responses.find((response) => response.status() === 429);
  expect(rejected).toBeDefined();
  expect(rejected?.headers()['retry-after']).toMatch(/^\d+$/);
}

test.describe('real-stack API rate limiting', () => {
  // eslint-disable-next-line playwright/no-skipped-test -- The managed e2e-fullstack target provisions this suite's database and services.
  test.skip(!enabled, 'Requires the managed e2e-fullstack target');
  let pool: Pool;
  test.beforeAll(() => {
    isolatedDatabaseUrl();
    pool = new Pool({ connectionString: databaseUrl });
  });
  test.beforeEach(async ({ request }) => {
    test.setTimeout(100_000);
    await waitForApiBudget(request);
  });
  test.afterAll(async () => {
    await pool?.end();
  });

  test('Google navigation rejection shows a persistent notice without new OAuth rows', async ({
    page,
    request,
  }) => {
    const before = await pool.query('SELECT count(*)::int AS count FROM oauth_transactions');
    for (let attempt = 0; attempt < 6; attempt++) {
      const response = await request.get('/api/auth/google', { maxRedirects: 0 });
      expect([302, 429]).toContain(response.status());
    }
    const admitted = await pool.query('SELECT count(*)::int AS count FROM oauth_transactions');
    expect(admitted.rows[0].count - before.rows[0].count).toBeLessThanOrEqual(5);
    await page.goto('/api/auth/google');
    await expect(page).toHaveURL(/\/login\?error=rate-limit$/);
    await expect(page.getByRole('alert')).toHaveText(message);
    await page.reload();
    await expect(page.getByRole('alert')).toHaveText(message);
    const after = await pool.query('SELECT count(*)::int AS count FROM oauth_transactions');
    expect(after.rows[0].count).toBe(admitted.rows[0].count);
    await expect(page.getByRole('button', { name: 'Spróbuj ponownie' })).toBeVisible();
  });

  test('limited sign-out preserves the session and retries explicitly after recovery', async ({
    page,
    context,
    request,
  }) => {
    const id = randomUUID();
    const token = randomBytes(32).toString('base64url');
    const csrf = createHmac('sha256', token).update('daylo:session-csrf:v1').digest('base64url');
    try {
      await pool.query(
        "INSERT INTO users (id,google_subject,email,display_name,access_status,updated_at) VALUES ($1,$2,$3,$4,'active',now())",
        [id, `f06-rate-${id}`, `${id}@example.test`, 'Synthetic User'],
      );
      await pool.query(
        "INSERT INTO sessions (id,user_id,token_hash,csrf_token_hash,expires_at) VALUES ($1,$2,$3,$4,now()+interval '1 day')",
        [randomUUID(), id, hash(token), hash(csrf)],
      );
      await context.addCookies([syntheticSessionCookie(baseUrl, token)]);
      await page.goto('/today');
      await expect(page.getByText('Cześć, Synthetic User', { exact: true })).toBeVisible();
      const second = await context.newPage();
      await second.goto('/today');
      await expect(second.getByRole('heading', { name: 'Dzisiaj', exact: true })).toBeVisible();
      await second.close();
      await exhaustBurst(request);
      const rejection = page.waitForResponse((response) =>
        response.url().endsWith('/api/auth/sign-out'),
      );
      await page.getByRole('button', { name: /^Konto:/ }).click();
      await page.getByRole('menuitem', { name: 'Wyloguj się', exact: true }).click();
      expect((await rejection).status()).toBe(429);
      await expect(page).toHaveURL(/\/today$/);
      await expect(page.getByRole('alert')).toHaveText(message);
      const sessions = await pool.query('SELECT id FROM sessions WHERE user_id=$1', [id]);
      expect(sessions.rowCount).toBe(1);
      const cookies = await context.cookies();
      expect(
        cookies.some((cookie) => cookie.name === '__Host-daylo_session' && cookie.value === token),
      ).toBe(true);
      await waitForApiBudget(request);
      await page.getByRole('button', { name: /^Konto:/ }).click();
      await page.getByRole('menuitem', { name: 'Wyloguj się', exact: true }).click();
      await expect(page).toHaveURL(/\/login$/);
      const revoked = await pool.query('SELECT id FROM sessions WHERE user_id=$1', [id]);
      expect(revoked.rowCount).toBe(0);
    } finally {
      await pool.query('DELETE FROM sessions WHERE user_id=$1', [id]);
      await pool.query('DELETE FROM users WHERE id=$1', [id]);
    }
  });

  test('limited startup configuration recovers before checking the session', async ({
    page,
    request,
  }) => {
    await exhaustBurst(request);
    await page.goto('/today');
    await expect(page).toHaveURL(/\/today$/);
    await expect(page.getByRole('alert')).toContainText('Nie udało się wczytać konfiguracji Daylo');
    await waitForApiBudget(request);
    await page.getByRole('button', { name: 'Spróbuj ponownie' }).click();
    await expect(page).toHaveURL(/\/login\?error=expired$/);
    await expect(page.getByRole('alert')).toHaveText('Sesja wygasła. Zaloguj się ponownie.');
    await expect(page.getByRole('link', { name: 'Zaloguj się przez Google' })).toBeVisible();
  });
});
