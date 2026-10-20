import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApi } from '@daylo/web/shared/api-client';
import { TodayTasks } from './today-tasks';

const task = {
  id: 'one',
  title: 'Plan',
  description: null,
  scheduledDate: '2030-01-15',
  scheduledTime: null,
  completedAt: null,
  createdAt: '2030-01-01T00:00:00Z',
  version: 1,
  createdById: 'private-owner',
  completedById: null,
  groupId: null,
  updatedAt: '2030-01-01T00:00:00Z',
};
const feed = { date: '2030-01-15', timeZone: 'Pacific/Kiritimati', items: [task] };

describe('Today data-access', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApi(''), TodayTasks],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('uses server date/zone, maps explicit domain fields and groups the entire feed', async () => {
    const state = TestBed.inject(TodayTasks);
    expect(state.data()).toBeUndefined();
    await vi.waitFor(() =>
      http.expectOne('/api/tasks/today').flush({
        ...feed,
        items: Array.from({ length: 125 }, (_, id) => ({ ...task, id: String(id) })),
      }),
    );
    expect(state.data()?.counts).toEqual({ today: 125, overdue: 0, completed: 0 });
    expect(state.data()).toMatchObject({ date: feed.date, timeZone: feed.timeZone });
    expect(state.data()?.untimed[0]).not.toHaveProperty('createdById');
    expect(state.data()?.untimed[0].description).toBe('');
    expect(state.loading()).toBe(false);
  });

  it('retains a coherent snapshot on refresh failure and replaces it after successful retry', async () => {
    const state = TestBed.inject(TodayTasks);
    await vi.waitFor(() => http.expectOne('/api/tasks/today').flush(feed));
    expect(state.data()?.counts.today).toBe(1);
    state.refresh();
    await vi.waitFor(() =>
      http.expectOne('/api/tasks/today').flush({}, { status: 503, statusText: 'Unavailable' }),
    );
    expect(state.error()).not.toBe('');
    expect(state.data()?.counts.today).toBe(1);
    expect(state.data()?.date).toBe(feed.date);
    state.refresh();
    await vi.waitFor(() =>
      http.expectOne('/api/tasks/today').flush({ ...feed, date: '2030-01-16' }),
    );
    expect(state.data()?.counts).toEqual({ today: 0, overdue: 1, completed: 0 });
    expect(state.data()?.date).toBe('2030-01-16');
    expect(state.error()).toBe('');
  });

  it('supersedes an in-flight read when refreshed and exposes initial errors without fake empty data', async () => {
    const state = TestBed.inject(TodayTasks);
    let old: ReturnType<HttpTestingController['expectOne']>;
    await vi.waitFor(() => {
      old = http.expectOne('/api/tasks/today');
    });
    state.refresh();
    await vi.waitFor(() =>
      http.expectOne('/api/tasks/today').flush({}, { status: 401, statusText: 'Unauthorized' }),
    );
    expect(old?.cancelled).toBe(true);
    expect(state.data()).toBeUndefined();
    expect(state.error()).toContain('Sesja wygasła');
  });
});
