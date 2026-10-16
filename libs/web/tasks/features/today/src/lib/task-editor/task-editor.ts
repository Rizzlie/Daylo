import { Component, computed, inject, signal } from '@angular/core';
import { FormField, apply, disabled, form, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { taskEditorSchema } from './task-editor.schema';
import { todayInTimeZone } from '@daylo/shared/util-date';
import { DAYLO_CONFIG } from '@daylo/web/core/configuration/data-access';
import {
  PersonalTask,
  PersonalTaskApi,
  TaskFields,
  isTaskConflict,
  taskErrorMessage,
} from '@daylo/web/tasks/data-access';

@Component({
  selector: 'lib-task-editor',
  imports: [FormField, MatButtonModule, MatDialogModule, MatInputModule],
  templateUrl: './task-editor.html',
  styleUrl: './task-editor.scss',
})
export class TaskEditor {
  protected readonly configuration = inject(DAYLO_CONFIG);
  private readonly initialTask = inject<PersonalTask | undefined>(MAT_DIALOG_DATA);
  private readonly api = inject(PersonalTaskApi);
  private readonly dialog = inject(MatDialogRef<TaskEditor, boolean>);
  protected readonly task = signal(this.initialTask);
  protected readonly conflict = signal(false);
  protected readonly reloading = signal(false);
  protected readonly error = signal('');
  protected readonly model = signal<TaskFields>({
    title: this.initialTask?.title ?? '',
    scheduledDate: this.initialTask?.scheduledDate ?? todayInTimeZone(this.configuration.timeZone),
    scheduledTime: this.initialTask?.scheduledTime ?? '',
    description: this.initialTask?.description ?? '',
  });
  protected readonly editor = form(this.model, (fields) => {
    disabled(fields, () => this.busy());
    apply(fields, taskEditorSchema);
  });
  protected readonly busy = computed(() => this.editor().submitting() || this.reloading());
  protected readonly heading = computed(() => (this.task() ? 'Edytuj zadanie' : 'Nowe zadanie'));

  protected save(event: Event): void {
    event.preventDefault();
    if (this.busy() || this.conflict()) return;
    void submit(this.editor, async () => {
      this.error.set('');
      // A pending mutation cannot safely be dismissed and mistaken for cancellation.
      this.dialog.disableClose = true;
      try {
        await this.api.save(this.model(), this.task());
        this.dialog.close(true);
      } catch (error) {
        this.conflict.set(isTaskConflict(error));
        this.error.set(taskErrorMessage(error));
      } finally {
        this.dialog.disableClose = false;
      }
    });
  }

  protected async reloadCurrent(): Promise<void> {
    const task = this.task();
    if (!task || this.busy()) return;
    this.reloading.set(true);
    this.error.set('');
    this.dialog.disableClose = true;
    try {
      // Keep the draft. The latest values are shown for comparison before explicit retry.
      this.task.set(await this.api.read(task.id));
      this.conflict.set(false);
    } catch (error) {
      this.error.set(taskErrorMessage(error));
    } finally {
      this.reloading.set(false);
      this.dialog.disableClose = false;
    }
  }

  protected readonly currentLoaded = computed(() => this.task() !== this.initialTask);

  protected useCurrent(): void {
    const task = this.task();
    if (task)
      this.model.set({
        title: task.title,
        description: task.description,
        scheduledDate: task.scheduledDate,
        scheduledTime: task.scheduledTime,
      });
  }
}
