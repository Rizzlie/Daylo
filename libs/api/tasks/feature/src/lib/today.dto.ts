import { createZodDto } from 'nestjs-zod';
import { todayResponseSchema } from '@daylo/shared/schemas';

export class TodayResponseDto extends createZodDto(todayResponseSchema) {}
