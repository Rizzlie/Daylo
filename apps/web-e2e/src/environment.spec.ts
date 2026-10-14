import { createHash } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { Pool } from 'pg';
import { isolatedDatabaseUrl } from './support/isolated-database';
import { waitForApiBudget } from './support/rate-limit-budget';

test('managed provider login creates a real session isolated from another browser', async ({ page, browser, request }) => {
  test.setTimeout(90_000);
  await waitForApiBudget(request);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/login');
  await page.getByRole('link', { name: 'Zaloguj się przez Google' }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic Google accounts' })).toBeVisible();
  const stateHash = createHash('sha256').update(new URL(page.url()).searchParams.get('state') as string).digest('hex');
  await page.getByRole('link', { name: 'owner', exact: true }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByText('Cześć, E2E owner', { exact: true })).toBeVisible();
  const pool = new Pool({ connectionString: isolatedDatabaseUrl() });
  try {
    const sessions = await pool.query(`SELECT token_hash FROM sessions s JOIN users u ON u.id=s.user_id
      WHERE u.google_subject='daylo-e2e-owner'`);
    expect(sessions.rowCount).toBeGreaterThan(0);
    expect(sessions.rows[0].token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect((await pool.query('SELECT id FROM oauth_transactions WHERE state_hash=$1', [stateHash])).rowCount).toBe(0);
  } finally { await pool.end(); }
  const anonymous = await browser.newContext();
  try {
    const other = await anonymous.newPage();
    await other.goto(`${process.env['DAYLO_E2E_BASE_URL']}/today`);
    await expect(other).toHaveURL(/\/login\?error=expired$/);
    expect((await anonymous.cookies()).some((cookie) => cookie.name === '__Host-daylo_session')).toBe(false);
  } finally { await anonymous.close(); }
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Wyloguj się', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});
