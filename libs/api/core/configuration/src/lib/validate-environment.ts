import type { NodeEnvironment } from './runtime.configuration';
import { z } from 'zod';
import { dayloTimeZoneSchema } from './daylo-time-zone';

const NODE_ENVIRONMENTS = [
  'development',
  'production',
  'test',
] as const satisfies readonly NodeEnvironment[];

const requiredString = z.string({ error: 'is required' }).trim().min(1, {
  error: 'is required',
});

function parseUrl(value: string): URL | undefined {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

function hasDatabaseLocation(url: URL): boolean {
  return (
    url.hostname.length > 0 &&
    url.username.length > 0 &&
    url.password.length > 0 &&
    url.pathname !== '/'
  );
}

function isHttpOrigin(url: URL): boolean {
  return (
    ['http:', 'https:'].includes(url.protocol) &&
    url.pathname === '/' &&
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash
  );
}

const parsedUrlSchema = requiredString.transform((value, context) => {
  const url = parseUrl(value);
  if (!url) {
    context.addIssue({
      code: 'custom',
      message: 'must be a valid URL',
    });
    return z.NEVER;
  }
  return { value, url };
});

const databaseUrlSchema = parsedUrlSchema.transform(({ value, url }, context) => {
  const failedRule = [
    {
      valid: ['postgres:', 'postgresql:'].includes(url.protocol),
      message: 'must use the postgresql protocol',
    },
    {
      valid: hasDatabaseLocation(url),
      message: 'must include host, database, username, and password',
    },
  ].find((rule) => !rule.valid);
  if (failedRule) {
    context.addIssue({ code: 'custom', message: failedRule.message });
    return z.NEVER;
  }

  return value;
});

const frontendOriginSchema = parsedUrlSchema.transform(({ url }, context) => {
  if (!isHttpOrigin(url)) {
    context.addIssue({
      code: 'custom',
      message: 'must be an HTTP(S) origin without a path, query, or fragment',
    });
    return z.NEVER;
  }

  return url.origin;
});

function callbackErrors(
  callback: URL,
  environment: { FRONTEND_ORIGIN: string; NODE_ENV: NodeEnvironment },
): string[] {
  const matchesOrigin =
    callback.origin === environment.FRONTEND_ORIGIN &&
    callback.pathname === '/api/auth/google/callback' &&
    !callback.search &&
    !callback.hash &&
    !callback.username &&
    !callback.password;
  const localHttp =
    environment.NODE_ENV !== 'production' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(callback.hostname) &&
    callback.protocol === 'http:';
  return [
    {
      valid: matchesOrigin,
      message:
        'must match FRONTEND_ORIGIN with path /api/auth/google/callback and no credentials, query, or fragment',
    },
    {
      valid: callback.protocol === 'https:' || localHttp,
      message: 'must use HTTPS except for local non-production HTTP',
    },
  ]
    .filter((rule) => !rule.valid)
    .map((rule) => rule.message);
}

export const environmentSchema = z
  .object({
    DAYLO_TIME_ZONE: dayloTimeZoneSchema,
    DATABASE_URL: databaseUrlSchema,
    FRONTEND_ORIGIN: frontendOriginSchema,
    INITIAL_OWNER_EMAIL: requiredString
      .pipe(z.email().max(320))
      .transform((value) => value.toLowerCase()),
    GOOGLE_CLIENT_ID: requiredString.regex(/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/, {
      error: 'must be a Google web OAuth client ID',
    }),
    GOOGLE_CLIENT_SECRET: requiredString,
    OAUTH_PKCE_ENCRYPTION_KEY: requiredString.regex(/^[a-fA-F0-9]{64}$/, {
      error: 'must be a 32-byte key encoded as 64 hexadecimal characters',
    }),
    GOOGLE_CALLBACK_URL: requiredString,
    NODE_ENV: requiredString.pipe(
      z.enum(NODE_ENVIRONMENTS, {
        error: 'must be development, production, or test',
      }),
    ),
    PORT: requiredString
      .regex(/^\d+$/, {
        error: 'must be an integer between 1 and 65535',
      })
      .transform(Number)
      .refine((port) => port >= 1 && port <= 65_535, {
        error: 'must be an integer between 1 and 65535',
      }),
  })
  .passthrough()
  .superRefine((environment, context) => {
    const callback = parseUrl(environment.GOOGLE_CALLBACK_URL);
    if (!callback) {
      context.addIssue({
        code: 'custom',
        path: ['GOOGLE_CALLBACK_URL'],
        message: 'must be a valid URL',
      });
      return;
    }

    callbackErrors(callback, environment).forEach((message) => {
      context.addIssue({ code: 'custom', path: ['GOOGLE_CALLBACK_URL'], message });
    });
  });

export function validateEnvironment(environment: Record<string, unknown>): Record<string, unknown> {
  const result = environmentSchema.safeParse(environment);

  if (!result.success) {
    const issue = result.error.issues[0];
    const name = issue.path[0] ?? 'environment';
    throw new Error(`Environment validation failed: ${String(name)} ${issue.message}`);
  }

  return result.data;
}
