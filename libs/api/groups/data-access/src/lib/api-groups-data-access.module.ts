import { Module } from '@nestjs/common';
import { INVITATION_ADMISSION } from '@daylo/api/groups/contracts';
import { InvitationAdmissionStore } from './invitation-admission.store';

@Module({
  providers: [{ provide: INVITATION_ADMISSION, useClass: InvitationAdmissionStore }],
  exports: [INVITATION_ADMISSION],
})
export class ApiGroupsDataAccessModule {}
