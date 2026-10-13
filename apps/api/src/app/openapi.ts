import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

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
    .build();

  const document = SwaggerModule.createDocument(app, config);
  return cleanupOpenApiDoc(document, {
    version: '3.0',
  });
}

export function setupOpenApi(app: INestApplication): void {
  SwaggerModule.setup('api/docs', app, createOpenApiDocument(app), {
    jsonDocumentUrl: 'api/openapi.json',
    raw: ['json'],
    swaggerOptions: { validatorUrl: null },
  });
}
