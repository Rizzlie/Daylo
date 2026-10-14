import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { RuntimeAppModule } from './app/runtime-app.module';
import { setupOpenApi } from './app/openapi';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(RuntimeAppModule);
  app.enableShutdownHooks();
  const config = app.get(ConfigService);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  setupOpenApi(app);
  const port = config.getOrThrow<number>('runtime.port');
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
