import {
  Injectable,
  InjectionToken,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { firstValueFrom, map, timeout } from 'rxjs';
import { ConfigurationService } from '@daylo/web/shared/api-client';
import type { PublicConfigurationResponseDtoOutput } from '@daylo/web/shared/api-client';

function toConfiguration({ timeZone }: PublicConfigurationResponseDtoOutput) {
  if (!timeZone) throw new Error('Missing application time zone');
  new Intl.DateTimeFormat('en', { timeZone });
  return Object.freeze({ timeZone });
}

export type DayloConfiguration = ReturnType<typeof toConfiguration>;

@Injectable({ providedIn: 'root' })
class ConfigurationLoader {
  private readonly api = inject(ConfigurationService);
  private value: DayloConfiguration | undefined;
  private initialization: Promise<void> | undefined;

  load(): Promise<void> {
    return (this.initialization ??= firstValueFrom(
      this.api.getPublicConfiguration().pipe(timeout(15_000), map(toConfiguration)),
    ).then((value) => {
      this.value = value;
    }));
  }

  read(): DayloConfiguration {
    if (!this.value) throw new Error('Application configuration has not been initialized');
    return this.value;
  }
}

export const DAYLO_CONFIG = new InjectionToken<DayloConfiguration>('DAYLO_CONFIG', {
  providedIn: 'root',
  factory: () => inject(ConfigurationLoader).read(),
});

export function provideDayloConfiguration() {
  return makeEnvironmentProviders([
    provideAppInitializer(() => inject(ConfigurationLoader).load()),
  ]);
}
