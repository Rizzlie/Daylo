import { z } from 'zod';
import { personalTaskResponseSchema } from './personal-task.schema';

export const todayResponseSchema = z.object({
  date: z.iso.date(),
  timeZone: z.string().min(1),
  items: z.array(personalTaskResponseSchema),
});
