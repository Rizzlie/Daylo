import { Module } from '@nestjs/common';
import { DatabaseReadinessController } from './database-readiness.controller';
import { DatabaseReadinessService } from './database-readiness.service';

@Module({
  controllers: [DatabaseReadinessController],
  providers: [DatabaseReadinessService],
})
export class ApiCoreDatabaseModule {}
