import { test, expect, type Account, type AuthActor } from './support/authentication.fixture';

for (const account of ['owner', 'member', 'invited'] satisfies Account[]) {
  test(`${account} OAuth session persists on reload and signs out through real CSRF`, async ({ actors }) => {
    const actor = await actors.login(account);
    const { page } = actor;
    const pending = account === 'invited';
    await expect(page.getByText(`Cześć, E2E ${account}`, { exact: true })).toBeVisible();
    expect(await actor.sessionCount()).toBe(1);
    await page.reload();
    await expect(page.getByRole('heading', { name: pending ? 'Zaproszenia' : 'Dzisiaj', exact: true })).toBeVisible();
    const identity = await actor.session();
    expect(identity.status).toBe(200);
    expect(identity.body).toMatchObject({ status: pending ? 'pending' : 'active', user: { email: `${account}@example.test` } });
    await page.goto('/today');
    await expect(page).toHaveURL(pending ? /\/invitations$/ : /\/today$/);
    expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookie: document.cookie })))
      .toEqual({ local: 0, session: 0, cookie: '' });
    const signOut = page.waitForResponse((response) => response.url().endsWith('/api/auth/sign-out'));
    await page.getByRole('button', { name: 'Wyloguj się', exact: true }).click();
    expect((await signOut).status()).toBe(204);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(await actor.sessionCount()).toBe(0);
    expect((await actor.session()).status).toBe(401);
    await page.goto('/today');
    await expect(page).toHaveURL(/\/login\?error=expired$/);
  });
}

test('outsider OAuth admission is denied without issuing a session', async ({ actors }) => {
  const actor = await actors.login('outsider');
  await expect(actor.page.getByRole('alert')).toHaveText('Nie masz dostępu do Daylo.');
  expect((await actor.context.cookies()).some((cookie) => cookie.name === '__Host-daylo_session')).toBe(false);
  expect((await actor.session()).status).toBe(401);
  await actor.page.reload();
  await expect(actor.page).toHaveURL(/\/login\?error=denied$/);
  await expect(actor.page.getByRole('link', { name: 'Zaloguj się przez Google' })).toBeVisible();
});

test('sign-out revokes only its session while a second login of the same account remains active', async ({ actors }) => {
  const first = await actors.login('owner');
  const second = await actors.login('owner');
  expect(await first.sessionCount()).toBe(1);
  expect(await second.sessionCount()).toBe(1);
  await first.page.getByRole('button', { name: 'Wyloguj się', exact: true }).click();
  await expect(first.page).toHaveURL(/\/login$/);
  expect(await first.sessionCount()).toBe(0);
  expect(await second.sessionCount()).toBe(1);
  await second.page.reload();
  await expect(second.page.getByText('Cześć, E2E owner', { exact: true })).toBeVisible();
});

const reload = (actor: AuthActor) => actor.page.reload();
const foreground = async (actor: AuthActor) => {
  const checked = actor.page.waitForResponse((response) => response.url().endsWith('/api/auth/session'));
  await actor.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  expect((await checked).status()).toBe(401);
};
for (const { detection, kind, revalidate } of [
  { detection: 'reload', kind: 'sliding', revalidate: reload },
  { detection: 'foreground', kind: 'sliding', revalidate: foreground },
  { detection: 'absolute', kind: 'absolute', revalidate: reload },
] as const) {
  test(`OAuth session expiry through ${detection} recovers without expiring another actor`, async ({ actors, browserClock }) => {
    const actor = await actors.login('member');
    const other = await actors.login('owner');
    await browserClock.install(actor.page);
    await browserClock.advance(actor.page, 8 * 24 * 60 * 60 * 1000);
    // Browser time cannot expire a backend-owned session.
    expect((await actor.session()).status).toBe(200);
    await actor.expire(kind);
    await revalidate(actor);
    await expect(actor.page).toHaveURL(/\/login\?error=expired$/);
    await expect(actor.page.getByRole('alert')).toHaveText('Sesja wygasła. Zaloguj się ponownie.');
    await actor.page.reload();
    await expect(actor.page.getByRole('alert')).toHaveText('Sesja wygasła. Zaloguj się ponownie.');
    await other.page.reload();
    await expect(other.page.getByText('Cześć, E2E owner', { exact: true })).toBeVisible();
  });
}
