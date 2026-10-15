import { Module } from '@nestjs/common';
import { ApiCoreDatabaseModule } from '@daylo/api/core/database';
import { PersonalTaskStore } from './personal-task.store';

@Module({
  imports: [ApiCoreDatabaseModule],
  providers: [PersonalTaskStore],
  exports: [PersonalTaskStore],
})
export class ApiTasksDataAccessModule {}
