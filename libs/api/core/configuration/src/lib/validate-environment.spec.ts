import { validateEnvironment } from './validate-environment';

const validEnvironment = {
  DATABASE_URL: 'postgresql://daylo:daylo-local@localhost:5432/daylo',
  FRONTEND_ORIGIN: 'http://localhost:4200',
  NODE_ENV: 'development',
  PORT: '3000',
};

describe('validateEnvironment', () => {
  it('normalizes valid runtime configuration', () => {
    expect(
      validateEnvironment({
        ...validEnvironment,
        DATABASE_URL: ` ${validEnvironment.DATABASE_URL} `,
        FRONTEND_ORIGIN: ` ${validEnvironment.FRONTEND_ORIGIN} `,
        NODE_ENV: ` ${validEnvironment.NODE_ENV} `,
        PORT: ` ${validEnvironment.PORT} `,
      }),
    ).toMatchObject({
      ...validEnvironment,
      PORT: 3000,
    });
  });

  it.each(['NODE_ENV', 'PORT', 'DATABASE_URL', 'FRONTEND_ORIGIN'])(
    'rejects a missing %s value',
    (name) => {
      const environment = { ...validEnvironment };
      delete environment[name as keyof typeof environment];

      expect(() => validateEnvironment(environment)).toThrow(
        `Environment validation failed: ${name} is required`,
      );
    },
  );

  it('rejects invalid values with a specific startup error', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, PORT: '70000' }),
    ).toThrow('PORT must be an integer between 1 and 65535');

    expect(() =>
      validateEnvironment({ ...validEnvironment, NODE_ENV: 'staging' }),
    ).toThrow('NODE_ENV must be development, production, or test');

    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        DATABASE_URL: 'https://localhost/daylo',
      }),
    ).toThrow('DATABASE_URL must use the postgresql protocol');

    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        FRONTEND_ORIGIN: 'http://localhost:4200/app',
      }),
    ).toThrow('FRONTEND_ORIGIN must be an HTTP(S) origin');
  });
});
