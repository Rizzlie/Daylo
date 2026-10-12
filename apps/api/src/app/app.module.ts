import { Module } from '@nestjs/common';
import { ApiAuthFeatureModule } from '@daylo/api/auth/feature';
import { ApiCoreConfigurationModule } from '@daylo/api/core/configuration';
import { ApiCoreDatabaseModule } from '@daylo/api/core/database';
import { ApiHttpModule } from './api-http.module';
import { DatabaseReadinessController } from './database-readiness.controller';

@Module({
  imports: [
    ApiCoreConfigurationModule,
    ApiCoreDatabaseModule,
    ApiHttpModule,
    ApiAuthFeatureModule,
  ],
  controllers: [DatabaseReadinessController],
})
export class AppModule {}
