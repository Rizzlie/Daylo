import { test, expect } from '@playwright/test';

test('opens the Daylo preparation shell', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('Daylo');
  await expect(page.getByRole('heading', { name: 'Daylo', level: 1, exact: true })).toBeVisible();
  await expect(page.getByText('Twój planer zadań jest w przygotowaniu.', { exact: true })).toBeVisible();
});
