import { provideHttpClient, withXsrfConfiguration } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApi } from '@daylo/web/shared/api-client';
import { PersonalTaskApi, PersonalTaskList } from './personal-tasks';

const row = {
  id: 'task-id',
  title: 'Task',
  description: null,
  scheduledDate: '2030-01-15',
  scheduledTime: null,
  completedAt: null,
  version: 3,
  createdById: 'private-id',
};

describe('Personal task data-access', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideApi(''),
        provideHttpClient(
          withXsrfConfiguration({ cookieName: 'daylo_xsrf', headerName: 'X-CSRF-Token' }),
        ),
        provideHttpClientTesting(),
        PersonalTaskList,
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    document.cookie = 'daylo_xsrf=; Path=/; Max-Age=0';
    http.verify();
  });

  it('maps presentation fields, sends the current version and uses native XSRF transport', async () => {
    const api = TestBed.inject(PersonalTaskApi);
    const result = api.read('task-id');
    http.expectOne('/api/tasks/personal/task-id').flush(row);
    const task = await result;
    expect(task).toEqual({
      id: 'task-id',
      title: 'Task',
      description: '',
      scheduledDate: '2030-01-15',
      scheduledTime: '',
      completed: false,
      version: 3,
    });
    document.cookie = 'daylo_xsrf=proof; Path=/';
    const saved = api.save(
      {
        title: '  Edited  ',
        description: '',
        scheduledDate: task.scheduledDate,
        scheduledTime: '',
      },
      task,
    );
    const edit = http.expectOne('/api/tasks/personal/task-id');
    expect(edit.request.method).toBe('PATCH');
    expect(edit.request.body).toEqual({
      title: 'Edited',
      description: '',
      scheduledDate: task.scheduledDate,
      scheduledTime: '',
      version: 3,
    });
    expect(edit.request.headers.get('X-CSRF-Token')).toBe('proof');
    edit.flush({ ...row, title: 'Edited', version: 4 });
    expect((await saved).version).toBe(4);
  });

  it('loads cursor pages, reports read failure and recovers on retry', async () => {
    const list = TestBed.inject(PersonalTaskList);
    await vi.waitFor(() =>
      http.expectOne('/api/tasks/personal?limit=50').flush({ items: [row], nextCursor: 'next-id' }),
    );
    expect(list.tasks()).toHaveLength(1);
    list.next();
    expect(list.tasks()).toEqual([]);
    await vi.waitFor(() =>
      http
        .expectOne('/api/tasks/personal?limit=50&after=next-id')
        .flush({}, { status: 503, statusText: 'Unavailable' }),
    );
    expect(list.error()).toContain('Spróbuj ponownie');
    list.refresh();
    await vi.waitFor(() =>
      http
        .expectOne('/api/tasks/personal?limit=50&after=next-id')
        .flush({ items: [], nextCursor: null }),
    );
    expect(list.error()).toBe('');
    expect(list.tasks()).toEqual([]);
  });

  it('retains displayed rows during same-page refresh and its failure, then applies fresh data', async () => {
    const list = TestBed.inject(PersonalTaskList);
    await vi.waitFor(() =>
      http.expectOne('/api/tasks/personal?limit=50').flush({ items: [row], nextCursor: null }),
    );
    const displayed = list.tasks();
    list.refresh();
    const failed = await vi.waitFor(() => http.expectOne('/api/tasks/personal?limit=50'));
    expect(list.loading()).toBe(true);
    expect(list.tasks()).toBe(displayed);
    failed.flush({}, { status: 503, statusText: 'Unavailable' });
    await vi.waitFor(() => expect(list.error()).not.toBe(''));
    expect(list.tasks()).toBe(displayed);
    list.refresh();
    const retry = await vi.waitFor(() => http.expectOne('/api/tasks/personal?limit=50'));
    expect(list.tasks()).toBe(displayed);
    retry.flush({
      items: [{ ...row, completedAt: '2030-01-15T10:00:00Z', version: 4 }],
      nextCursor: null,
    });
    await vi.waitFor(() => expect(list.tasks()[0].completed).toBe(true));
    expect(list.error()).toBe('');
  });

  it.each(['first', 'refresh'] as const)(
    '%s replaces an outstanding list read after a successful save',
    async (action) => {
      const list = TestBed.inject(PersonalTaskList);
      const api = TestBed.inject(PersonalTaskApi);
      const initial = await vi.waitFor(() => http.expectOne('/api/tasks/personal?limit=50'));
      const saved = api.save({
        title: 'Created during loading',
        description: '',
        scheduledDate: row.scheduledDate,
        scheduledTime: '',
      });
      http.expectOne('/api/tasks/personal').flush({ ...row, title: 'Created during loading' });
      const task = await saved;

      list[action]();

      const fresh = await vi.waitFor(() => http.expectOne('/api/tasks/personal?limit=50'));
      expect(initial.cancelled).toBe(true);
      fresh.flush({ items: [{ ...row, title: task.title }], nextCursor: null });
      await vi.waitFor(() => expect(list.tasks()).toEqual([task]));
      expect(list.loading()).toBe(false);
    },
  );
});
