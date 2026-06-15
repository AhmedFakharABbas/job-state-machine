import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { JobEntity, JobState } from './dto/job.dto';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly jobs = new Map<string, JobEntity>();

  create(
    userId: string,
    assetId: string,
    operation: string,
    startTime: Date,
    endTime: Date,
  ): JobEntity {
    const now = new Date();
    const job: JobEntity = {
      id: uuidv4(),
      userId,
      assetId,
      operation,
      startTime,
      endTime,
      state: 'PENDING',
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(job.id, job);
    this.logger.log(
      JSON.stringify({
        event: 'job_created',
        job_id: job.id,
        user_id: userId,
        asset_id: assetId,
      }),
    );
    return job;
  }

  findById(jobId: string): JobEntity | undefined {
    return this.jobs.get(jobId);
  }

  findAllForUser(userId: string): JobEntity[] {
    return Array.from(this.jobs.values())
      .filter((job) => job.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  updateState(
    jobId: string,
    state: JobState,
    errorMessage: string | null = null,
  ): JobEntity | undefined {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;
    job.state = state;
    job.errorMessage = errorMessage;
    job.updatedAt = new Date();
    this.logger.log(
      JSON.stringify({
        event: 'job_state_updated',
        job_id: jobId,
        state,
      }),
    );
    return job;
  }
}
