import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createOpenApiDocument } from './openapi';

export async function exportOpenApiDocument() {
  // Preview scans the real controller graph without constructing providers or
  // running lifecycle hooks. Never initialize or listen on this application.
  const app = await NestFactory.create(AppModule, {
    preview: true,
    logger: false,
    abortOnError: false,
  });
  try {
    app.setGlobalPrefix('api');
    return createOpenApiDocument(app);
  } finally {
    await app.close();
  }
}

export function serializeOpenApiDocument(document: unknown): string {
  return JSON.stringify(document, (_key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.fromEntries(
        Object.keys(value).sort().map((key) => [key, value[key]]),
      );
    }
    return value;
  }, 2) + '\n';
}
