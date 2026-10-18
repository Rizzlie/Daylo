import { z } from 'zod';

export const publicConfigurationSchema = z.object({
  timeZone: z.string().min(1).max(100),
});
