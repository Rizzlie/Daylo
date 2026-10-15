import { createZodDto } from 'nestjs-zod';
import {
  createPersonalTaskSchema,
  editPersonalTaskSchema,
  taskVersionSchema,
  personalTaskIdSchema,
  listPersonalTasksQuerySchema,
  deletePersonalTaskQuerySchema,
  personalTaskResponseSchema,
  personalTaskListResponseSchema,
  httpErrorResponseSchema,
} from '@daylo/shared/schemas';

export class CreatePersonalTaskDto extends createZodDto(createPersonalTaskSchema) {}
export class EditPersonalTaskDto extends createZodDto(editPersonalTaskSchema) {}
export class TaskVersionDto extends createZodDto(taskVersionSchema) {}
export class PersonalTaskIdDto extends createZodDto(personalTaskIdSchema) {}
export class ListPersonalTasksQueryDto extends createZodDto(listPersonalTasksQuerySchema) {}
export class DeletePersonalTaskQueryDto extends createZodDto(deletePersonalTaskQuerySchema) {}
export class PersonalTaskResponseDto extends createZodDto(personalTaskResponseSchema) {}
export class PersonalTaskListResponseDto extends createZodDto(personalTaskListResponseSchema) {}
export class TaskErrorResponseDto extends createZodDto(
  httpErrorResponseSchema.meta({ id: undefined }),
) {}
