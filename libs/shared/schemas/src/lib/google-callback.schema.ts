import { z } from 'zod';

// Google may include additional protocol fields such as scope/authuser. They do
// not influence Daylo redirects, admission, or session creation.
export const googleCallbackQuerySchema = z
  .object({
    state: z.string().max(512).optional(),
    code: z.string().min(1).max(4096).optional(),
    error: z.string().max(256).optional(),
  })
  .passthrough();
