import { ExecutionContext, Injectable, INestApplication, MiddlewareConsumer, Module, NestMiddleware, NestModule, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { ThrottlerModule } from '@nestjs/throttler';
import type { Request, Response, NextFunction } from 'express';
import { ApiHttpModule } from '../api-http.module';
import { ApiHttpExceptionFilter } from '../api-http-exception.filter';
import { ApiRateLimitGuard } from './api-rate-limit.guard';
import { BoundedThrottlerStorage } from './bounded-throttler-storage';

function isGoogleRoute(context: ExecutionContext, suffix: string): boolean {
  const request = context.switchToHttp().getRequest<Request>();
  return ['GET', 'HEAD'].includes(request.method) &&
    request.path.replace(/\/+$/, '').toLowerCase() === `/api/auth/google${suffix}`;
}

@Module({ providers: [BoundedThrottlerStorage], exports: [BoundedThrottlerStorage] })
class RateLimitStorageModule {}

@Injectable()
class ApiRateLimitMiddleware implements NestMiddleware {
  constructor(private readonly guard: ApiRateLimitGuard, private readonly errors: ApiHttpExceptionFilter) {}

  async use(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      await this.guard.admitHttp(request, response);
      next();
    } catch (error) {
      // Nest's controller exception filters do not run for Swagger middleware.
      this.errors.catch(error, new ExecutionContextHost([request, response, next]));
    }
  }
}

@Module({
  imports: [
    ApiHttpModule,
    RateLimitStorageModule,
    ThrottlerModule.forRootAsync({
      imports: [RateLimitStorageModule], inject: [BoundedThrottlerStorage],
      useFactory: (storage: BoundedThrottlerStorage) => ({
        storage,
        throttlers: [
          { name: 'burst', ttl: 10_000, limit: 20 },
          { name: 'minute', ttl: 60_000, limit: 120 },
          { name: 'google-start', ttl: 60_000, limit: 5, skipIf: (ctx) => !isGoogleRoute(ctx, '') },
          { name: 'google-callback', ttl: 60_000, limit: 10, skipIf: (ctx) => !isGoogleRoute(ctx, '/callback') },
        ],
      }),
    }),
  ],
  providers: [ApiRateLimitGuard, { provide: APP_GUARD, useExisting: ApiRateLimitGuard }],
})
export class ApiRateLimitModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ApiRateLimitMiddleware).forRoutes({ path: '{*path}', method: RequestMethod.ALL });
  }
}

// Swagger handlers must be registered before Nest's final 404 handler. Their
// admission is registered immediately before them, sharing the controller store.
export function protectApiDocumentation(app: INestApplication): void {
  const guard = app.get(ApiRateLimitGuard);
  const errors = app.get(ApiHttpExceptionFilter);
  app.use(['/api/docs', '/api/openapi.json'], (request: Request, response: Response, next: NextFunction) => {
    void guard.admitHttp(request, response).then(() => next()).catch((error: unknown) => {
      errors.catch(error, new ExecutionContextHost([request, response, next]));
    });
  });
}
