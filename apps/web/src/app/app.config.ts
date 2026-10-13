import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { provideAuthentication, provideAuthSessionLifecycle } from '@daylo/web/core/auth/data-access';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideAuthentication(),
    provideAuthSessionLifecycle(),
  ]
};
