import {
  currentSessionResponseSchema,
  httpErrorResponseSchema,
} from '@daylo/shared/schemas';
import { createZodDto } from 'nestjs-zod';

// Let DTOs own root names: nestjs-zod 5.5 otherwise collides with Zod 4.6 root refs.
// Nested schema IDs remain available for reusable OpenAPI components.
export class CurrentSessionResponseDto extends createZodDto(
  currentSessionResponseSchema.meta({ id: undefined }),
) {}

export class SessionErrorResponseDto extends createZodDto(
  httpErrorResponseSchema.meta({ id: undefined }),
) {}
