import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, getSchemaPath, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc, createZodDto } from 'nestjs-zod';
import { httpErrorResponseSchema } from '@daylo/shared/schemas';
import { protectApiDocumentation } from './rate-limiting/api-rate-limit.module';

class RateLimitErrorResponseDto extends createZodDto(
  httpErrorResponseSchema.meta({ id: undefined }),
) {}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

function rateLimitResponse() {
  return {
    description:
      'Per-IP API budget exceeded. HTML Google navigation redirects to /login?error=rate-limit instead. Rejections do not revoke sessions.',
    headers: {
      'Retry-After': {
        description: 'Seconds until this quota recovers.',
        schema: { type: 'integer' as const, minimum: 1 },
      },
      'Cache-Control': { schema: { type: 'string' as const, enum: ['no-store'] } },
    },
    content: {
      'application/json': { schema: { $ref: getSchemaPath(RateLimitErrorResponseDto.Output) } },
    },
  };
}

export function createOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Daylo API')
    .setDescription(
      'Daylo public API. HTTPS authenticated operations use the HttpOnly __Host-daylo_session cookie (daylo_session on local development HTTP). ' +
        'Unsafe requests require the session-bound X-CSRF-Token and exact configured frontend Origin. ' +
        'Only GET /api/auth/session renews valid sessions for seven days, capped at 30 days from creation; expired/revoked sessions cannot be renewed.',
    )
    .setVersion('0.1.0')
    .addCookieAuth('__Host-daylo_session', { type: 'apiKey', in: 'cookie' }, 'dayloSession')
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'X-CSRF-Token',
        description:
          'Session-bound CSRF proof. Angular reads the daylo_xsrf cookie and attaches this header automatically; direct clients can use GET /api/auth/csrf. The exact configured frontend Origin is also required.',
      },
      'dayloCsrf',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [RateLimitErrorResponseDto.Output],
  });
  // Every controller operation is protected by default, including future routes.
  const operations = Object.values(document.paths)
    .flatMap((path) => HTTP_METHODS.map((method) => path?.[method]))
    .filter((operation) => operation !== undefined);
  operations.forEach((operation) => {
    operation.responses['429'] = rateLimitResponse();
  });
  for (const path of Object.values(document.paths)) {
    for (const method of ['post', 'put', 'patch', 'delete'] as const) {
      const operation = path?.[method];
      if (operation?.security?.some((requirement) => 'dayloSession' in requirement)) {
        // One object means both requirements are mandatory, not alternatives.
        operation.security = [{ dayloSession: [], dayloCsrf: [] }];
      }
    }
  }
  return cleanupOpenApiDoc(document, {
    version: '3.0',
  });
}

export function setupOpenApi(app: INestApplication): void {
  protectApiDocumentation(app);
  SwaggerModule.setup('api/docs', app, createOpenApiDocument(app), {
    jsonDocumentUrl: 'api/openapi.json',
    raw: ['json'],
    swaggerOptions: { validatorUrl: null },
  });
}
