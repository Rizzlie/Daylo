import { z } from 'zod';

export const csrfTokenResponseSchema = z.object({
  csrfToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
}).meta({ id: 'CsrfTokenResponse' });

export type CsrfTokenResponse = z.infer<typeof csrfTokenResponseSchema>;
