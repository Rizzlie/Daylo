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

@Catch()
export class ApiHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiHttpExceptionFilter.name);

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    @Optional() @Inject(ConfigService) private readonly config?: ConfigService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const response = host.switchToHttp().getResponse<unknown>();
    const request = host.switchToHttp().getRequest<Request>();
    const path = request.path;
    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      this.adapterHost.httpAdapter.setHeader(response, 'Cache-Control', 'no-store');
    }
    const origin = this.config?.get<string>('runtime.frontendOrigin');
    if (origin && request.method === 'GET' &&
        ['/api/auth/google', '/api/auth/google/callback'].includes(path.replace(/\/+$/, '').toLowerCase()) &&
        request.get('accept')?.includes('text/html')) {
      // Fixed destinations and allowlisted reasons never expose provider data.
      const reason = status === 429 ? 'rate-limit' : status === 403 ? 'denied' : status >= 500 ? 'connection' : 'failed';
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
        this.errorStack(exception.getZodError()),
      );

      return this.internalServerError(statusCode);
    }

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        'Unhandled API exception',
        this.errorStack(exception),
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

  private errorStack(error: unknown): string | undefined {
    return error instanceof Error ? error.stack : undefined;
  }
}
