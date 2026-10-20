import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiCoreDatabaseModule } from '@daylo/api/core/database';
import { ApiTasksDataAccessModule } from '@daylo/api/tasks/data-access';
import { PersonalTaskController } from './personal-task.controller';
import { PersonalTaskService } from './personal-task.service';
import { TodayController } from './today.controller';
import { TodayService } from './today.service';

@Module({
  imports: [ConfigModule, ApiCoreDatabaseModule, ApiTasksDataAccessModule],
  controllers: [PersonalTaskController, TodayController],
  providers: [PersonalTaskService, TodayService],
})
export class ApiTasksFeatureModule {}
