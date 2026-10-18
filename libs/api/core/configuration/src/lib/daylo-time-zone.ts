import { z } from 'zod';

export const DEFAULT_DAYLO_TIME_ZONE = 'Europe/Warsaw';

export const dayloTimeZoneSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (timeZone) => {
      if (!/^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)*$/.test(timeZone)) return false;
      try {
        new Intl.DateTimeFormat('en', { timeZone });
        return true;
      } catch {
        return false;
      }
    },
    { message: 'must be a supported IANA time zone' },
  )
  .default(DEFAULT_DAYLO_TIME_ZONE);
