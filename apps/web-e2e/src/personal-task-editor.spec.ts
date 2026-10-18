import type { Page } from '@playwright/test';
import { waitForApiBudget } from './support/rate-limit-budget';
import { test, expect } from './support/authentication.fixture';

const expectedTimeZone = process.env['DAYLO_TIME_ZONE'] ?? 'Europe/Warsaw';

async function createFromEditor(page: Page, title: string) {
  await page.getByRole('button', { name: 'Dodaj zadanie', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Nowe zadanie' });
  await expect(dialog.getByLabel('Tytuł', { exact: true })).toBeFocused();
  await dialog.getByLabel('Tytuł', { exact: true }).fill(title);
  await dialog.getByLabel('Data', { exact: true }).fill('2030-01-15');
  await dialog.getByLabel('Godzina (opcjonalnie)', { exact: true }).fill('09:30');
  await dialog.getByLabel('Opis (opcjonalnie)', { exact: true }).fill('Synthetic private notes');
  await expect(dialog.getByLabel('Tytuł', { exact: true })).toHaveValue(title);
  await expect(dialog.getByLabel('Opis (opcjonalnie)', { exact: true })).toHaveValue(
    'Synthetic private notes',
  );
  await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click();
  await expect(dialog).toBeHidden();
  const row = page
    .getByRole('list', { name: 'Zadania osobiste', exact: true })
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  await expect(row).toBeVisible();
  return row;
}

test('personal-task UI validates and persists the complete lifecycle with private visibility', async ({
  actors,
  request,
}) => {
  const owner = await actors.login('owner');
  const member = await actors.login('member');
  await waitForApiBudget(request);
  const page = owner.page;
  const title = `UI lifecycle ${test.info().project.name}`;
  await page.getByRole('button', { name: 'Dodaj zadanie', exact: true }).click();
  const editor = page.getByRole('dialog');
  await expect(editor.getByLabel('Tytuł', { exact: true })).toBeFocused();
  await editor.getByRole('button', { name: 'Zapisz', exact: true }).click();
  await expect(editor.getByText('Wpisz tytuł zadania.', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(editor).toBeHidden();
  await expect(page.getByRole('button', { name: 'Dodaj zadanie', exact: true })).toBeFocused();
  let row = await createFromEditor(page, title);
  await page.reload();
  row = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  await expect(row).toContainText('Synthetic private notes');
  await member.page.getByRole('button', { name: 'Odśwież listę', exact: true }).click();
  await expect(member.page.getByRole('heading', { name: title, exact: true })).toHaveCount(0);
  await row.getByRole('button', { name: 'Edytuj', exact: true }).click();
  await editor.getByLabel('Godzina (opcjonalnie)', { exact: true }).fill('');
  await editor.getByLabel('Opis (opcjonalnie)', { exact: true }).fill('');
  await editor.getByRole('button', { name: 'Zapisz', exact: true }).click();
  await expect(editor).toBeHidden();
  await expect(row).toContainText('Bez godziny');
  await row.getByRole('button', { name: 'Ukończ', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(row.getByRole('button', { name: 'Otwórz ponownie', exact: true })).toBeEnabled();
  await expect(row.getByRole('button', { name: 'Otwórz ponownie', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(row.getByRole('button', { name: 'Ukończ', exact: true })).toBeEnabled();
  await expect(row.getByRole('button', { name: 'Ukończ', exact: true })).toBeFocused();
  await row.getByRole('button', { name: 'Usuń', exact: true }).click();
  await expect(editor.getByRole('button', { name: 'Anuluj', exact: true })).toBeFocused();
  await editor.getByRole('button', { name: 'Anuluj', exact: true }).click();
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Usuń', exact: true }).click();
  await editor.getByRole('button', { name: 'Usuń', exact: true }).click();
  await expect(editor).toBeHidden();
  await expect(row).toHaveCount(0);
});

test('personal-task UI keeps failed input and recovers a real concurrent version conflict', async ({
  actors,
  request,
}) => {
  const first = await actors.login('owner');
  const second = await actors.login('owner');
  await waitForApiBudget(request);
  const title = `UI recovery ${test.info().project.name}`;
  const row = await createFromEditor(first.page, title);
  await row.getByRole('button', { name: 'Edytuj', exact: true }).click();
  const editor = first.page.getByRole('dialog');
  await editor.getByLabel('Opis (opcjonalnie)', { exact: true }).fill('Retained draft');
  await first.context.setOffline(true);
  try {
    await editor.getByRole('button', { name: 'Zapisz', exact: true }).click();
    await expect(editor.getByRole('alert')).toContainText('Brak połączenia');
    await expect(editor.getByLabel('Opis (opcjonalnie)', { exact: true })).toHaveValue(
      'Retained draft',
    );
  } finally {
    await first.context.setOffline(false);
  }
  await second.page.reload();
  const otherRow = second.page
    .getByRole('listitem')
    .filter({ has: second.page.getByRole('heading', { name: title, exact: true }) });
  await otherRow.getByRole('button', { name: 'Edytuj', exact: true }).click();
  const otherEditor = second.page.getByRole('dialog');
  await otherEditor.getByLabel('Opis (opcjonalnie)', { exact: true }).fill('Other session change');
  await otherEditor.getByRole('button', { name: 'Zapisz', exact: true }).click();
  await expect(otherEditor).toBeHidden();
  await editor.getByRole('button', { name: 'Zapisz', exact: true }).click();
  await expect(editor.getByRole('alert')).toContainText('innej sesji');
  await expect(editor.getByRole('button', { name: 'Zapisz', exact: true })).toBeDisabled();
  await editor.getByRole('button', { name: 'Wczytaj aktualną wersję', exact: true }).click();
  await expect(editor.getByRole('region', { name: 'Aktualna wersja zadania' })).toContainText(
    'Other session change',
  );
  await expect(editor.getByLabel('Opis (opcjonalnie)', { exact: true })).toHaveValue(
    'Retained draft',
  );
  await editor.getByRole('button', { name: 'Zapisz', exact: true }).click();
  await expect(editor).toBeHidden();
  await expect(row).toContainText('Retained draft');
  await row.getByRole('button', { name: 'Usuń', exact: true }).click();
  await editor.getByRole('button', { name: 'Usuń', exact: true }).click();
  await expect(row).toHaveCount(0);
});

test('public time-zone configuration drives the editor and omitted API date', async ({
  actors,
  request,
}) => {
  const response = await request.get('/api/configuration');
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toBe('no-cache');
  const cached = await request.get('/api/configuration', {
    headers: { 'If-None-Match': response.headers()['etag'] },
  });
  expect(cached.status()).toBe(304);
  const timeZone = expectedTimeZone;
  expect(await response.json()).toEqual({ timeZone });
  const { page } = await actors.login('owner');
  await page.getByRole('button', { name: 'Dodaj zadanie', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(`Strefa czasowa: ${timeZone}`);
  const expectedDate = await page.evaluate(
    (timeZone) =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date()),
    timeZone,
  );
  await expect(dialog.getByLabel('Data', { exact: true })).toHaveValue(expectedDate);
  await dialog.getByRole('button', { name: 'Anuluj', exact: true }).click();
  const result = await page.evaluate(async () => {
    const proof = decodeURIComponent(
      document.cookie
        .split('; ')
        .find((cookie) => cookie.startsWith('daylo_xsrf='))
        ?.slice('daylo_xsrf='.length) ?? '',
    );
    const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': proof };
    const created = await fetch('/api/tasks/personal', {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: 'Configured date default' }),
    });
    const task = await created.json();
    const deleted = await fetch(`/api/tasks/personal/${task.id}?version=${task.version}`, {
      method: 'DELETE',
      headers,
    });
    return { created: created.status, deleted: deleted.status, date: task.scheduledDate };
  });
  expect(result).toEqual({ created: 201, deleted: 204, date: expectedDate });
});

test('loads configuration once before rendering and revalidates it after a page reload', async ({
  page,
  request,
}) => {
  await waitForApiBudget(request);
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/api/')) apiRequests.push(path);
  });
  await page.goto('/login');
  await expect(page.getByRole('link', { name: 'Zaloguj się przez Google' })).toBeVisible();
  expect(apiRequests[0]).toBe('/api/configuration');
  expect(apiRequests.filter((path) => path === '/api/configuration')).toHaveLength(1);
  await page.reload();
  await expect(page.getByRole('link', { name: 'Zaloguj się przez Google' })).toBeVisible();
  expect(apiRequests.filter((path) => path === '/api/configuration')).toHaveLength(2);
});

test('startup configuration failure shows a durable error and retries after real quota recovery', async ({
  page,
  request,
}) => {
  test.setTimeout(100_000);
  await waitForApiBudget(request);
  const responses = await Promise.all(
    Array.from({ length: 22 }, () => request.get('/api/health/ready')),
  );
  expect(responses.some((response) => response.status() === 429)).toBe(true);
  await page.goto('/login');
  await expect(page.getByRole('alert')).toContainText('Nie udało się wczytać konfiguracji Daylo');
  await expect(page.getByRole('link', { name: 'Zaloguj się przez Google' })).toHaveCount(0);
  const retry = page.getByRole('button', { name: 'Spróbuj ponownie', exact: true });
  await expect(retry).toBeVisible();
  await waitForApiBudget(request);
  await retry.click();
  await expect(page.getByRole('link', { name: 'Zaloguj się przez Google' })).toBeVisible();
});
