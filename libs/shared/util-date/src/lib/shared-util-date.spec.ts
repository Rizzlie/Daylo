import { todayInTimeZone } from './shared-util-date';

describe('todayInTimeZone', () => {
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
  ])('preserves the default-zone boundary at %s', (instant, expected) => {
    expect(todayInTimeZone('Europe/Warsaw', new Date(instant))).toBe(expected);
  });
  it('uses the supplied zone rather than the host zone', () => {
    const now = new Date('2030-01-15T23:30:00Z');
    expect(todayInTimeZone('UTC', now)).toBe('2030-01-15');
    expect(todayInTimeZone('Pacific/Kiritimati', now)).toBe('2030-01-16');
    expect(todayInTimeZone('America/Los_Angeles', now)).toBe('2030-01-15');
  });
  it('rejects unsupported zones', () => {
    expect(() => todayInTimeZone('Invalid/Zone')).toThrow(RangeError);
  });
});
