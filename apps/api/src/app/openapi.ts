import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

export function createOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Daylo API')
    .setDescription(
      'Daylo public API. Session authentication and CSRF enforcement are implemented in F06. ' +
        'The current-session endpoint currently always returns 401. Cookie and CSRF header names will be defined in F06-03.',
    )
    .setVersion('0.1.0')
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
