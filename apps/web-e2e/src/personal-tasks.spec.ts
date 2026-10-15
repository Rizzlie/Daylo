import type { Page } from '@playwright/test';
import { test, expect } from './support/authentication.fixture';
import { waitForApiBudget } from './support/rate-limit-budget';

interface TaskBody {
  id: string;
  version: number;
  title: string;
  description: string | null;
  scheduledTime: string | null;
  completedAt: string | null;
  completedById: string | null;
  code?: string;
  items?: { id: string }[];
}

async function csrf(page: Page): Promise<string> {
  return page.evaluate(async () => (await (await fetch('/api/auth/csrf')).json()).csrfToken);
}

async function taskRequest(page: Page, method: string, path = '', body?: object, proof?: string) {
  // Use Chromium for real Secure cookies on loopback, matching the auth fixture.
  return page.evaluate(
    async ({ method, path, body, proof }) => {
      const response = await fetch(`/api/tasks/personal${path}`, {
        method,
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(proof ? { 'X-CSRF-Token': proof } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return {
        status: response.status,
        body: response.status === 204 ? null : ((await response.json()) as TaskBody),
      };
    },
    { method, path, body, proof },
  );
}

test('personal-task API persists the complete lifecycle through real browser sessions', async ({
  actors,
  request,
}) => {
  const owner = await actors.login('owner');
  await waitForApiBudget(request);
  const proof = await csrf(owner.page);
  const created = await taskRequest(
    owner.page,
    'POST',
    '',
    { title: '  Browser private task  ', scheduledDate: '2020-02-29', scheduledTime: '09:30' },
    proof,
  );
  expect(created.status).toBe(201);
  expect(created.body).toMatchObject({
    title: 'Browser private task',
    version: 1,
    description: null,
    completedAt: null,
  });
  const id = created.body?.id;
  await owner.page.reload();
  await expect(owner.page.getByRole('heading', { name: 'Dzisiaj', exact: true })).toBeVisible();
  expect((await taskRequest(owner.page, 'GET', `/${id}`)).body).toEqual(created.body);
  const edited = await taskRequest(
    owner.page,
    'PATCH',
    `/${id}`,
    { version: 1, title: 'Updated browser task', scheduledTime: '' },
    proof,
  );
  expect(edited.status).toBe(200);
  expect(edited.body).toMatchObject({ version: 2, scheduledTime: null });
  const stale = await taskRequest(
    owner.page,
    'PATCH',
    `/${id}`,
    { version: 1, title: 'Stale browser task' },
    proof,
  );
  expect(stale.status).toBe(409);
  expect(stale.body?.code).toBe('VERSION_CONFLICT');
  const completed = await taskRequest(owner.page, 'POST', `/${id}/complete`, { version: 2 }, proof);
  expect(completed.status).toBe(200);
  expect(completed.body?.completedAt).toBeTruthy();
  expect(completed.body?.completedById).toBeTruthy();
  expect(
    (await taskRequest(owner.page, 'POST', `/${id}/complete`, { version: 3 }, proof)).body,
  ).toEqual(completed.body);
  const reopened = await taskRequest(owner.page, 'POST', `/${id}/reopen`, { version: 3 }, proof);
  expect(reopened.status).toBe(200);
  expect(reopened.body).toMatchObject({ version: 4, completedAt: null, completedById: null });
  expect(
    (await taskRequest(owner.page, 'DELETE', `/${id}?version=4`, undefined, proof)).status,
  ).toBe(204);
  expect((await taskRequest(owner.page, 'GET', `/${id}`)).status).toBe(404);
});

test('personal-task API enforces privacy, active access and CSRF on the real stack', async ({
  actors,
  request,
}) => {
  const owner = await actors.login('owner');
  const member = await actors.login('member');
  const invited = await actors.login('invited');
  await waitForApiBudget(request);
  const ownerProof = await csrf(owner.page);
  const memberProof = await csrf(member.page);
  const created = await taskRequest(owner.page, 'POST', '', { title: 'Owner private' }, ownerProof);
  expect(created.status).toBe(201);
  const id = created.body?.id;
  expect((await taskRequest(member.page, 'GET', `/${id}`)).status).toBe(404);
  expect(
    (
      await taskRequest(
        member.page,
        'PATCH',
        `/${id}`,
        { version: 1, title: 'Attempt' },
        memberProof,
      )
    ).status,
  ).toBe(404);
  const memberList = await taskRequest(member.page, 'GET');
  expect(memberList.status).toBe(200);
  expect(memberList.body?.items?.map((task) => task.id)).not.toContain(id);
  expect((await taskRequest(invited.page, 'GET')).status).toBe(403);
  expect((await request.get('/api/tasks/personal')).status()).toBe(401);
  expect(
    (await taskRequest(owner.page, 'PATCH', `/${id}`, { version: 1, title: 'Missing proof' }))
      .status,
  ).toBe(403);
  expect((await taskRequest(owner.page, 'GET', `/${id}`)).body).toEqual(created.body);
  expect(
    (await taskRequest(owner.page, 'DELETE', `/${id}?version=1`, undefined, ownerProof)).status,
  ).toBe(204);
  await waitForApiBudget(request);
  const memberTask = await taskRequest(
    member.page,
    'POST',
    '',
    { title: 'Member private' },
    memberProof,
  );
  expect(memberTask.status).toBe(201);
  expect((await taskRequest(owner.page, 'GET', `/${memberTask.body?.id}`)).status).toBe(404);
  expect(
    (
      await taskRequest(
        member.page,
        'DELETE',
        `/${memberTask.body?.id}?version=1`,
        undefined,
        memberProof,
      )
    ).status,
  ).toBe(204);
});
