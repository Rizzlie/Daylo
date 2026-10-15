import { Module } from '@nestjs/common';
import { ApiCoreDatabaseModule } from '@daylo/api/core/database';
import { ApiTasksDataAccessModule } from '@daylo/api/tasks/data-access';
import { PersonalTaskController } from './personal-task.controller';
import { PersonalTaskService } from './personal-task.service';

@Module({
  imports: [ApiCoreDatabaseModule, ApiTasksDataAccessModule],
  controllers: [PersonalTaskController],
  providers: [PersonalTaskService],
})
export class ApiTasksFeatureModule {}
