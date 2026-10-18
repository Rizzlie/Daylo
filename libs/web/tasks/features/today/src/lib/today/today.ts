import { Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { AuthSession } from '@daylo/web/core/auth/data-access';
import {
  PersonalTask,
  PersonalTaskApi,
  PersonalTaskList,
  isTaskConflict,
  taskErrorMessage,
} from '@daylo/web/tasks/data-access';
import { finalize } from 'rxjs';
import { DeleteTask } from '../delete-task/delete-task';
import { TaskEditor } from '../task-editor/task-editor';

@Component({
  selector: 'lib-today',
  imports: [MatCardModule, MatButtonModule],
  providers: [PersonalTaskList],
  templateUrl: './today.html',
  styleUrl: './today.scss',
})
export class Today {
  private readonly auth = inject(AuthSession);
  private readonly api = inject(PersonalTaskApi);
  private readonly dialogs = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly listHeading = viewChild.required<ElementRef<HTMLHeadingElement>>('listHeading');
  protected readonly user = this.auth.user;
  protected readonly list = inject(PersonalTaskList);
  protected readonly busyId = signal<string | null>(null);
  protected readonly actionError = signal('');
  protected readonly notice = signal('');

  protected edit(task?: PersonalTask): void {
    const dialog = this.dialogs.open(TaskEditor, {
      data: task,
      width: '600px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: 'first-tabbable',
      delayFocusTrap: false,
      restoreFocus: true,
    });
    dialog
      .afterClosed()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => dialog.close()),
      )
      .subscribe((saved) => {
        if (saved) {
          this.list.first();
          this.notice.set('Zadanie zapisane.');
          this.listHeading().nativeElement.focus();
        }
      });
  }

  protected remove(task: PersonalTask): void {
    const dialog = this.dialogs.open(DeleteTask, {
      data: task,
      width: '440px',
      maxWidth: 'calc(100vw - 32px)',
      restoreFocus: true,
      delayFocusTrap: false,
    });
    dialog
      .afterClosed()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => dialog.close()),
      )
      .subscribe((refresh) => {
        if (refresh) {
          this.list.refresh();
          this.notice.set('Lista zadań została odświeżona.');
          this.listHeading().nativeElement.focus();
        }
      });
  }

  protected async toggle(task: PersonalTask): Promise<void> {
    if (this.busyId() || this.list.loading()) return;
    this.busyId.set(task.id);
    this.actionError.set('');
    this.notice.set('');
    try {
      await this.api.complete(task);
      this.list.refresh();
      this.notice.set(task.completed ? 'Zadanie ponownie otwarte.' : 'Zadanie ukończone.');
    } catch (error) {
      this.actionError.set(taskErrorMessage(error));
      if (isTaskConflict(error)) this.list.refresh();
    } finally {
      this.busyId.set(null);
    }
  }
}
