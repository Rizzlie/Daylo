import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DatabaseReadinessService } from '@daylo/api/core/database';
import { DatabaseReadinessResponse } from '@daylo/shared/schemas';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  databaseReadyResponse,
  DatabaseReadinessResponseDto,
} from './database-readiness.response';

@Controller('health')
export class DatabaseReadinessController {
  constructor(private readonly database: DatabaseReadinessService) {}

  @Get('ready')
  @ZodSerializerDto(DatabaseReadinessResponseDto)
  async getReadiness(): Promise<DatabaseReadinessResponse> {
    if (await this.database.isReady()) {
      return databaseReadyResponse;
    }

    throw new ServiceUnavailableException();
  }
}
