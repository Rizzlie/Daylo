import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PersonalTaskStore } from '@daylo/api/tasks/data-access';
import { todayInTimeZone } from '@daylo/shared/util-date';

@Injectable()
export class TodayService {
  constructor(
    @Inject(PersonalTaskStore) private readonly tasks: PersonalTaskStore,
    private readonly config: ConfigService,
  ) {}

  async read(userId: string) {
    const timeZone = this.config.getOrThrow<string>('runtime.timeZone');
    const date = todayInTimeZone(timeZone);
    try {
      const items = await this.tasks.today(userId, date, timeZone);
      return { date, timeZone, items };
    } catch {
      throw new ServiceUnavailableException();
    }
  }
}
