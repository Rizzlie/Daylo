import { Module } from '@nestjs/common';
import { ApiAuthDataAccessModule } from '@daylo/api/auth/data-access';
import { AuthRecordCleanupService } from './auth-record-cleanup.service';

// Runtime-only module: offline export and ordinary HTTP fixtures omit the job.
@Module({
  imports: [ApiAuthDataAccessModule],
  providers: [AuthRecordCleanupService],
})
export class ApiAuthCleanupModule {}
