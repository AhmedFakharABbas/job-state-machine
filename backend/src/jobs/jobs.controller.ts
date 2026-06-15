import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { UserId } from '../auth/user-id.decorator';
import {
  BusinessRuleError,
  JobValidationService,
  MalformedRequestError,
} from './job-validation.service';
import { JobsService } from './jobs.service';
import { toJobResponse } from './dto/job.dto';
import { StateMachineService } from '../state-machine/state-machine.service';

@Controller('api/jobs')
@UseGuards(AuthGuard)
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly validationService: JobValidationService,
    private readonly stateMachine: StateMachineService,
  ) {}

  @Post()
  @HttpCode(201)
  createJob(@UserId() userId: string, @Body() body: Record<string, unknown>) {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException({ error: 'Invalid JSON body' });
    }

    try {
      const input = this.validationService.validate(body);
      const job = this.jobsService.create(
        userId,
        input.asset_id,
        input.operation,
        new Date(input.start_time),
        new Date(input.end_time),
      );
      this.stateMachine.scheduleTransitions(job.id, userId, input.asset_id);
      return toJobResponse(job);
    } catch (err) {
      if (err instanceof MalformedRequestError) {
        throw new BadRequestException({ error: err.message });
      }
      if (err instanceof BusinessRuleError) {
        throw new UnprocessableEntityException({ error: err.message });
      }
      throw err;
    }
  }

  @Get()
  listJobs(@UserId() userId: string) {
    return this.jobsService.findAllForUser(userId).map(toJobResponse);
  }

  @Get(':id')
  getJob(@UserId() userId: string, @Param('id') id: string) {
    const job = this.jobsService.findById(id);
    if (!job || job.userId !== userId) {
      throw new NotFoundException({ error: 'Job not found' });
    }
    return toJobResponse(job);
  }
}
