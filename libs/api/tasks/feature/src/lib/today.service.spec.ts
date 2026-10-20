import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { PersonalTaskStore } from '@daylo/api/tasks/data-access';
import { TodayService } from './today.service';

describe('Today backend reference date', () => {
  afterEach(() => vi.useRealTimers());
  it.each([
    ['Europe/Warsaw', '2030-01-15T22:59:59.999Z', '2030-01-15'],
    ['Europe/Warsaw', '2030-01-15T23:00:00Z', '2030-01-16'],
    ['Pacific/Kiritimati', '2030-01-15T10:00:00Z', '2030-01-16'],
    ['Europe/Warsaw', '2026-03-29T01:00:00Z', '2026-03-29'],
    ['Europe/Warsaw', '2026-10-25T01:00:00Z', '2026-10-25'],
  ])('uses %s at %s', async (timeZone, now, date) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
    const today = vi.fn().mockResolvedValue([]);
    const service = new TodayService(
      { today } as unknown as PersonalTaskStore,
      new ConfigService({ runtime: { timeZone } }),
    );
    expect(await service.read('user')).toEqual({ date, timeZone, items: [] });
    expect(today).toHaveBeenCalledWith('user', date, timeZone);
  });
  it('maps persistence errors without leaking their contents', async () => {
    const today = vi.fn().mockRejectedValue(new Error('private database details'));
    const service = new TodayService(
      { today } as unknown as PersonalTaskStore,
      new ConfigService({ runtime: { timeZone: 'Europe/Warsaw' } }),
    );
    await expect(service.read('user')).rejects.toThrow(ServiceUnavailableException);
  });
});
