import { DAYLO_CONFIG } from '@daylo/web/core/configuration/data-access';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthSession, provideAuthentication } from '@daylo/web/core/auth/data-access';
import { Today } from './today';
import { MatDialog } from '@angular/material/dialog';
import { PersonalTaskApi, PersonalTaskList } from '@daylo/web/tasks/data-access';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

beforeEach(() =>
  TestBed.configureTestingModule({
    providers: [
      {
        provide: DAYLO_CONFIG,
        useValue: { timeZone: 'Europe/Warsaw' },
      },
    ],
  }),
);

describe('Today page', () => {
  it('renders its heading and reactive identity without session-status or route-data dependencies', async () => {
    const user = signal({ displayName: 'Synthetic User' });
    TestBed.configureTestingModule({
      imports: [Today],
      providers: [{ provide: AuthSession, useValue: { user } }],
    });
    TestBed.overrideComponent(Today, {
      set: {
        providers: [
          {
            provide: PersonalTaskList,
            useValue: {
              loading: signal(false),
              error: signal(''),
              tasks: signal([]),
              cursor: signal(undefined),
              nextCursor: signal(null),
            },
          },
        ],
      },
    });
    const fixture = TestBed.createComponent(Today);
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    expect(page.querySelector('[role="status"]')).toBeNull();
    expect(page.querySelector('h1')?.textContent).toBe('Dzisiaj');
    expect(page.querySelector('.greeting')?.textContent).toBe('Cześć, Synthetic User');
    user.set({ displayName: 'Updated Synthetic User' });
    await fixture.whenStable();
    expect(page.querySelector('.greeting')?.textContent).toBe('Cześć, Updated Synthetic User');
  });
});

it('keeps the task unchanged on failed completion and exposes a recoverable error', async () => {
  const task = {
    id: 'task',
    title: 'Private task',
    description: '',
    scheduledDate: '2030-01-15',
    scheduledTime: '',
    completed: false,
    version: 1,
  };
  const api = { complete: vi.fn().mockRejectedValue(new Error('Network failure')) };
  const list = {
    loading: signal(false),
    error: signal(''),
    tasks: signal([task]),
    cursor: signal(undefined),
    nextCursor: signal(null),
    refresh: vi.fn(),
  };
  TestBed.configureTestingModule({
    imports: [Today],
    providers: [
      { provide: AuthSession, useValue: { user: signal({ displayName: 'Synthetic' }) } },
      { provide: PersonalTaskApi, useValue: api },
    ],
  });
  TestBed.overrideComponent(Today, {
    set: { providers: [{ provide: PersonalTaskList, useValue: list }] },
  });
  const fixture = TestBed.createComponent(Today);
  await fixture.whenStable();
  const root: HTMLElement = fixture.nativeElement;
  const complete = [...root.querySelectorAll('button')].find(
    (button) => button.textContent?.trim() === 'Ukończ',
  ) as HTMLButtonElement;
  complete.click();
  await fixture.whenStable();
  expect(list.tasks()[0].completed).toBe(false);
  expect(root.querySelector('[role="alert"]')?.textContent).toContain('Spróbuj ponownie');
  expect(complete.disabled).toBe(false);
});

it('closes its own open editor when the page is destroyed', async () => {
  TestBed.configureTestingModule({
    imports: [Today],
    providers: [
      { provide: AuthSession, useValue: { user: signal({ displayName: 'Synthetic' }) } },
      { provide: PersonalTaskApi, useValue: {} },
    ],
  });
  TestBed.overrideComponent(Today, {
    set: {
      providers: [
        {
          provide: PersonalTaskList,
          useValue: {
            loading: signal(false),
            error: signal(''),
            tasks: signal([]),
            cursor: signal(undefined),
            nextCursor: signal(null),
          },
        },
      ],
    },
  });
  const fixture = TestBed.createComponent(Today);
  await fixture.whenStable();
  const root: HTMLElement = fixture.nativeElement;
  (
    [...root.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Dodaj zadanie',
    ) as HTMLButtonElement
  ).click();
  await fixture.whenStable();
  const dialogs = TestBed.inject(MatDialog);
  expect(dialogs.openDialogs).toHaveLength(1);
  fixture.destroy();
  await vi.waitFor(() => expect(dialogs.openDialogs).toHaveLength(0));
});

it.each([false, true])(
  'retains keyboard focus throughout a completion toggle from completed=%s',
  async (completed) => {
    TestBed.configureTestingModule({
      imports: [Today],
      providers: [
        provideAuthentication(),
        provideHttpClientTesting(),
        { provide: AuthSession, useValue: { user: signal({ displayName: 'Synthetic' }) } },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(Today);
    const root: HTMLElement = fixture.nativeElement;
    document.body.append(root);
    const task = {
      id: 'task',
      title: 'Focus regression',
      description: null,
      scheduledDate: '2030-01-15',
      scheduledTime: null,
      completedAt: completed ? '2030-01-15T10:00:00Z' : null,
      version: 1,
    };
    try {
      await vi.waitFor(() =>
        http.expectOne('/api/tasks/personal?limit=50').flush({ items: [task], nextCursor: null }),
      );
      await fixture.whenStable();
      const button = root.querySelector('.task-actions button') as HTMLButtonElement;
      button.focus();
      button.click();
      fixture.detectChanges();
      expect(document.activeElement).toBe(button);
      expect(button.getAttribute('aria-disabled')).toBe('true');
      button.click();
      const changed = {
        ...task,
        completedAt: completed ? null : '2030-01-15T10:00:00Z',
        version: 2,
      };
      http
        .expectOne(`/api/tasks/personal/task/${completed ? 'reopen' : 'complete'}`)
        .flush(changed);
      const refresh = await vi.waitFor(() => http.expectOne('/api/tasks/personal?limit=50'));
      fixture.detectChanges();
      expect(root.querySelector('.task-actions button')).toBe(button);
      expect(document.activeElement).toBe(button);
      button.click();
      http.expectNone(`/api/tasks/personal/task/${completed ? 'reopen' : 'complete'}`);
      refresh.flush({ items: [changed], nextCursor: null });
      await fixture.whenStable();
      expect(root.querySelector('.task-actions button')).toBe(button);
      expect(document.activeElement).toBe(button);
      expect(button.textContent?.trim()).toBe(completed ? 'Ukończ' : 'Otwórz ponownie');
      expect(button.getAttribute('aria-disabled')).not.toBe('true');
      http.verify();
    } finally {
      fixture.destroy();
      root.remove();
    }
  },
);
