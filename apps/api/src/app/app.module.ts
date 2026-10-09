import { Module } from '@nestjs/common';
import { ApiCoreConfigurationModule } from '@daylo/api/core/configuration';

@Module({
  imports: [ApiCoreConfigurationModule],
})
export class AppModule {}
