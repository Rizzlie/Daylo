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
  .passthrough();

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
