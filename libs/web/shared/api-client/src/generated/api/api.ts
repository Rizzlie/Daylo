export * from './authentication.service';
import { AuthenticationService } from './authentication.service';
export * from './configuration.service';
import { ConfigurationService } from './configuration.service';
export * from './health.service';
import { HealthService } from './health.service';
export * from './personal-tasks.service';
import { PersonalTasksService } from './personal-tasks.service';
export const APIS = [AuthenticationService, ConfigurationService, HealthService, PersonalTasksService];
