import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PersonalTaskApi } from '@daylo/web/tasks/data-access';
import { DeleteTask } from './delete-task';

describe('Delete confirmation', () => {
  it('does nothing before confirmation and blocks deletion after a stale version', async () => {
    const api = { remove: vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 409 })) };
    const dialog = { close: vi.fn(), disableClose: false };
    TestBed.configureTestingModule({
      imports: [DeleteTask],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { id: 'task', title: 'Private', version: 1 } },
        { provide: PersonalTaskApi, useValue: api },
        { provide: MatDialogRef, useValue: dialog },
      ],
    });
    const fixture = TestBed.createComponent(DeleteTask);
    await fixture.whenStable();
    expect(api.remove).not.toHaveBeenCalled();
    const root: HTMLElement = fixture.nativeElement;
    (
      [...root.querySelectorAll('button')].find(
        (button) => button.textContent?.trim() === 'Usuń',
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();
    expect(api.remove).toHaveBeenCalledTimes(1);
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('innej sesji');
    expect(root.textContent).toContain('Wróć i odśwież listę');
    expect(dialog.close).not.toHaveBeenCalled();
  });
});
