import { Controller, Get, Inject, Req } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { ActorContext } from '@daylo/api/core/identity/contracts';
import { ZodResponse } from 'nestjs-zod';
import type { Request } from 'express';
import { TaskErrorResponseDto } from './personal-task.dto';
import { TodayResponseDto } from './today.dto';
import { TodayService } from './today.service';

@ApiTags('Today')
@ApiCookieAuth('dayloSession')
@ApiUnauthorizedResponse({
  description: 'Session missing, expired or revoked.',
  type: TaskErrorResponseDto.Output,
})
@ApiForbiddenResponse({
  description: 'Active application access required.',
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
@Controller('tasks/today')
export class TodayController {
  constructor(@Inject(TodayService) private readonly today: TodayService) {}

  @Get()
  @ApiOperation({
    operationId: 'getTodayTasks',
    summary: 'Read the complete personal Today feed',
    description:
      'Backend date and installation timezone are authoritative. Includes unfinished personal tasks due today or earlier, and currently completed personal tasks scheduled today OR completed during this local day. No pagination; items ordered by ID for transport. Frontend groups and sorts sections. Group tasks are deferred to M04.',
  })
  @ZodResponse({ status: 200, type: TodayResponseDto })
  read(@Req() request: Request & { actor: ActorContext }) {
    return this.today.read(request.actor.userId);
  }
}
