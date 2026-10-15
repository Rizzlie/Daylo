import { z } from 'zod';

const titleSchema = z.string().trim().min(1).max(200);
const descriptionSchema = z.string().max(5000).nullable();
const dateSchema = z.iso.date().refine((value) => !value.startsWith('0000-'), {
  message: 'The year must be between 0001 and 9999',
});
const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const optionalTimeSchema = z
  .string()
  .regex(/^(?:|(?:[01]\d|2[0-3]):[0-5]\d)$/)
  .nullable();
const versionSchema = z.number().int().min(1).max(2147483647);

export const createPersonalTaskSchema = z.strictObject({
  title: titleSchema,
  description: descriptionSchema.optional(),
  scheduledDate: dateSchema.optional(),
  scheduledTime: optionalTimeSchema.optional(),
});

export const editPersonalTaskSchema = z
  .strictObject({
    version: versionSchema,
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    scheduledDate: dateSchema.optional(),
    scheduledTime: optionalTimeSchema.optional(),
  })
  .refine((input) => Object.keys(input).some((key) => key !== 'version'), {
    message: 'At least one editable field is required',
  });

export const taskVersionSchema = z.strictObject({ version: versionSchema });
export const personalTaskIdSchema = z.strictObject({ id: z.uuid() });

export const listPersonalTasksQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  after: z.uuid().optional(),
});

export const deletePersonalTaskQuerySchema = z.strictObject({
  version: z.coerce.number().int().min(1).max(2147483647),
});

export const personalTaskResponseSchema = z.object({
  id: z.uuid(),
  createdById: z.uuid(),
  // OpenAPI 3.0 represents null through a nullable base type, not type: null.
  groupId: z
    .uuid()
    .nullable()
    .refine((value) => value === null, {
      message: 'Personal tasks cannot belong to a group',
    })
    .meta({ enum: [null] }),
  title: titleSchema,
  description: descriptionSchema,
  scheduledDate: dateSchema,
  scheduledTime: timeSchema.nullable(),
  completedAt: z.iso.datetime().nullable(),
  completedById: z.uuid().nullable(),
  version: versionSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const personalTaskListResponseSchema = z.object({
  items: z.array(personalTaskResponseSchema),
  nextCursor: z.uuid().nullable(),
});

export type CreatePersonalTask = z.infer<typeof createPersonalTaskSchema>;
export type EditPersonalTask = z.infer<typeof editPersonalTaskSchema>;
export type PersonalTaskResponse = z.infer<typeof personalTaskResponseSchema>;
