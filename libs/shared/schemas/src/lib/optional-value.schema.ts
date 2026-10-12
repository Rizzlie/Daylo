import { z } from 'zod';

const normalizeEmptyToNull = (value: unknown): unknown => {
  if (value === undefined) {
    return null;
  }

  if (typeof value === 'string' && value.trim().length === 0) {
    return null;
  }

  return value;
};

export const requiredTextSchema = z.string().trim().min(1);

export const nullableOptionalTextResponseSchema = z.preprocess(
  normalizeEmptyToNull,
  z.string().nullable(),
);

export const nullableOptionalTimeResponseSchema = z.preprocess(
  normalizeEmptyToNull,
  z
    .string()
    .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
    .nullable(),
);
