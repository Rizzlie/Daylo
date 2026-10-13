import { Module } from '@nestjs/common';
import { SECURITY_EVENT_OUTPUT, SecurityEventWriter } from './security-event-writer';
import { SecurityEvents } from './security-events';

@Module({
  providers: [
    { provide: SECURITY_EVENT_OUTPUT, useValue: process.stdout },
    SecurityEventWriter,
    SecurityEvents,
  ],
  exports: [SecurityEvents],
})
export class ApiCoreSecurityEventsModule {}
