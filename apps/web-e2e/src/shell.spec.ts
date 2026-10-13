import { test, expect } from '@playwright/test';

test('opens the Daylo login screen with a durable expiry error', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/login?error=expired');

  await expect(page).toHaveTitle('Daylo');
  await expect(page.getByRole('heading', { name: 'Daylo', level: 1, exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText('Sesja wygasła. Zaloguj się ponownie.');
  await expect(page.getByRole('link', { name: 'Zaloguj się przez Google' })).toHaveAttribute('href', '/api/auth/google');
  await page.reload();
  await expect(page.getByRole('alert')).toHaveText('Sesja wygasła. Zaloguj się ponownie.');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Zaloguj się przez Google' })).toBeFocused();
  await expect(page.getByRole('link', { name: 'Zaloguj się przez Google' })).toHaveCSS('outline-style', 'solid');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await page.screenshot({ path: testInfo.outputPath(`login-${colorScheme}.png`) });
  }
});
