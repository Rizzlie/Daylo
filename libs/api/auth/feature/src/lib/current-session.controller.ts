import { Controller, Get, Header, HttpCode, Inject, Post, Req, Res, SetMetadata } from '@nestjs/common';
import {
  ApiCookieAuth, ApiForbiddenResponse, ApiHeader, ApiInternalServerErrorResponse,
  ApiNoContentResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ALLOW_PENDING_SESSION } from '@daylo/api/core/identity/contracts';
import type { CurrentSessionResponse, CsrfTokenResponse } from '@daylo/shared/schemas';
import type { Response } from 'express';
import { ZodResponse } from 'nestjs-zod';
import { CsrfTokenResponseDto, CurrentSessionResponseDto, SessionErrorResponseDto } from './current-session.response';
import { AuthenticatedRequest } from './session.guard';
import { CSRF_HEADER, SessionService } from './session.service';

@ApiTags('Authentication')
@ApiCookieAuth('dayloSession')
@SetMetadata(ALLOW_PENDING_SESSION, true)
@ApiUnauthorizedResponse({
  description: 'Authentication required: session missing, expired or revoked.',
  type: SessionErrorResponseDto.Output,
  example: { statusCode: 401, code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' },
})
@ApiServiceUnavailableResponse({
  description: 'Session persistence unavailable.', type: SessionErrorResponseDto.Output,
})
@ApiInternalServerErrorResponse({
  description: 'An unexpected internal error.', type: SessionErrorResponseDto.Output,
  example: { statusCode: 500, code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' },
})
@Controller('auth')
export class CurrentSessionController {
  constructor(@Inject(SessionService) private readonly sessions: SessionService) {}

  @Get('session')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'getCurrentSession', summary: 'Get and renew the current Daylo session',
    description: 'Returns active or pending identity and renews a still-valid session and its cookie for seven days, capped at 30 days from session creation. Missing, expired or revoked sessions return 401 and cannot be renewed. Call on application entry and foreground return; do not poll to keep sessions alive.',
  })
  @ZodResponse({
    status: 200, description: 'Current identity; session expiry and cookie renewed.', type: CurrentSessionResponseDto,
  })
  async getCurrentSession(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CurrentSessionResponse> {
    // Express also routes HEAD to GET handlers. A background HEAD probe must not
    // keep a session alive or refresh its cookie.
    const session = request.method === 'GET'
      ? await this.sessions.renew(request, response) : request.dayloSession;
    return {
      status: session.user.accessStatus === 'ACTIVE' ? 'active' : 'pending',
      user: { id: session.user.id, email: session.user.email, displayName: session.user.displayName },
    };
  }

  @Get('csrf')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'getCsrfToken', summary: 'Get the session-bound CSRF token',
    description: 'Returns a stable token for this session. Keep it in memory and send X-CSRF-Token on unsafe requests. Does not renew the session; available to pending users.',
  })
  @ZodResponse({ status: 200, type: CsrfTokenResponseDto })
  @ApiForbiddenResponse({ description: 'Invalid session CSRF binding.', type: SessionErrorResponseDto.Output })
  getCsrfToken(@Req() request: AuthenticatedRequest): CsrfTokenResponse {
    return { csrfToken: this.sessions.csrf(request, request.dayloSession) };
  }

  @Post('sign-out')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'signOut', summary: 'Revoke the current Daylo session',
    description: 'Requires the exact configured frontend Origin and a valid session-bound X-CSRF-Token. Deletes the current session and clears its cookie; other device sessions remain valid. Available to pending users.',
  })
  @ApiHeader({ name: CSRF_HEADER, required: true, description: 'Session-bound CSRF token obtained from GET /api/auth/csrf.', schema: { type: 'string', pattern: '^[A-Za-z0-9_-]{43}$' } })
  @ApiNoContentResponse({ description: 'Session revoked and cookie cleared.' })
  @ApiForbiddenResponse({ description: 'Missing or invalid Origin/CSRF proof.', type: SessionErrorResponseDto.Output })
  async signOut(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.sessions.signOut(request.dayloSession, response);
  }
}
