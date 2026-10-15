import { test, expect } from './support/authentication.fixture';
import { waitForApiBudget } from './support/rate-limit-budget';

test('Angular XSRF transport repairs cookies, stays stable across tabs and signs out without JSON proof', async ({
  actors,
  request,
}) => {
  const actor = await actors.login('owner');
  const { page, context } = actor;
  await waitForApiBudget(request);
  const csrfRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/auth/csrf') csrfRequests.push(request.method());
  });
  const initial = await context.cookies();
  const session = initial.find((cookie) => cookie.name === '__Host-daylo_session');
  const xsrf = initial.find((cookie) => cookie.name === 'daylo_xsrf');
  expect(session).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Lax', path: '/' });
  expect(xsrf).toMatchObject({ httpOnly: false, secure: true, sameSite: 'Lax', path: '/' });
  // Chromium adjusts each cookie's expiry for server clock skew separately.
  expect(xsrf?.expires).toBeCloseTo(session?.expires ?? 0, 0);
  expect(Boolean(xsrf?.value) && xsrf?.value !== session?.value).toBe(true);
  expect(
    await page.evaluate(() => document.cookie.split(';').map((part) => part.trim().split('=')[0])),
  ).toEqual(['daylo_xsrf']);

  await context.clearCookies({ name: 'daylo_xsrf' });
  expect(await page.evaluate(() => document.cookie)).toBe('');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Dzisiaj', exact: true })).toBeVisible();
  const repaired = (await context.cookies()).find((cookie) => cookie.name === 'daylo_xsrf');
  expect(repaired?.value === xsrf?.value).toBe(true);

  const otherTab = await context.newPage();
  await otherTab.goto('/today');
  await expect(otherTab.getByRole('heading', { name: 'Dzisiaj', exact: true })).toBeVisible();
  expect(
    (await context.cookies()).find((cookie) => cookie.name === 'daylo_xsrf')?.value === xsrf?.value,
  ).toBe(true);
  await otherTab.close();
  const submitted = page.waitForRequest(
    (request) => new URL(request.url()).pathname === '/api/auth/sign-out',
  );
  const signedOut = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/auth/sign-out',
  );
  await page.getByRole('button', { name: /^Konto:/ }).click();
  await page.getByRole('menuitem', { name: 'Wyloguj się', exact: true }).click();
  expect((await submitted).headers()['x-csrf-token'] === xsrf?.value).toBe(true);
  expect((await signedOut).status()).toBe(204);
  await expect(page).toHaveURL(/\/login$/);
  expect(csrfRequests).toEqual([]);
  expect(
    (await context.cookies()).filter((cookie) =>
      ['daylo_xsrf', '__Host-daylo_session'].includes(cookie.name),
    ),
  ).toEqual([]);
  expect(await actor.sessionCount()).toBe(0);
});
