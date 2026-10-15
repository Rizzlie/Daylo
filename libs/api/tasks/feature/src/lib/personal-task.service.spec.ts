import { warsawToday } from './personal-task.service';

describe('Personal task Warsaw date default', () => {
  it.each([
    ['2026-01-15T22:59:59Z', '2026-01-15'],
    ['2026-01-15T23:00:00Z', '2026-01-16'],
    ['2026-07-15T21:59:59Z', '2026-07-15'],
    ['2026-07-15T22:00:00Z', '2026-07-16'],
    ['2026-03-29T00:59:59Z', '2026-03-29'],
    ['2026-03-29T01:00:00Z', '2026-03-29'],
    ['2026-10-25T00:59:59Z', '2026-10-25'],
    ['2026-10-25T01:00:00Z', '2026-10-25'],
    ['2026-12-31T23:00:00Z', '2027-01-01'],
  ])('maps %s to %s independently of host timezone', (instant, expected) => {
    expect(warsawToday(new Date(instant))).toBe(expected);
  });
});
