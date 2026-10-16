export function todayInTimeZone(timeZone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => {
    const value = parts.find((part) => part.type === type)?.value;
    if (!value) throw new Error('Missing calendar date part');
    return value;
  };
  return `${part('year')}-${part('month')}-${part('day')}`;
}
