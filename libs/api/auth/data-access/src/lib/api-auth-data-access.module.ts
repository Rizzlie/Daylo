import { Module } from '@nestjs/common';
import { ApiCoreDatabaseModule } from '@daylo/api/core/database';
import { OAuthTransactionStore } from './oauth-transaction.store';

@Module({
  imports: [ApiCoreDatabaseModule],
  providers: [OAuthTransactionStore],
  exports: [OAuthTransactionStore],
})
export class ApiAuthDataAccessModule {}
