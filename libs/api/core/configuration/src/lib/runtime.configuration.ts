import { registerAs } from '@nestjs/config';

export type NodeEnvironment = 'development' | 'production' | 'test';

export interface RuntimeConfiguration {
  databaseUrl: string;
  environment: NodeEnvironment;
  frontendOrigin: string;
  port: number;
}

export const runtimeConfiguration = registerAs(
  'runtime',
  (): RuntimeConfiguration => ({
    databaseUrl: process.env['DATABASE_URL'] as string,
    environment: process.env['NODE_ENV'] as NodeEnvironment,
    frontendOrigin: process.env['FRONTEND_ORIGIN'] as string,
    port: Number(process.env['PORT']),
  }),
);
