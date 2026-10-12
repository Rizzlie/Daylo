/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { RuntimeAppModule } from './app/runtime-app.module';
import { setupOpenApi } from './app/openapi';

async function bootstrap() {
  const app = await NestFactory.create(RuntimeAppModule);
  const config = app.get(ConfigService);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  setupOpenApi(app);
  const port = config.getOrThrow<number>('runtime.port');
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
