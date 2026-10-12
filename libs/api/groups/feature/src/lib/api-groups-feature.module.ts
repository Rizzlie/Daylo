import { Module } from '@nestjs/common';
import { ApiGroupsDataAccessModule } from '@daylo/api/groups/data-access';

@Module({
  imports: [ApiGroupsDataAccessModule],
  exports: [ApiGroupsDataAccessModule],
})
export class ApiGroupsFeatureModule {}
