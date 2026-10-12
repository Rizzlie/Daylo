import { DynamicModule, Module, ModuleMetadata } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { OAuth2Client } from 'google-auth-library';
import { ApiAuthDataAccessModule } from '@daylo/api/auth/data-access';
import { ApiCoreDatabaseModule } from '@daylo/api/core/database';
import { ApplicationAdmissionService } from './application-admission.service';
import { CurrentSessionController } from './current-session.controller';
import { GoogleOidcController } from './google-oidc.controller';
import {
  GOOGLE_OAUTH_CLIENT,
  GoogleOidcProvider,
} from './google-oidc.provider';
import { GoogleOidcService } from './google-oidc.service';
import { SessionService } from './session.service';
import { SessionGuard } from './session.guard';

@Module({
  imports: [ConfigModule, ApiCoreDatabaseModule, ApiAuthDataAccessModule],
  controllers: [CurrentSessionController, GoogleOidcController],
  providers: [
    GoogleOidcProvider,
    GoogleOidcService,
    ApplicationAdmissionService,
    SessionService,
    { provide: APP_GUARD, useClass: SessionGuard },
    {
      provide: GOOGLE_OAUTH_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const client = new OAuth2Client({
          clientId: config.getOrThrow<string>('runtime.googleClientId'),
          clientSecret: config.getOrThrow<string>('runtime.googleClientSecret'),
          redirectUri: config.getOrThrow<string>('runtime.googleCallbackUrl'),
          transporterOptions: { timeout: 10_000, retry: false },
        });
        // The library's per-request retry options override transporter defaults.
        // A consumed authorization code must not be exchanged a second time.
        client.transporter.interceptors.request.add({
          resolved: async (request) => {
            request.retry = false;
            request.timeout = 10_000;
            return request;
          },
        });
        return client;
      },
    },
  ],
})
export class ApiAuthFeatureModule {
  static register(options: Pick<ModuleMetadata, 'imports'>): DynamicModule {
    return { module: ApiAuthFeatureModule, imports: options.imports ?? [] };
  }
}
