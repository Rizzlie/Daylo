import { test, expect, type Account, type AuthActor } from './support/authentication.fixture';
import { Pool } from 'pg';
import { isolatedDatabaseUrl } from './support/isolated-database';
import { waitForApiBudget } from './support/rate-limit-budget';

for (const account of ['owner', 'member', 'invited'] satisfies Account[]) {
  test(`${account} OAuth session persists on reload and signs out through real CSRF`, async ({
    actors,
    request,
  }) => {
    const actor = await actors.login(account);
    const { page } = actor;
    const pending = account === 'invited';
    await expect(page.getByText(`Cześć, E2E ${account}`, { exact: true })).toBeVisible();
    expect(await actor.sessionCount()).toBe(1);
    await page.reload();
    await expect(
      page.getByRole('heading', { name: pending ? 'Zaproszenia' : 'Dzisiaj', exact: true }),
    ).toBeVisible();
    const identity = await actor.session();
    expect(identity.status).toBe(200);
    expect(identity.body).toMatchObject({
      status: pending ? 'pending' : 'active',
      user: { email: `${account}@example.test` },
    });
    await page.goto('/today');
    await expect(page).toHaveURL(pending ? /\/invitations$/ : /\/today$/);
    expect(
      await page.evaluate(() => ({
        local: localStorage.length,
        session: sessionStorage.length,
        cookieNames: document.cookie
          .split(';')
          .map((cookie) => cookie.trim().split('=')[0])
          .filter(Boolean),
      })),
    ).toEqual({ local: 0, session: 0, cookieNames: ['daylo_xsrf'] });
    await waitForApiBudget(request);
    const signOut = page.waitForResponse((response) =>
      response.url().endsWith('/api/auth/sign-out'),
    );
    await page.getByRole('button', { name: /^Konto:/ }).click();
    await page.getByRole('menuitem', { name: 'Wyloguj się', exact: true }).click();
    expect((await signOut).status()).toBe(204);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(await actor.sessionCount()).toBe(0);
    expect((await actor.session()).status).toBe(401);
    await waitForApiBudget(request);
    await page.goto('/today');
    await expect(page).toHaveURL(/\/login\?error=expired$/);
  });
}

test('outsider OAuth admission is denied without issuing a session', async ({ actors }) => {
  const actor = await actors.login('outsider');
  await expect(actor.page.getByRole('alert')).toHaveText('Nie masz dostępu do Daylo.');
  expect(
    (await actor.context.cookies()).some((cookie) => cookie.name === '__Host-daylo_session'),
  ).toBe(false);
  expect((await actor.session()).status).toBe(401);
  await actor.page.reload();
  await expect(actor.page).toHaveURL(/\/login\?error=denied$/);
  await expect(actor.page.getByRole('link', { name: 'Zaloguj się przez Google' })).toBeVisible();
});

test('sign-out revokes only its session while a second login of the same account remains active', async ({
  actors,
}) => {
  const first = await actors.login('owner');
  const second = await actors.login('owner');
  expect(await first.sessionCount()).toBe(1);
  expect(await second.sessionCount()).toBe(1);
  await first.page.getByRole('button', { name: /^Konto:/ }).click();
  await first.page.getByRole('menuitem', { name: 'Wyloguj się', exact: true }).click();
  await expect(first.page).toHaveURL(/\/login$/);
  expect(await first.sessionCount()).toBe(0);
  expect(await second.sessionCount()).toBe(1);
  await second.page.reload();
  await expect(second.page.getByText('Cześć, E2E owner', { exact: true })).toBeVisible();
});

const reload = (actor: AuthActor) => actor.page.reload();
const foreground = async (actor: AuthActor) => {
  const checked = actor.page.waitForResponse((response) =>
    response.url().endsWith('/api/auth/session'),
  );
  await actor.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  expect((await checked).status()).toBe(401);
};
for (const { detection, kind, revalidate } of [
  { detection: 'reload', kind: 'sliding', revalidate: reload },
  { detection: 'foreground', kind: 'sliding', revalidate: foreground },
  { detection: 'absolute', kind: 'absolute', revalidate: reload },
] as const) {
  test(`OAuth session expiry through ${detection} recovers without expiring another actor`, async ({
    actors,
    browserClock,
  }) => {
    const actor = await actors.login('member');
    const other = await actors.login('owner');
    await browserClock.install(actor.page);
    await browserClock.advance(actor.page, 8 * 24 * 60 * 60 * 1000);
    // Browser time cannot expire a backend-owned session.
    expect((await actor.session()).status).toBe(200);
    await actor.expire(kind);
    await revalidate(actor);
    await expect(actor.page).toHaveURL(/\/login\?error=expired$/);
    expect(
      (await actor.context.cookies()).filter((cookie) =>
        ['daylo_xsrf', '__Host-daylo_session'].includes(cookie.name),
      ),
    ).toEqual([]);
    await expect(actor.page.getByRole('alert')).toHaveText('Sesja wygasła. Zaloguj się ponownie.');
    await actor.page.reload();
    await expect(actor.page.getByRole('alert')).toHaveText('Sesja wygasła. Zaloguj się ponownie.');
    await other.page.reload();
    await expect(other.page.getByText('Cześć, E2E owner', { exact: true })).toBeVisible();
  });
}

/* eslint-disable playwright/no-conditional-in-test, playwright/no-conditional-expect -- The fixed viewport matrix deliberately checks each layout's distinct contract. */
test(
  'responsive navigation preserves the desktop choice across reload and mobile transitions',
  { tag: '@shell' },
  async ({ actors, request }, testInfo) => {
    const { page } = await actors.login('owner');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const sidebar = page.getByRole('complementary', { name: 'Panel nawigacji' });
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme });
      for (const width of [360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        const mobile = width < 768;
        const navigation = page.getByRole('navigation', {
          name: mobile ? 'Nawigacja mobilna' : 'Nawigacja główna',
          exact: true,
        });
        await expect(navigation).toBeVisible();
        await expect(page.locator('.greeting')).toHaveCSS('font-size', mobile ? '28px' : '40px');
        await expect(
          navigation.getByRole('link', { name: 'Dzisiaj', exact: true }),
        ).toHaveAttribute('aria-current', 'page');
        await expect(
          page.getByRole(mobile ? 'button' : 'link', { name: 'Grupy — Wkrótce', exact: true }),
        ).toBeDisabled();
        await expect(
          page.getByRole(mobile ? 'button' : 'link', { name: 'Ustawienia — Wkrótce', exact: true }),
        ).toBeDisabled();
        const account = page.getByRole('button', { name: 'Konto: E2E owner', exact: true });
        await expect(account).toBeVisible();
        for (const control of [
          account,
          navigation.getByRole('link', { name: 'Dzisiaj', exact: true }),
        ]) {
          const box = await control.boundingBox();
          expect(box?.width).toBeGreaterThanOrEqual(44);
          expect(box?.height).toBeGreaterThanOrEqual(44);
        }
        if (mobile) {
          await expect(sidebar).toBeHidden();
          const main = page.getByRole('main');
          const clearance = await main.evaluate((element) =>
            Number.parseFloat(getComputedStyle(element).paddingBottom),
          );
          const navHeight = (await navigation.boundingBox())?.height ?? 0;
          expect(clearance).toBeGreaterThanOrEqual(navHeight + 16);
        } else {
          await expect(sidebar).toHaveCSS('width', '256px');
          await page.getByRole('button', { name: 'Zwiń nawigację', exact: true }).click();
          await expect(sidebar).toHaveCSS('width', '80px');
          await waitForApiBudget(request);
          await page.reload();
          await expect(
            page.getByRole('button', { name: 'Rozwiń nawigację', exact: true }),
          ).toHaveAttribute('aria-expanded', 'false');
          await expect(sidebar).toHaveCSS('width', '80px');
          await expect(page.locator('mat-sidenav-content')).toHaveCSS('margin-left', '80px');
          const todayLink = navigation.getByRole('link', { name: 'Dzisiaj', exact: true });
          await page.getByRole('button', { name: 'Rozwiń nawigację', exact: true }).focus();
          await page.keyboard.press('Tab');
          await expect(todayLink).toBeFocused();
          // Material hides the visual tooltip from ARIA; the link has its own accessible name.
          await expect(
            page.locator('mat-tooltip-component').getByText('Dzisiaj', { exact: true }),
          ).toBeVisible();
          await page.keyboard.press('Escape');
          await page.setViewportSize({ width: 390, height: 844 });
          await expect(
            page.getByRole('navigation', { name: 'Nawigacja mobilna', exact: true }),
          ).toBeVisible();
          await page.setViewportSize({ width, height: 900 });
          await expect(sidebar).toHaveCSS('width', '80px');
          await page.getByRole('button', { name: 'Rozwiń nawigację', exact: true }).click();
          await expect(sidebar).toHaveCSS('width', '256px');
          await expect(page.locator('mat-sidenav-content')).toHaveCSS('margin-left', '256px');
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await page.screenshot({
          path: testInfo.outputPath('shell-' + colorScheme + '-' + width + '.png'),
        });
      }
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(sidebar).toHaveCSS('transition-duration', '0s');
    expect(errors).toEqual([]);
  },
);
/* eslint-enable playwright/no-conditional-in-test, playwright/no-conditional-expect */

test(
  'keyboard navigation, account menu and short-height access remain usable',
  { tag: '@shell' },
  async ({ actors }) => {
    const { page } = await actors.login('member');
    await page.setViewportSize({ width: 1024, height: 300 });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Dzisiaj', exact: true })).toBeVisible();
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Przejdź do treści' });
    await expect(skip).toBeFocused();
    await expect(skip).toHaveCSS('outline-style', 'solid');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
    const account = page.getByRole('button', { name: 'Konto: E2E member', exact: true });
    await account.focus();
    await expect(account).toHaveCSS('outline-style', 'solid');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menuitem', { name: 'Wyloguj się', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(account).toBeFocused();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      document.body.style.zoom = '2';
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await account.click();
    await expect(page.getByRole('menuitem', { name: 'Wyloguj się', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.evaluate(() => {
      document.body.style.zoom = '';
    });
  },
);

test(
  'long real profile names wrap without overflow and retain accessible account actions',
  { tag: '@shell' },
  async ({ actors }) => {
    const actor = await actors.login('member');
    const identity = (await actor.session()).body as { user: { id: string; displayName: string } };
    const pool = new Pool({ connectionString: isolatedDatabaseUrl() });
    const longName = 'Aleksandra Maria Katarzyna BardzoDługieNazwiskoBezSpacji'.repeat(3);
    try {
      expect(
        (
          await pool.query('UPDATE users SET display_name=$1 WHERE id=$2', [
            longName,
            identity.user.id,
          ])
        ).rowCount,
      ).toBe(1);
      await actor.page.reload();
      await expect(actor.page.getByText('Cześć, ' + longName, { exact: true })).toBeVisible();
      for (const width of [360, 768, 1440]) {
        await actor.page.setViewportSize({ width, height: 900 });
        const account = actor.page.getByRole('button', { name: 'Konto: ' + longName, exact: true });
        await expect(account).toBeVisible();
        expect(
          await actor.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        ).toBe(true);
        await account.click();
        await expect(
          actor.page.getByRole('menuitem', { name: 'Wyloguj się', exact: true }),
        ).toBeVisible();
        await actor.page.keyboard.press('Escape');
      }
    } finally {
      try {
        await pool.query('UPDATE users SET display_name=$1 WHERE id=$2', [
          identity.user.displayName,
          identity.user.id,
        ]);
      } finally {
        await pool.end();
      }
    }
  },
);
