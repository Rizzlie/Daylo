import {
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  TRANSACTION_RUNNER,
  TransactionContext,
  TransactionRunner,
} from '@daylo/api/core/transactions/contracts';
import {
  PersonalTaskFields,
  PersonalTaskRecord,
  PersonalTaskStore,
} from '@daylo/api/tasks/data-access';
import { CreatePersonalTask, EditPersonalTask } from '@daylo/shared/schemas';

export function warsawToday(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => {
    const value = parts.find((value) => value.type === type);
    if (!value) throw new Error('Missing Warsaw date part');
    return value.value;
  };
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function optionalText(value: string | null | undefined): string | null {
  return value && value.trim() ? value : null;
}

@Injectable()
export class PersonalTaskService {
  constructor(
    @Inject(PersonalTaskStore) private readonly tasks: PersonalTaskStore,
    @Inject(TRANSACTION_RUNNER) private readonly transactions: TransactionRunner,
  ) {}

  create(userId: string, input: CreatePersonalTask) {
    return this.persistence(() =>
      this.transactions.run((context) =>
        this.tasks.create(
          userId,
          {
            title: input.title,
            description: optionalText(input.description),
            scheduledDate: input.scheduledDate ?? warsawToday(new Date()),
            scheduledTime: input.scheduledTime || null,
          },
          context,
        ),
      ),
    );
  }

  read(userId: string, id: string) {
    return this.persistence(async () => {
      const task = await this.tasks.find(userId, id);
      if (!task) throw new NotFoundException();
      return task;
    });
  }

  list(userId: string, limit: number, after?: string) {
    return this.persistence(() => this.tasks.list(userId, limit, after));
  }

  edit(userId: string, id: string, input: EditPersonalTask) {
    return this.mutate(userId, id, input.version, (task, context) => {
      const fields: PersonalTaskFields = {
        title: input.title ?? task.title,
        description:
          input.description === undefined ? task.description : optionalText(input.description),
        scheduledDate: input.scheduledDate ?? task.scheduledDate,
        scheduledTime:
          input.scheduledTime === undefined ? task.scheduledTime : input.scheduledTime || null,
      };
      const changed = (Object.keys(fields) as (keyof PersonalTaskFields)[]).some(
        (key) => fields[key] !== task[key],
      );
      return changed ? this.tasks.edit(task, fields, context) : Promise.resolve(task);
    });
  }

  setCompletion(userId: string, id: string, version: number, completed: boolean) {
    return this.mutate(userId, id, version, (task, context) =>
      (task.completedAt !== null) === completed
        ? Promise.resolve(task)
        : this.tasks.setCompletion(task, completed, new Date(), context),
    );
  }

  delete(userId: string, id: string, version: number) {
    return this.mutate(userId, id, version, (task, context) => this.tasks.delete(task, context));
  }

  private mutate<Result>(
    userId: string,
    id: string,
    version: number,
    operation: (task: PersonalTaskRecord, context: TransactionContext) => Promise<Result>,
  ) {
    return this.persistence(() =>
      this.transactions.run(async (context) => {
        const task = await this.tasks.lock(userId, id, context);
        if (!task) throw new NotFoundException();
        if (task.version !== version) throw new ConflictException();
        return operation(task, context);
      }),
    );
  }

  private async persistence<Result>(operation: () => Promise<Result>): Promise<Result> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException();
    }
  }
}
