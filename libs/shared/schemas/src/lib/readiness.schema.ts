import { z } from 'zod';

export const databaseReadinessResponseSchema = z
  .object({
    status: z.literal('ok'),
    checks: z.object({
      database: z.literal('up'),
    }),
  })
  .meta({ id: 'DatabaseReadinessResponse' });

export type DatabaseReadinessResponse = z.infer<
  typeof databaseReadinessResponseSchema
>;
