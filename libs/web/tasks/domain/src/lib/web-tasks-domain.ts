import { todayInTimeZone } from '@daylo/shared/util-date';

export interface TodayTask {
  id: string;
  title: string;
  description: string;
  scheduledDate: string;
  scheduledTime: string | null;
  completedAt: string | null;
  createdAt: string;
  version: number;
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function byCreation(a: TodayTask, b: TodayTask): number {
  return Date.parse(a.createdAt) - Date.parse(b.createdAt) || compare(a.id, b.id);
}

function byTime(a: TodayTask, b: TodayTask): number {
  return compare(a.scheduledTime ?? '24:00', b.scheduledTime ?? '24:00') || byCreation(a, b);
}

/** Pure projection of one server-dated feed; never reads the browser clock. */
export function groupTodayTasks(tasks: readonly TodayTask[], date: string, timeZone: string) {
  const timed: TodayTask[] = [];
  const untimed: TodayTask[] = [];
  const overdue: TodayTask[] = [];
  const completed: (TodayTask & { completedAt: string })[] = [];
  const seen = new Set<string>();
  for (const task of tasks) {
    if (seen.has(task.id)) continue;
    seen.add(task.id);
    if (task.completedAt !== null) {
      if (
        task.scheduledDate === date ||
        todayInTimeZone(timeZone, new Date(task.completedAt)) === date
      ) {
        completed.push({ ...task, completedAt: task.completedAt });
      }
    } else if (task.scheduledDate < date) {
      overdue.push(task);
    } else if (task.scheduledDate === date) {
      (task.scheduledTime === null ? untimed : timed).push(task);
    }
  }
  timed.sort(byTime);
  untimed.sort(byCreation);
  overdue.sort((a, b) => compare(a.scheduledDate, b.scheduledDate) || byTime(a, b));
  completed.sort(
    (a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt) || compare(a.id, b.id),
  );
  return {
    timed,
    untimed,
    overdue,
    completed,
    counts: {
      today: timed.length + untimed.length,
      overdue: overdue.length,
      completed: completed.length,
    },
  };
}
