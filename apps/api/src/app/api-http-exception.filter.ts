import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecurityEvents, SecurityEventInput } from '@daylo/api/core/security-events';
import type { Request } from 'express';
import { HttpAdapterHost } from '@nestjs/core';
import {
  HTTP_ERROR_CODES,
  HttpErrorResponse,
  httpErrorCodeSchema,
  ValidationIssue,
} from '@daylo/shared/schemas';
import {
  ZodSerializationException,
  ZodValidationException,
} from 'nestjs-zod';
import { z } from 'zod';

const statusDefaults: Record<number, Pick<HttpErrorResponse, 'code' | 'message'>> = {
  [HttpStatus.BAD_REQUEST]: {
    code: HTTP_ERROR_CODES.validationError,
    message: 'Request validation failed',
  },
  [HttpStatus.UNAUTHORIZED]: {
    code: HTTP_ERROR_CODES.authenticationRequired,
    message: 'Authentication required',
  },
  [HttpStatus.FORBIDDEN]: {
    code: HTTP_ERROR_CODES.accessForbidden,
    message: 'Access forbidden',
  },
  [HttpStatus.NOT_FOUND]: {
    code: HTTP_ERROR_CODES.resourceNotFound,
    message: 'Resource not found',
  },
  [HttpStatus.CONFLICT]: {
    code: HTTP_ERROR_CODES.versionConflict,
    message: 'Resource version conflict',
  },
  [HttpStatus.TOO_MANY_REQUESTS]: {
    code: HTTP_ERROR_CODES.rateLimitExceeded,
    message: 'Too many requests',
  },
  [HttpStatus.SERVICE_UNAVAILABLE]: {
    code: HTTP_ERROR_CODES.serviceUnavailable,
    message: 'Service unavailable',
  },
};

const GOOGLE_AUTH_PATHS = new Set(['/api/auth/google', '/api/auth/google/callback']);
const normalizedPath = (request: Request) => request.path.replace(/\/+$/, '').toLowerCase();

function isGoogleNavigation(request: Request): boolean {
  return request.method === 'GET'
    && GOOGLE_AUTH_PATHS.has(normalizedPath(request))
    && !!request.get('accept')?.includes('text/html');
}

function recoveryReason(status: number): 'rate-limit' | 'denied' | 'connection' | 'failed' {
  if (status === HttpStatus.TOO_MANY_REQUESTS) return 'rate-limit';
  if (status === HttpStatus.FORBIDDEN) return 'denied';
  if (status >= HttpStatus.INTERNAL_SERVER_ERROR) return 'connection';
  return 'failed';
}

function loginFailureReason(status: number): Extract<SecurityEventInput, { event: 'login_failed' }>['reason'] {
  if (status === HttpStatus.FORBIDDEN) return 'admission_denied';
  if (status === HttpStatus.SERVICE_UNAVAILABLE) return 'infrastructure_unavailable';
  if (status >= HttpStatus.INTERNAL_SERVER_ERROR) return 'unexpected_failure';
  return 'invalid_callback';
}

function securityFailures(status: number, request: Request): SecurityEventInput[] {
  if (status === HttpStatus.TOO_MANY_REQUESTS) {
    return [{ event: 'rate_limit_rejected', reason: 'quota_exceeded' }];
  }
  const path = normalizedPath(request);
  const isAuthRequest = ['GET', 'HEAD'].includes(request.method) && GOOGLE_AUTH_PATHS.has(path);
  if (!isAuthRequest) return [];

  const invalidCallbackQuery = path.endsWith('/callback') && status === HttpStatus.BAD_REQUEST;
  const admissionDenied = status === HttpStatus.FORBIDDEN;
  const callbackEvents: SecurityEventInput[] = invalidCallbackQuery
    ? [{ event: 'callback_rejected', reason: 'invalid_query' }] : [];
  const admissionEvents: SecurityEventInput[] = admissionDenied
    ? [{ event: 'admission_denied', reason: 'not_admitted' }] : [];
  return [...callbackEvents, ...admissionEvents, { event: 'login_failed', reason: loginFailureReason(status) }];
}

@Catch()
export class ApiHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiHttpExceptionFilter.name);

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    @Inject(SecurityEvents) private readonly events: SecurityEvents,
    @Optional() @Inject(ConfigService) private readonly config?: ConfigService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const response = host.switchToHttp().getResponse<unknown>();
    const request = host.switchToHttp().getRequest<Request>();
    this.recordSecurityFailure(status, request);
    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      this.adapterHost.httpAdapter.setHeader(response, 'Cache-Control', 'no-store');
    }
    const origin = this.config?.get<string>('runtime.frontendOrigin');
    if (origin && isGoogleNavigation(request)) {
      // Fixed destinations and allowlisted reasons never expose provider data.
      const reason = recoveryReason(status);
      this.adapterHost.httpAdapter.setHeader(response, 'Cache-Control', 'no-store');
      this.adapterHost.httpAdapter.setHeader(response, 'Referrer-Policy', 'no-referrer');
      this.adapterHost.httpAdapter.redirect(response, 302, new URL(`/login?error=${reason}`, origin).href);
      return;
    }

    this.adapterHost.httpAdapter.reply(
      response,
      this.createErrorResponse(exception, status),
      status,
    );
  }

  private createErrorResponse(
    exception: unknown,
    statusCode: number,
  ): HttpErrorResponse {
    if (exception instanceof ZodValidationException) {
      return {
        statusCode,
        code: HTTP_ERROR_CODES.validationError,
        message: 'Request validation failed',
        details: this.validationDetails(exception.getZodError()),
      };
    }

    if (exception instanceof ZodSerializationException) {
      this.logger.error(
        'A controller response did not match its declared public schema',
      );

      return this.internalServerError(statusCode);
    }

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        'Unhandled API exception',
      );
      return this.internalServerError(statusCode);
    }

    const defaults =
      statusDefaults[statusCode] ?? this.internalServerError(statusCode);
    const exceptionResponse = exception.getResponse();

    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'code' in exceptionResponse &&
      'message' in exceptionResponse &&
      httpErrorCodeSchema.safeParse(exceptionResponse.code).success &&
      typeof exceptionResponse.message === 'string'
    ) {
      return {
        statusCode,
        code: httpErrorCodeSchema.parse(exceptionResponse.code),
        message: exceptionResponse.message,
      };
    }

    return { statusCode, ...defaults };
  }

  private validationDetails(error: unknown): ValidationIssue[] {
    if (!(error instanceof z.ZodError)) {
      return [];
    }

    return error.issues.map((issue) => ({
      path: issue.path.map(String),
      code: issue.code,
      message: issue.message,
    }));
  }

  private internalServerError(statusCode: number): HttpErrorResponse {
    return {
      statusCode,
      code: HTTP_ERROR_CODES.internalServerError,
      message: 'Internal server error',
    };
  }

  private recordSecurityFailure(status: number, request: Request): void {
    securityFailures(status, request).forEach((event) => this.events.record(event, request));
  }
}
