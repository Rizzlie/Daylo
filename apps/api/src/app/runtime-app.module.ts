import { Module } from '@nestjs/common';
import { ApiCoreConfigurationModule } from '@daylo/api/core/configuration';
import { AppModule } from './app.module';
import { ApiAuthCleanupModule } from '@daylo/api/auth/feature';
import { ScheduleModule } from '@nestjs/schedule';

// Keep environment loading out of the controller graph used for offline export.
@Module({
  imports: [ApiCoreConfigurationModule, AppModule, ScheduleModule.forRoot(), ApiAuthCleanupModule],
})
export class RuntimeAppModule {}
