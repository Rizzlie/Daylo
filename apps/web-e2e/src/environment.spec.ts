import { test, expect } from './support/authentication.fixture';

test('managed provider login creates a real session isolated from an anonymous browser', async ({ actors, page, context }) => {
  const owner = await actors.login('owner');
  expect(await owner.sessionCount()).toBe(1);
  await expect(owner.page.getByText('Cześć, E2E owner', { exact: true })).toBeVisible();
  await page.goto('/today');
  await expect(page).toHaveURL(/\/login\?error=expired$/);
  expect((await context.cookies()).some((cookie) => cookie.name === '__Host-daylo_session')).toBe(false);
  await owner.page.reload();
  await expect(owner.page.getByText('Cześć, E2E owner', { exact: true })).toBeVisible();
  expect(await owner.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
