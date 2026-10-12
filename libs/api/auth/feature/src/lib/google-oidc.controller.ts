import {
  Controller,
  Get,
  Header,
  Inject,
  Query,
  Req,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { googleCallbackQuerySchema } from '@daylo/shared/schemas';
import { SessionErrorResponseDto } from './current-session.response';
import {
  GoogleOidcService,
  OAUTH_BROWSER_COOKIE,
  OAUTH_TRANSACTION_SECONDS,
} from './google-oidc.service';

class GoogleCallbackQueryDto extends createZodDto(googleCallbackQuerySchema) {}

function browserCookie(request: Request): string | undefined {
  const matches = (request.headers.cookie ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${OAUTH_BROWSER_COOKIE}=`));
  // Ambiguous duplicate cookies cannot establish a trusted browser binding.
  return matches.length === 1
    ? matches[0].slice(OAUTH_BROWSER_COOKIE.length + 1)
    : undefined;
}

@ApiTags('Authentication')
@Controller('auth/google')
export class GoogleOidcController {
  constructor(
    @Inject(GoogleOidcService) private readonly oidc: GoogleOidcService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  private cookieOptions() {
    const localHttp =
      this.config.getOrThrow<string>('runtime.environment') === 'development' &&
      new URL(this.config.getOrThrow<string>('runtime.googleCallbackUrl'))
        .protocol === 'http:';
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: !localHttp,
      path: '/api/auth/google',
    };
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @ApiOperation({
    operationId: 'startGoogleAuthentication',
    summary: 'Start browser navigation to Google',
    description:
      'Navigate the browser to this endpoint; do not call through the generated HTTP client. Creates a ten-minute browser-bound single-use OIDC transaction. No Daylo session is created.',
  })
  @ApiResponse({
    status: 302,
    description:
      'Redirect to Google. Sets the HttpOnly, SameSite=Lax daylo_oauth_browser cookie.',
    headers: {
      Location: {
        description: 'Google authorization URL',
        schema: { type: 'string', format: 'uri' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Authentication infrastructure unavailable.',
    type: SessionErrorResponseDto.Output,
  })
  async start(@Res({ passthrough: true }) response: Response): Promise<void> {
    const transaction = await this.oidc.start();
    response.cookie(OAUTH_BROWSER_COOKIE, transaction.browserBinding, {
      ...this.cookieOptions(),
      maxAge: OAUTH_TRANSACTION_SECONDS * 1000,
    });
    response.redirect(302, transaction.redirectUrl);
  }

  @Get('callback')
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @ApiOperation({
    operationId: 'completeGoogleAuthentication',
    summary: 'Process the Google authorization callback',
    description:
      'Google browser callback, protected by state, nonce and browser binding, not the ordinary mutation CSRF header. Valid verification temporarily returns 503 until Daylo admission/session completion is implemented. Identity and provider tokens are never returned.',
  })
  @ApiQuery({
    name: 'state',
    required: false,
    type: String,
    description: 'Single-use browser-bound authentication state.',
  })
  @ApiQuery({
    name: 'code',
    required: false,
    type: String,
    description:
      'Google authorization code; required for a successful provider response.',
  })
  @ApiQuery({
    name: 'error',
    required: false,
    type: String,
    description:
      'Google refusal/error identifier; cannot be combined with a successful response.',
  })
  @ApiResponse({
    status: 400,
    description: 'Malformed callback query.',
    type: SessionErrorResponseDto.Output,
  })
  @ApiResponse({
    status: 401,
    description:
      'GOOGLE_AUTHENTICATION_FAILED: invalid, expired or reused transaction, denied consent, or invalid identity token.',
    type: SessionErrorResponseDto.Output,
  })
  @ApiResponse({
    status: 503,
    description:
      'Verified identity cannot yet create a Daylo session, or authentication infrastructure unavailable.',
    type: SessionErrorResponseDto.Output,
  })
  async callback(
    @Query() query: GoogleCallbackQueryDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<never> {
    response.clearCookie(OAUTH_BROWSER_COOKIE, this.cookieOptions());
    await this.oidc.callback(query, browserCookie(request));
    throw new ServiceUnavailableException({
      code: 'SERVICE_UNAVAILABLE',
      message: 'Daylo sign-in completion is not yet available',
    });
  }
}
