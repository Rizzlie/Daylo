import { z } from 'zod';

export const HTTP_ERROR_CODES = {
  authenticationRequired: 'AUTHENTICATION_REQUIRED',
  accessForbidden: 'ACCESS_FORBIDDEN',
  internalServerError: 'INTERNAL_SERVER_ERROR',
  resourceNotFound: 'RESOURCE_NOT_FOUND',
  serviceUnavailable: 'SERVICE_UNAVAILABLE',
  validationError: 'VALIDATION_ERROR',
  versionConflict: 'VERSION_CONFLICT',
} as const;

export const httpErrorCodeSchema = z
  .string()
  .regex(/^[A-Z][A-Z0-9_]*$/)
  .meta({ id: 'HttpErrorCode' });

export const validationIssueSchema = z
  .object({
    path: z.array(z.string()),
    code: z.string().min(1),
    message: z.string().min(1),
  })
  .meta({ id: 'ValidationIssue' });

export const httpErrorResponseSchema = z
  .object({
    statusCode: z.number().int().min(400).max(599),
    code: httpErrorCodeSchema,
    message: z.string().min(1),
    details: z.array(validationIssueSchema).optional(),
  })
  .meta({ id: 'HttpErrorResponse' });

export type HttpErrorResponse = z.infer<typeof httpErrorResponseSchema>;
export type ValidationIssue = z.infer<typeof validationIssueSchema>;
