import { Controller, Get, Header, UnauthorizedException } from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import {
  CurrentSessionResponseDto,
  SessionErrorResponseDto,
} from './current-session.response';

@ApiTags('Authentication')
@Controller('auth')
export class CurrentSessionController {
  @Get('session')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'getCurrentSession',
    summary: 'Get the current Daylo session',
    description:
      'Requires a valid backend-owned session cookie. Pending users may read their identity. ' +
      'Missing, expired or revoked sessions return 401. ' +
      'Until F06 implements session lookup, this endpoint always returns 401, including when a cookie is supplied.',
  })
  @ZodResponse({
    status: 200,
    description: 'The authenticated user and their application access status (implemented in F06).',
    type: CurrentSessionResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required: session missing, expired or revoked.',
    type: SessionErrorResponseDto.Output,
    example: { statusCode: 401, code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' },
  })
  @ApiInternalServerErrorResponse({
    description: 'An unexpected internal error.',
    type: SessionErrorResponseDto.Output,
    example: { statusCode: 500, code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' },
  })
  getCurrentSession(): never {
    // Real cookie lookup and session validation belong to F06.
    throw new UnauthorizedException();
  }
}
