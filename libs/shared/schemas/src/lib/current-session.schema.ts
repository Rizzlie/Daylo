import { z } from 'zod';
import { requiredTextSchema } from './optional-value.schema';

export const sessionUserSchema = z
  .object({
    id: z.uuid(),
    email: z.email(),
    displayName: requiredTextSchema,
  })
  .meta({ id: 'SessionUser' });

export const currentSessionResponseSchema = z
  .object({
    status: z.enum(['pending', 'active']),
    user: sessionUserSchema,
  })
  .meta({ id: 'CurrentSessionResponse' });

export type CurrentSessionResponse = z.infer<typeof currentSessionResponseSchema>;
