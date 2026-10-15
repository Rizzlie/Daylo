import { Module } from '@nestjs/common';
import { ApiAuthFeatureModule } from '@daylo/api/auth/feature';
import { ApiCoreDatabaseModule } from '@daylo/api/core/database';
import { ApiUsersFeatureModule } from '@daylo/api/users/feature';
import { ApiGroupsFeatureModule } from '@daylo/api/groups/feature';
import { ApiTasksFeatureModule } from '@daylo/api/tasks/feature';
import { ApiHttpModule } from './api-http.module';
import { DatabaseReadinessController } from './database-readiness.controller';
import { ApiRateLimitModule } from './rate-limiting/api-rate-limit.module';

@Module({
  imports: [
    ApiCoreDatabaseModule,
    ApiHttpModule,
    ApiRateLimitModule,
    ApiTasksFeatureModule,
    ApiAuthFeatureModule.register({
      imports: [ApiUsersFeatureModule, ApiGroupsFeatureModule],
    }),
  ],
  controllers: [DatabaseReadinessController],
})
export class AppModule {}
