import { Module } from '@nestjs/common';
import { USER_IDENTITY } from '@daylo/api/users/contracts';
import { UserIdentityStore } from './user-identity.store';

@Module({
  providers: [{ provide: USER_IDENTITY, useClass: UserIdentityStore }],
  exports: [USER_IDENTITY],
})
export class ApiUsersDataAccessModule {}
