import {
  databaseReadinessResponseSchema,
  DatabaseReadinessResponse,
  httpErrorResponseSchema,
} from '@daylo/shared/schemas';
import { createZodDto } from 'nestjs-zod';

// Avoid root-ID collisions in nestjs-zod 5.5 with Zod 4.6; preserve nested IDs.
export class DatabaseReadinessResponseDto extends createZodDto(
  databaseReadinessResponseSchema.meta({ id: undefined }),
) {}

export class ReadinessErrorResponseDto extends createZodDto(
  httpErrorResponseSchema.meta({ id: undefined }),
) {}

export const databaseReadyResponse: DatabaseReadinessResponse = {
  status: 'ok',
  checks: {
    database: 'up',
  },
};
