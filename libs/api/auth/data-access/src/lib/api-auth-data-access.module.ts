import { Module } from '@nestjs/common';
import { ApiCoreDatabaseModule } from '@daylo/api/core/database';
import { OAuthTransactionStore } from './oauth-transaction.store';
import { SessionStore } from './session.store';
import { AuthRecordCleanupStore } from './auth-record-cleanup.store';

@Module({
  imports: [ApiCoreDatabaseModule],
  providers: [OAuthTransactionStore, SessionStore, AuthRecordCleanupStore],
  exports: [OAuthTransactionStore, SessionStore, AuthRecordCleanupStore],
})
export class ApiAuthDataAccessModule {}
