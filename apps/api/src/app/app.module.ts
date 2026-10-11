import { Module } from '@nestjs/common';
import { ApiCoreConfigurationModule } from '@daylo/api/core/configuration';
import { ApiCoreDatabaseModule } from '@daylo/api/core/database';

@Module({
  imports: [ApiCoreConfigurationModule, ApiCoreDatabaseModule],
})
export class AppModule {}
