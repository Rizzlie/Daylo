import { Module } from '@nestjs/common';
import { ApiAuthFeatureModule } from '@daylo/api/auth/feature';
import { ApiCoreDatabaseModule } from '@daylo/api/core/database';
import { ApiUsersFeatureModule } from '@daylo/api/users/feature';
import { ApiGroupsFeatureModule } from '@daylo/api/groups/feature';
import { ApiHttpModule } from './api-http.module';
import { DatabaseReadinessController } from './database-readiness.controller';

@Module({
  imports: [
    ApiCoreDatabaseModule,
    ApiHttpModule,
    ApiAuthFeatureModule.register({
      imports: [ApiUsersFeatureModule, ApiGroupsFeatureModule],
    }),
  ],
  controllers: [DatabaseReadinessController],
})
export class AppModule {}
