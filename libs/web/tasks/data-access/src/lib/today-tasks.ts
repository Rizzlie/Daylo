import { Injectable, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { map, timeout } from 'rxjs';
import { TodayService, type TodayResponseDtoOutput } from '@daylo/web/shared/api-client';
import { groupTodayTasks, type TodayTask } from '@daylo/web/tasks/domain';
import { taskErrorMessage } from './personal-tasks';

function toToday(feed: TodayResponseDtoOutput) {
  const tasks: TodayTask[] = feed.items.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description ?? '',
    scheduledDate: task.scheduledDate,
    scheduledTime: task.scheduledTime,
    completedAt: task.completedAt,
    createdAt: task.createdAt,
    version: task.version,
  }));
  return {
    date: feed.date,
    timeZone: feed.timeZone,
    ...groupTodayTasks(tasks, feed.date, feed.timeZone),
  };
}

/** Provided by the consuming feature; automatic refresh triggers belong to M02-03. */
@Injectable()
export class TodayTasks {
  private readonly api = inject(TodayService);
  private readonly revision = signal(0);
  private readonly feed = rxResource({
    params: () => this.revision(),
    stream: () => this.api.getTodayTasks().pipe(timeout(15_000), map(toToday)),
  });
  // Keep the date and sections from one successful response together during refresh/failure.
  readonly data = linkedSignal<
    ReturnType<typeof toToday> | undefined,
    ReturnType<typeof toToday> | undefined
  >({
    source: () => (this.feed.hasValue() ? this.feed.value() : undefined),
    computation: (current, previous) => current ?? previous?.value,
  }).asReadonly();
  readonly loading = this.feed.isLoading;
  readonly error = computed(() => (this.feed.error() ? taskErrorMessage(this.feed.error()) : ''));

  refresh(): void {
    this.revision.update((value) => value + 1);
  }
}
