import { Module } from '@nestjs/common';
import { CurrentSessionController } from './current-session.controller';

@Module({
  controllers: [CurrentSessionController],
})
export class ApiAuthFeatureModule {}
