import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  databaseReadyResponse,
  DatabaseReadinessResponse,
  databaseUnavailableResponse,
} from './database-readiness.response';
import { DatabaseReadinessService } from './database-readiness.service';

@Controller('health')
export class DatabaseReadinessController {
  constructor(private readonly database: DatabaseReadinessService) {}

  @Get('ready')
  async getReadiness(): Promise<DatabaseReadinessResponse> {
    if (await this.database.isReady()) {
      return databaseReadyResponse;
    }

    throw new ServiceUnavailableException(databaseUnavailableResponse);
  }
}
