import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { runtimeConfiguration } from './runtime.configuration';
import { validateEnvironment } from './validate-environment';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      envFilePath: ['.env.local', '.env'],
      expandVariables: false,
      isGlobal: true,
      load: [runtimeConfiguration],
      validate: validateEnvironment,
    }),
  ],
})
export class ApiCoreConfigurationModule {}
