import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { showStartupFailure } from './startup-failure';

bootstrapApplication(App, appConfig).catch(() => showStartupFailure(document));
