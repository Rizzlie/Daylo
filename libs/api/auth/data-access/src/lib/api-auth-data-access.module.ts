import { Module } from '@nestjs/common';
import { ApiCoreDatabaseModule } from '@daylo/api/core/database';
import { OAuthTransactionStore } from './oauth-transaction.store';
import { SessionStore } from './session.store';

@Module({
  imports: [ApiCoreDatabaseModule],
  providers: [OAuthTransactionStore, SessionStore],
  exports: [OAuthTransactionStore, SessionStore],
})
export class ApiAuthDataAccessModule {}
