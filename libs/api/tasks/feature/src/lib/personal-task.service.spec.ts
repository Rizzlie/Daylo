import { ConfigService } from '@nestjs/config';
import { PersonalTaskStore } from '@daylo/api/tasks/data-access';
import { TransactionRunner } from '@daylo/api/core/transactions/contracts';
import { PersonalTaskService } from './personal-task.service';

describe('Configured personal task date default', () => {
  afterEach(() => vi.useRealTimers());
  it.each([undefined, '2020-02-29'])(
    'uses runtime zone only when date is omitted (%s)',
    async (scheduledDate) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2030-01-15T23:30:00Z'));
      const create = vi.fn().mockResolvedValue({});
      const tasks = { create } as unknown as PersonalTaskStore;
      const transactions = {
        run: (action: (context: unknown) => unknown) => action({}),
      } as TransactionRunner;
      const config = new ConfigService({ runtime: { timeZone: 'Pacific/Kiritimati' } });
      await new PersonalTaskService(tasks, transactions, config).create('user', {
        title: 'Task',
        scheduledDate,
      });
      expect(create).toHaveBeenCalledWith(
        'user',
        expect.objectContaining({ scheduledDate: scheduledDate ?? '2030-01-16' }),
        expect.anything(),
      );
    },
  );
});
