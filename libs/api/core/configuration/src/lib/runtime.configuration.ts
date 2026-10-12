import { registerAs } from '@nestjs/config';

export type NodeEnvironment = 'development' | 'production' | 'test';

export interface RuntimeConfiguration {
  databaseUrl: string;
  environment: NodeEnvironment;
  frontendOrigin: string;
  googleClientId: string;
  googleClientSecret: string;
  googleCallbackUrl: string;
  port: number;
}

export const runtimeConfiguration = registerAs(
  'runtime',
  (): RuntimeConfiguration => ({
    databaseUrl: process.env['DATABASE_URL']?.trim() as string,
    environment: process.env['NODE_ENV']?.trim() as NodeEnvironment,
    frontendOrigin: new URL(process.env['FRONTEND_ORIGIN'] as string).origin,
    googleClientId: process.env['GOOGLE_CLIENT_ID']?.trim() as string,
    googleClientSecret: process.env['GOOGLE_CLIENT_SECRET']?.trim() as string,
    googleCallbackUrl: process.env['GOOGLE_CALLBACK_URL']?.trim() as string,
    port: Number(process.env['PORT']),
  }),
);
