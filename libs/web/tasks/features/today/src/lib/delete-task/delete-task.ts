import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import {
  PersonalTask,
  PersonalTaskApi,
  isTaskConflict,
  taskErrorMessage,
} from '@daylo/web/tasks/data-access';

@Component({
  selector: 'lib-delete-task',
  imports: [MatButtonModule, MatDialogModule],
  templateUrl: './delete-task.html',
  styleUrl: './delete-task.scss',
})
export class DeleteTask {
  protected readonly task = inject<PersonalTask>(MAT_DIALOG_DATA);
  private readonly api = inject(PersonalTaskApi);
  private readonly dialog = inject(MatDialogRef<DeleteTask, boolean>);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly conflict = signal(false);

  protected async remove(): Promise<void> {
    if (this.busy() || this.conflict()) return;
    this.busy.set(true);
    this.error.set('');
    this.dialog.disableClose = true;
    try {
      await this.api.remove(this.task);
      this.dialog.close(true);
    } catch (error) {
      this.conflict.set(isTaskConflict(error));
      this.error.set(taskErrorMessage(error));
    } finally {
      this.busy.set(false);
      this.dialog.disableClose = false;
    }
  }
}
