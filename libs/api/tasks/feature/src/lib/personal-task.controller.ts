import {
  applyDecorators,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ActorContext } from '@daylo/api/core/identity/contracts';
import type { Request } from 'express';
import { ZodResponse } from 'nestjs-zod';
import {
  CreatePersonalTaskDto,
  EditPersonalTaskDto,
  TaskVersionDto,
  PersonalTaskIdDto,
  ListPersonalTasksQueryDto,
  DeletePersonalTaskQueryDto,
  PersonalTaskResponseDto,
  PersonalTaskListResponseDto,
  TaskErrorResponseDto,
} from './personal-task.dto';
import { PersonalTaskService } from './personal-task.service';

type TaskRequest = Request & { actor: ActorContext };

function ExistingTaskMutation() {
  return applyDecorators(
    ApiNotFoundResponse({
      description: 'Task missing or inaccessible.',
      type: TaskErrorResponseDto.Output,
    }),
    ApiConflictResponse({
      description: 'VERSION_CONFLICT: reload the task and retry with its current version.',
      type: TaskErrorResponseDto.Output,
    }),
  );
}

@ApiTags('Personal tasks')
@ApiCookieAuth('dayloSession')
@ApiBadRequestResponse({
  description: 'Invalid task input, identifier or query.',
  type: TaskErrorResponseDto.Output,
})
@ApiUnauthorizedResponse({
  description: 'Session missing, expired or revoked.',
  type: TaskErrorResponseDto.Output,
})
@ApiForbiddenResponse({
  description: 'Active access required; mutations also require valid Origin and CSRF.',
  type: TaskErrorResponseDto.Output,
})
@ApiServiceUnavailableResponse({
  description: 'Persistence unavailable.',
  type: TaskErrorResponseDto.Output,
})
@ApiInternalServerErrorResponse({
  description: 'Unexpected internal error.',
  type: TaskErrorResponseDto.Output,
})
@Controller('tasks/personal')
export class PersonalTaskController {
  constructor(@Inject(PersonalTaskService) private readonly tasks: PersonalTaskService) {}

  @Post()
  @ApiOperation({
    operationId: 'createPersonalTask',
    summary: 'Create a private personal task',
    description:
      'Omitted date defaults to today in Europe/Warsaw; past dates are allowed. Blank optional description/time normalize to null. Ownership, visibility and completion fields are server-owned.',
  })
  @ZodResponse({ status: 201, type: PersonalTaskResponseDto })
  create(@Req() request: TaskRequest, @Body() input: CreatePersonalTaskDto) {
    return this.tasks.create(request.actor.userId, input);
  }

  @Get()
  @ApiOperation({
    operationId: 'listPersonalTasks',
    summary: "List only the current user's personal tasks",
    description:
      'All dates and completion states. UUID ascending keyset order; default limit 50, maximum 100. Pass nextCursor as after; null means the end. This is not the Today feed.',
  })
  @ZodResponse({ status: 200, type: PersonalTaskListResponseDto })
  list(@Req() request: TaskRequest, @Query() query: ListPersonalTasksQueryDto) {
    return this.tasks.list(request.actor.userId, query.limit, query.after);
  }

  @Get(':id')
  @ApiNotFoundResponse({
    description: 'Task missing or inaccessible.',
    type: TaskErrorResponseDto.Output,
  })
  @ApiOperation({ operationId: 'getPersonalTask', summary: 'Read an owned personal task' })
  @ZodResponse({ status: 200, type: PersonalTaskResponseDto })
  read(@Req() request: TaskRequest, @Param() params: PersonalTaskIdDto) {
    return this.tasks.read(request.actor.userId, params.id);
  }

  @Patch(':id')
  @ExistingTaskMutation()
  @ApiOperation({
    operationId: 'editPersonalTask',
    summary: 'Edit an owned personal task',
    description:
      'Requires the current version and at least one editable field. Omitted fields are preserved; null or empty description/time clears them. An unchanged edit preserves version and timestamps.',
  })
  @ZodResponse({ status: 200, type: PersonalTaskResponseDto })
  edit(
    @Req() request: TaskRequest,
    @Param() params: PersonalTaskIdDto,
    @Body() input: EditPersonalTaskDto,
  ) {
    return this.tasks.edit(request.actor.userId, params.id, input);
  }

  @Post(':id/complete')
  @ExistingTaskMutation()
  @ApiOperation({
    operationId: 'completePersonalTask',
    summary: 'Complete an owned personal task',
    description:
      'Requires current version, including when already complete. Repeating the current state changes neither version nor timestamps.',
  })
  @ZodResponse({ status: 200, type: PersonalTaskResponseDto })
  complete(
    @Req() request: TaskRequest,
    @Param() params: PersonalTaskIdDto,
    @Body() input: TaskVersionDto,
  ) {
    return this.tasks.setCompletion(request.actor.userId, params.id, input.version, true);
  }

  @Post(':id/reopen')
  @ExistingTaskMutation()
  @ApiOperation({
    operationId: 'reopenPersonalTask',
    summary: 'Reopen an owned personal task',
    description:
      'Requires current version. Clears completion actor/time atomically; repeating an already open task preserves version and timestamps.',
  })
  @ZodResponse({ status: 200, type: PersonalTaskResponseDto })
  reopen(
    @Req() request: TaskRequest,
    @Param() params: PersonalTaskIdDto,
    @Body() input: TaskVersionDto,
  ) {
    return this.tasks.setCompletion(request.actor.userId, params.id, input.version, false);
  }

  @Delete(':id')
  @HttpCode(204)
  @ExistingTaskMutation()
  @ApiOperation({
    operationId: 'deletePersonalTask',
    summary: 'Delete an owned personal task',
    description: 'Requires the current version in the query. Repeating deletion returns 404.',
  })
  @ApiNoContentResponse({ description: 'Task deleted.' })
  async delete(
    @Req() request: TaskRequest,
    @Param() params: PersonalTaskIdDto,
    @Query() query: DeletePersonalTaskQueryDto,
  ): Promise<void> {
    await this.tasks.delete(request.actor.userId, params.id, query.version);
  }
}
