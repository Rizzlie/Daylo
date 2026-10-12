import type { NodeEnvironment } from './runtime.configuration';
import { z } from 'zod';

const NODE_ENVIRONMENTS = [
  'development',
  'production',
  'test',
] as const satisfies readonly NodeEnvironment[];

const requiredString = z.string({ error: 'is required' }).trim().min(1, {
  error: 'is required',
});

const databaseUrlSchema = requiredString.transform((value, context) => {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    context.addIssue({
      code: 'custom',
      message: 'must be a valid URL',
    });
    return z.NEVER;
  }

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    context.addIssue({
      code: 'custom',
      message: 'must use the postgresql protocol',
    });
    return z.NEVER;
  }

  if (
    url.hostname.length === 0 ||
    url.username.length === 0 ||
    url.password.length === 0 ||
    url.pathname === '/'
  ) {
    context.addIssue({
      code: 'custom',
      message: 'must include host, database, username, and password',
    });
    return z.NEVER;
  }

  return value;
});

const frontendOriginSchema = requiredString.transform((value, context) => {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    context.addIssue({
      code: 'custom',
      message: 'must be a valid URL',
    });
    return z.NEVER;
  }

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.pathname !== '/' ||
    url.username.length > 0 ||
    url.password.length > 0 ||
    url.search.length > 0 ||
    url.hash.length > 0
  ) {
    context.addIssue({
      code: 'custom',
      message: 'must be an HTTP(S) origin without a path, query, or fragment',
    });
    return z.NEVER;
  }

  return url.origin;
});

export const environmentSchema = z
  .object({
    DATABASE_URL: databaseUrlSchema,
    FRONTEND_ORIGIN: frontendOriginSchema,
    INITIAL_OWNER_EMAIL: requiredString
      .pipe(z.email().max(320))
      .transform((value) => value.toLowerCase()),
    GOOGLE_CLIENT_ID: requiredString.regex(
      /^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/,
      {
        error: 'must be a Google web OAuth client ID',
      },
    ),
    GOOGLE_CLIENT_SECRET: requiredString,
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
    let callback: URL;
    try {
      callback = new URL(environment.GOOGLE_CALLBACK_URL);
    } catch {
      context.addIssue({
        code: 'custom',
        path: ['GOOGLE_CALLBACK_URL'],
        message: 'must be a valid URL',
      });
      return;
    }

    if (
      callback.origin !== environment.FRONTEND_ORIGIN ||
      callback.pathname !== '/api/auth/google/callback' ||
      callback.search ||
      callback.hash ||
      callback.username ||
      callback.password
    ) {
      context.addIssue({
        code: 'custom',
        path: ['GOOGLE_CALLBACK_URL'],
        message:
          'must match FRONTEND_ORIGIN with path /api/auth/google/callback and no credentials, query, or fragment',
      });
    }

    const localHttp =
      environment.NODE_ENV !== 'production' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(callback.hostname) &&
      callback.protocol === 'http:';
    if (callback.protocol !== 'https:' && !localHttp) {
      context.addIssue({
        code: 'custom',
        path: ['GOOGLE_CALLBACK_URL'],
        message: 'must use HTTPS except for local non-production HTTP',
      });
    }
  });

export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  const result = environmentSchema.safeParse(environment);

  if (!result.success) {
    const issue = result.error.issues[0];
    const name = issue.path[0] ?? 'environment';
    throw new Error(
      `Environment validation failed: ${String(name)} ${issue.message}`,
    );
  }

  return result.data;
}
