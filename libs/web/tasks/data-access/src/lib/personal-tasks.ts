import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map, timeout } from 'rxjs';
import { PersonalTasksService } from '@daylo/web/shared/api-client';
import type { PersonalTaskResponseDtoOutput } from '@daylo/web/shared/api-client';

export type PersonalTask = ReturnType<typeof toTask>;
type TaskPage = { items: PersonalTask[]; nextCursor: string | null };

export type TaskFields = Pick<
  PersonalTask,
  'title' | 'description' | 'scheduledDate' | 'scheduledTime'
>;

// Deliberately select presentation fields; transport models stay in data-access.
function toTask(task: PersonalTaskResponseDtoOutput) {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? '',
    scheduledDate: task.scheduledDate,
    scheduledTime: task.scheduledTime ?? '',
    completed: task.completedAt !== null,
    version: task.version,
  };
}

export function taskErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    switch (error.status) {
      case 0:
        return 'Brak połączenia. Sprawdź sieć i spróbuj ponownie.';
      case 400:
        return 'Sprawdź dane zadania i spróbuj ponownie.';
      case 401:
        return 'Sesja wygasła. Zaloguj się ponownie, aby kontynuować.';
      case 403:
        return 'Nie masz dostępu do tej operacji. Odśwież stronę i spróbuj ponownie.';
      case 404:
        return 'To zadanie jest już niedostępne. Odśwież listę.';
      case 409:
        return 'Zadanie zmieniło się w innej sesji. Wczytaj aktualną wersję przed kolejną próbą.';
      case 429:
        return 'Zbyt wiele żądań. Odczekaj chwilę i spróbuj ponownie.';
    }
  }
  return 'Nie udało się wykonać operacji. Spróbuj ponownie.';
}

export function isTaskConflict(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 409;
}

@Injectable({ providedIn: 'root' })
export class PersonalTaskApi {
  private readonly api = inject(PersonalTasksService);

  read(id: string): Promise<PersonalTask> {
    return firstValueFrom(this.api.getPersonalTask(id).pipe(timeout(15_000), map(toTask)));
  }

  save(fields: TaskFields, task?: PersonalTask): Promise<PersonalTask> {
    const body = { ...fields, title: fields.title.trim() };
    const request = task
      ? this.api.editPersonalTask(task.id, { ...body, version: task.version })
      : this.api.createPersonalTask(body);
    return firstValueFrom(request.pipe(timeout(15_000), map(toTask)));
  }

  complete(task: PersonalTask): Promise<PersonalTask> {
    const request = task.completed
      ? this.api.reopenPersonalTask(task.id, { version: task.version })
      : this.api.completePersonalTask(task.id, { version: task.version });
    return firstValueFrom(request.pipe(timeout(15_000), map(toTask)));
  }

  async remove(task: PersonalTask): Promise<void> {
    await firstValueFrom(this.api.deletePersonalTask(task.id, task.version).pipe(timeout(15_000)));
  }
}

@Injectable()
export class PersonalTaskList {
  private readonly api = inject(PersonalTasksService);
  readonly cursor = signal<string | undefined>(undefined);
  private readonly revision = signal(0);
  private readonly page = rxResource({
    params: () => ({ after: this.cursor(), revision: this.revision() }),
    stream: ({ params }) =>
      this.api.listPersonalTasks(50, params.after).pipe(
        timeout(15_000),
        map((page) => ({ items: page.items.map(toTask), nextCursor: page.nextCursor })),
      ),
  });
  private readonly displayedPage = linkedSignal<
    { after: string | undefined; page: TaskPage | undefined },
    TaskPage | undefined
  >({
    source: () => ({
      after: this.cursor(),
      page: this.page.hasValue() ? this.page.value() : undefined,
    }),
    computation: (current, previous) =>
      current.page ?? (current.after === previous?.source.after ? previous?.value : undefined),
  });
  readonly loading = this.page.isLoading;
  readonly error = computed(() => (this.page.error() ? taskErrorMessage(this.page.error()) : ''));
  readonly tasks = computed(() => this.displayedPage()?.items ?? []);
  readonly nextCursor = computed(() => this.displayedPage()?.nextCursor ?? null);

  refresh(): void {
    this.revision.update((revision) => revision + 1);
  }
  first(): void {
    this.cursor.set(undefined);
    this.refresh();
  }
  next(): void {
    const cursor = this.nextCursor();
    if (cursor && !this.loading()) this.cursor.set(cursor);
  }
}
