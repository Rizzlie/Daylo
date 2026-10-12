import {
  Controller,
  Get,
  ServiceUnavailableException,
  SetMetadata,
} from '@nestjs/common';
import { DatabaseReadinessService } from '@daylo/api/core/database';
import { PUBLIC_ENDPOINT } from '@daylo/api/core/identity/contracts';
import { DatabaseReadinessResponse } from '@daylo/shared/schemas';
import { ZodResponse } from 'nestjs-zod';
import {
  ApiOperation,
  ApiTags,
  ApiServiceUnavailableResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import {
  databaseReadyResponse,
  DatabaseReadinessResponseDto,
  ReadinessErrorResponseDto,
} from './database-readiness.response';

@ApiTags('Health')
@Controller('health')
export class DatabaseReadinessController {
  constructor(private readonly database: DatabaseReadinessService) {}

  @Get('ready')
  @SetMetadata(PUBLIC_ENDPOINT, true)
  @ApiOperation({ operationId: 'getReadiness', summary: 'Check database readiness' })
  @ZodResponse({
    status: 200,
    type: DatabaseReadinessResponseDto,
    description: 'The database is available.',
  })
  @ApiServiceUnavailableResponse({
    type: ReadinessErrorResponseDto.Output,
    description: 'The database is unavailable.',
    example: { statusCode: 503, code: 'SERVICE_UNAVAILABLE', message: 'Service unavailable' },
  })
  @ApiInternalServerErrorResponse({
    type: ReadinessErrorResponseDto.Output,
    description: 'An unexpected internal error.',
    example: { statusCode: 500, code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' },
  })
  async getReadiness(): Promise<DatabaseReadinessResponse> {
    if (await this.database.isReady()) {
      return databaseReadyResponse;
    }

    throw new ServiceUnavailableException();
  }
}
