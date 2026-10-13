import { validateEnvironment } from './validate-environment';

const validEnvironment = {
  DATABASE_URL: 'postgresql://daylo:daylo-local@localhost:5432/daylo',
  FRONTEND_ORIGIN: 'http://localhost:4200',
  INITIAL_OWNER_EMAIL: 'owner@example.test',
  NODE_ENV: 'development',
  PORT: '3000',
  GOOGLE_CLIENT_ID: 'synthetic.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'synthetic-secret',
  OAUTH_PKCE_ENCRYPTION_KEY: 'a1'.repeat(32),
  GOOGLE_CALLBACK_URL: 'http://localhost:4200/api/auth/google/callback',
};

describe('validateEnvironment', () => {
  it('normalizes valid runtime configuration', () => {
    expect(
      validateEnvironment({
        ...validEnvironment,
        DATABASE_URL: ` ${validEnvironment.DATABASE_URL} `,
        FRONTEND_ORIGIN: ` ${validEnvironment.FRONTEND_ORIGIN} `,
        INITIAL_OWNER_EMAIL: ' Owner@Example.test ',
        NODE_ENV: ` ${validEnvironment.NODE_ENV} `,
        PORT: ` ${validEnvironment.PORT} `,
      }),
    ).toMatchObject({
      ...validEnvironment,
      PORT: 3000,
    });
  });

  it.each([
    'NODE_ENV',
    'PORT',
    'DATABASE_URL',
    'FRONTEND_ORIGIN',
    'INITIAL_OWNER_EMAIL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'OAUTH_PKCE_ENCRYPTION_KEY',
    'GOOGLE_CALLBACK_URL',
  ])('rejects a missing %s value', (name) => {
    const environment = { ...validEnvironment };
    delete environment[name as keyof typeof environment];

    expect(() => validateEnvironment(environment)).toThrow(
      `Environment validation failed: ${name} is required`,
    );
  });

  it.each([
    'https://attacker.example/api/auth/google/callback',
    'http://localhost:4200/wrong',
    'http://localhost:4200/api/auth/google/callback?redirect=https://attacker.example',
    'http://localhost:4200/api/auth/google/callback#fragment',
    'http://user:secret@localhost:4200/api/auth/google/callback',
    'not-a-url',
  ])(
    'rejects unsafe callback configuration without exposing its value',
    (callback) => {
      expect(() =>
        validateEnvironment({
          ...validEnvironment,
          GOOGLE_CALLBACK_URL: callback,
        }),
      ).toThrow('GOOGLE_CALLBACK_URL');
      try {
        validateEnvironment({
          ...validEnvironment,
          GOOGLE_CALLBACK_URL: callback,
        });
      } catch (error) {
        expect(String(error)).not.toContain(callback);
      }
    },
  );

  it('requires HTTPS in production and for non-local callbacks', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, NODE_ENV: 'production' }),
    ).toThrow('must use HTTPS');
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        FRONTEND_ORIGIN: 'http://daylo.example',
        GOOGLE_CALLBACK_URL: 'http://daylo.example/api/auth/google/callback',
      }),
    ).toThrow('must use HTTPS');
    expect(
      validateEnvironment({
        ...validEnvironment,
        NODE_ENV: 'production',
        FRONTEND_ORIGIN: 'https://daylo.example',
        GOOGLE_CALLBACK_URL: 'https://daylo.example/api/auth/google/callback',
      }),
    ).toMatchObject({ NODE_ENV: 'production' });
  });

  it.each(['', ' ', 'not-a-google-client'])(
    'rejects invalid Google client settings',
    (clientId) => {
      expect(() =>
        validateEnvironment({
          ...validEnvironment,
          GOOGLE_CLIENT_ID: clientId,
        }),
      ).toThrow('GOOGLE_CLIENT_ID');
    },
  );

  it('rejects an empty secret without exposing configuration values', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, GOOGLE_CLIENT_SECRET: ' ' }),
    ).toThrow('GOOGLE_CLIENT_SECRET is required');
  });

  it.each(['', ' ', 'a'.repeat(63), 'a'.repeat(65), 'z'.repeat(64), 'private-key'])('rejects an invalid PKCE encryption key without exposing it', (key) => {
    try {
      validateEnvironment({ ...validEnvironment, OAUTH_PKCE_ENCRYPTION_KEY: key });
      throw new Error('Expected configuration rejection');
    } catch (error) {
      expect(String(error)).toContain('OAUTH_PKCE_ENCRYPTION_KEY');
      if (key.trim()) expect(String(error)).not.toContain(key);
    }
  });

  it('rejects invalid values with a specific startup error', () => {
    expect(() => validateEnvironment({ ...validEnvironment, INITIAL_OWNER_EMAIL: 'invalid' })).toThrow('INITIAL_OWNER_EMAIL');
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
