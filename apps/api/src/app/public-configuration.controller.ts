import { Controller, Get, Header, SetMetadata } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { PUBLIC_ENDPOINT } from '@daylo/api/core/identity/contracts';
import { httpErrorResponseSchema, publicConfigurationSchema } from '@daylo/shared/schemas';

class PublicConfigurationResponseDto extends createZodDto(publicConfigurationSchema) {}
class PublicConfigurationErrorDto extends createZodDto(
  httpErrorResponseSchema.meta({ id: undefined }),
) {}

@ApiTags('Configuration')
@Controller('configuration')
export class PublicConfigurationController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  @SetMetadata(PUBLIC_ENDPOINT, true)
  @Header('Cache-Control', 'no-cache')
  @ApiOperation({
    operationId: 'getPublicConfiguration',
    summary: 'Read public application configuration',
    description:
      'Browser HTTP cache may store the public response, but must revalidate its ETag before reuse.',
  })
  @ZodResponse({ status: 200, type: PublicConfigurationResponseDto })
  @ApiResponse({
    status: 304,
    description: 'The cached public configuration is still current (ETag revalidation).',
  })
  @ApiInternalServerErrorResponse({
    type: PublicConfigurationErrorDto.Output,
    description: 'An unexpected internal error.',
  })
  getPublicConfiguration() {
    return { timeZone: this.config.getOrThrow<string>('runtime.timeZone') };
  }
}
