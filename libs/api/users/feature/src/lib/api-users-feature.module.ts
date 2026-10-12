import { Module } from '@nestjs/common';
import { ApiUsersDataAccessModule } from '@daylo/api/users/data-access';

@Module({
  imports: [ApiUsersDataAccessModule],
  exports: [ApiUsersDataAccessModule],
})
export class ApiUsersFeatureModule {}
