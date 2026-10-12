import { Module } from '@nestjs/common';
import { ApiCoreConfigurationModule } from '@daylo/api/core/configuration';
import { AppModule } from './app.module';

// Keep environment loading out of the controller graph used for offline export.
@Module({
  imports: [ApiCoreConfigurationModule, AppModule],
})
export class RuntimeAppModule {}
