import { groupTodayTasks, type TodayTask } from './web-tasks-domain';

const date = '2030-01-15';
function task(id: string, fields: Partial<TodayTask> = {}): TodayTask {
  return {
    id,
    title: id,
    description: '',
    scheduledDate: date,
    scheduledTime: null,
    completedAt: null,
    createdAt: '2030-01-01T00:00:00Z',
    version: 1,
    ...fields,
  };
}
const ids = (tasks: TodayTask[]) => tasks.map((task) => task.id);

describe('Today grouping', () => {
  it('orders timed/untimed tasks by time, creation and stable ID without mutating input', () => {
    const tasks = [
      task('b', { scheduledTime: '09:00' }),
      task('a', { scheduledTime: '09:00' }),
      task('early', { scheduledTime: '08:59', createdAt: '2030-01-14T00:00:00Z' }),
      task('older', { scheduledTime: '09:00', createdAt: '2029-12-31T23:59:59Z' }),
      task('u-b'),
      task('u-a'),
      task('u-old', { createdAt: '2029-12-31T23:59:59Z' }),
      task('future', { scheduledDate: '2030-01-16' }),
    ];
    const before = structuredClone(tasks);
    const result = groupTodayTasks(tasks, date, 'Europe/Warsaw');
    expect(ids(result.timed)).toEqual(['early', 'older', 'a', 'b']);
    expect(ids(result.untimed)).toEqual(['u-old', 'u-a', 'u-b']);
    expect(result.counts).toEqual({ today: 7, overdue: 0, completed: 0 });
    expect(tasks).toEqual(before);
  });

  it('keeps overdue dates, with timed tasks before untimed on each date', () => {
    const result = groupTodayTasks(
      [
        task('no-time', { scheduledDate: '2030-01-14' }),
        task('b', { scheduledDate: '2030-01-14', scheduledTime: '09:00' }),
        task('a', { scheduledDate: '2030-01-14', scheduledTime: '09:00' }),
        task('oldest', { scheduledDate: '2020-02-29' }),
        task('late', { scheduledDate: '2030-01-14', scheduledTime: '23:59' }),
      ],
      date,
      'Europe/Warsaw',
    );
    expect(ids(result.overdue)).toEqual(['oldest', 'a', 'b', 'late', 'no-time']);
    expect(result.overdue[0].scheduledDate).toBe('2020-02-29');
    expect(result.counts.overdue).toBe(5);
  });

  it('unites currently completed tasks due today or completed today exactly once', () => {
    const both = task('both', { completedAt: '2030-01-15T10:00:00Z' });
    const result = groupTodayTasks(
      [
        both,
        both,
        task('due-today', { completedAt: '2030-01-14T10:00:00Z' }),
        task('future', { scheduledDate: '2030-02-01', completedAt: '2030-01-15T11:00:00Z' }),
        task('past', { scheduledDate: '2020-02-29', completedAt: '2030-01-15T11:00:00Z' }),
        task('old-completion', {
          scheduledDate: '2030-01-14',
          completedAt: '2030-01-14T10:00:00Z',
        }),
      ],
      date,
      'Europe/Warsaw',
    );
    expect(ids(result.completed)).toEqual(['future', 'past', 'both', 'due-today']);
    expect(result.counts).toEqual({ today: 0, overdue: 0, completed: 4 });
  });

  it.each([
    ['Europe/Warsaw', '2030-01-14T23:00:00Z', true],
    ['Europe/Warsaw', '2030-01-14T22:59:59.999Z', false],
    ['Europe/Warsaw', '2030-01-15T22:59:59.999Z', true],
    ['Europe/Warsaw', '2030-01-15T23:00:00Z', false],
    ['Pacific/Kiritimati', '2030-01-14T10:00:00Z', true],
    ['Pacific/Kiritimati', '2030-01-14T09:59:59.999Z', false],
  ])('uses the server date and %s for completed instant %s', (zone, instant, included) => {
    const result = groupTodayTasks(
      [task('done', { scheduledDate: '2020-02-29', completedAt: instant })],
      date,
      zone,
    );
    expect(result.completed.length).toBe(included ? 1 : 0);
  });

  it.each([
    ['2026-03-29', '2026-03-28T23:00:00Z', '2026-03-29T21:59:59.999Z', '2026-03-29T22:00:00Z'],
    ['2026-10-25', '2026-10-24T22:00:00Z', '2026-10-25T22:59:59.999Z', '2026-10-25T23:00:00Z'],
  ])('handles the DST day %s with its actual local boundaries', (day, start, last, end) => {
    const result = groupTodayTasks(
      [
        task('start', { scheduledDate: '2020-02-29', completedAt: start }),
        task('last', { scheduledDate: '2020-02-29', completedAt: last }),
        task('end', { scheduledDate: '2020-02-29', completedAt: end }),
      ],
      day,
      'Europe/Warsaw',
    );
    expect(ids(result.completed)).toEqual(['last', 'start']);
  });

  it('moves tasks after complete/reopen and day changes without rollover', () => {
    const open = task('open');
    expect(ids(groupTodayTasks([open], date, 'Europe/Warsaw').untimed)).toEqual(['open']);
    expect(
      groupTodayTasks([{ ...open, completedAt: '2030-01-15T12:00:00Z' }], date, 'Europe/Warsaw')
        .counts,
    ).toEqual({ today: 0, overdue: 0, completed: 1 });
    const nextDay = groupTodayTasks([open], '2030-01-16', 'Europe/Warsaw');
    expect(nextDay.counts).toEqual({ today: 0, overdue: 1, completed: 0 });
    expect(nextDay.overdue[0].scheduledDate).toBe(date);
    expect(groupTodayTasks([], date, 'Europe/Warsaw').counts).toEqual({
      today: 0,
      overdue: 0,
      completed: 0,
    });
  });
});
