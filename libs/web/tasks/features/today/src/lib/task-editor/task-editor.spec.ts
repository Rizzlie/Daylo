import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PersonalTaskApi, type PersonalTask } from '@daylo/web/tasks/data-access';
import { TaskEditor } from './task-editor';
import { DAYLO_CONFIG } from '@daylo/web/core/configuration/data-access';

const original: PersonalTask = {
  id: 'task-id',
  title: 'Original',
  description: 'Notes',
  scheduledDate: '2030-01-15',
  scheduledTime: '09:30',
  completed: false,
  version: 1,
};

async function setup(task?: PersonalTask) {
  const api = { save: vi.fn().mockResolvedValue(original), read: vi.fn() };
  const dialog = { close: vi.fn(), disableClose: false };
  TestBed.configureTestingModule({
    imports: [TaskEditor],
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: task },
      { provide: DAYLO_CONFIG, useValue: { timeZone: 'Europe/Warsaw' } },
      { provide: MatDialogRef, useValue: dialog },
      { provide: PersonalTaskApi, useValue: api },
    ],
  });
  const fixture = TestBed.createComponent(TaskEditor);
  await fixture.whenStable();
  const root: HTMLElement = fixture.nativeElement;
  const input = root.querySelector('input') as HTMLInputElement;
  const typeTitle = async (value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  };
  const save = async () => {
    (root.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await fixture.whenStable();
  };
  return { api, dialog, fixture, root, input, typeTitle, save };
}

describe('Task editor', () => {
  it('validates blank titles and preserves an optional empty time and description', async () => {
    const { api, typeTitle, save } = await setup();
    await typeTitle('   ');
    await save();
    expect(api.save).not.toHaveBeenCalled();
    await typeTitle('New task');
    await save();
    expect(api.save).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New task', scheduledTime: '', description: '' }),
      undefined,
    );
  });

  it('keeps the draft after failure and allows explicit retry', async () => {
    const { api, dialog, input, root, typeTitle, save } = await setup(original);
    api.save.mockRejectedValueOnce(new HttpErrorResponse({ status: 503 }));
    await typeTitle('Draft to retain');
    await save();
    expect(input.value).toBe('Draft to retain');
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Spróbuj ponownie');
    expect(dialog.close).not.toHaveBeenCalled();
    await save();
    expect(api.save).toHaveBeenCalledTimes(2);
    expect(dialog.close).toHaveBeenCalledWith(true);
  });

  it('blocks stale retry, reads current version and retains the draft for comparison', async () => {
    const { api, root, input, fixture, typeTitle, save } = await setup(original);
    api.save.mockRejectedValueOnce(new HttpErrorResponse({ status: 409 }));
    api.read.mockResolvedValue({ ...original, title: 'Other session', version: 2 });
    await typeTitle('My draft');
    await save();
    await save();
    expect(api.save).toHaveBeenCalledTimes(1);
    const reload = [...root.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Wczytaj aktualną'),
    ) as HTMLButtonElement;
    reload.click();
    await fixture.whenStable();
    expect(input.value).toBe('My draft');
    expect(root.querySelector('section')?.textContent).toContain('Other session');
    await save();
    expect(api.save).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: 'My draft' }),
      expect.objectContaining({ version: 2 }),
    );
  });

  it('prevents duplicate requests and dismissal while save is pending', async () => {
    const { api, dialog, typeTitle, save } = await setup();
    let resolveSave!: (task: PersonalTask) => void;
    api.save.mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve;
      }),
    );
    await typeTitle('Pending');
    await save();
    await save();
    expect(api.save).toHaveBeenCalledTimes(1);
    expect(dialog.disableClose).toBe(true);
    resolveSave(original);
    await vi.waitFor(() => expect(dialog.close).toHaveBeenCalledWith(true));
    expect(dialog.disableClose).toBe(false);
  });
});
