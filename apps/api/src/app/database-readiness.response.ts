import {
  databaseReadinessResponseSchema,
  DatabaseReadinessResponse,
} from '@daylo/shared/schemas';
import { createZodDto } from 'nestjs-zod';

export class DatabaseReadinessResponseDto extends createZodDto(
  databaseReadinessResponseSchema,
) {}

export const databaseReadyResponse: DatabaseReadinessResponse = {
  status: 'ok',
  checks: {
    database: 'up',
  },
};
