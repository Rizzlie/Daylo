import {
  HTTP_ERROR_CODES,
  httpErrorResponseSchema,
} from './http-error.schema';
import {
  nullableOptionalTextResponseSchema,
  nullableOptionalTimeResponseSchema,
  requiredTextSchema,
} from './optional-value.schema';
import { databaseReadinessResponseSchema } from './readiness.schema';

describe('public schemas', () => {
  it('accepts the agreed stable error envelope', () => {
    expect(
      httpErrorResponseSchema.parse({
        statusCode: 409,
        code: HTTP_ERROR_CODES.versionConflict,
        message: 'Resource version conflict',
      }),
    ).toEqual({
      statusCode: 409,
      code: 'VERSION_CONFLICT',
      message: 'Resource version conflict',
    });
  });

  it('normalizes absent and empty optional response values to null', () => {
    expect(nullableOptionalTextResponseSchema.parse(undefined)).toBeNull();
    expect(nullableOptionalTextResponseSchema.parse('   ')).toBeNull();
    expect(nullableOptionalTimeResponseSchema.parse('')).toBeNull();
    expect(nullableOptionalTimeResponseSchema.parse('09:30')).toBe('09:30');
  });

  it('rejects empty required text and invalid wall-clock time', () => {
    expect(requiredTextSchema.safeParse('   ').success).toBe(false);
    expect(nullableOptionalTimeResponseSchema.safeParse('24:00').success).toBe(
      false,
    );
  });

  it('strips undeclared fields from readiness responses', () => {
    expect(
      databaseReadinessResponseSchema.parse({
        status: 'ok',
        checks: { database: 'up' },
        internalConnection: 'postgres://secret',
      }),
    ).toEqual({ status: 'ok', checks: { database: 'up' } });
  });
});
