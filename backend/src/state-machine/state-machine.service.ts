import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { JobsService } from '../jobs/jobs.service';
import { JobsGateway } from '../socket/jobs.gateway';
import { formatUtc } from '../jobs/dto/job.dto';

@Injectable()
export class StateMachineService {
  private readonly logger = new Logger(StateMachineService.name);
  private readonly scheduled = new Set<string>();

  constructor(
    private readonly jobsService: JobsService,
    private readonly jobsGateway: JobsGateway,
    private readonly config: AppConfigService,
  ) {}

  scheduleTransitions(jobId: string, userId: string, assetId: string): void {
    if (this.scheduled.has(jobId)) return;
    this.scheduled.add(jobId);
    void this.transitionToRunning(jobId, userId, assetId);
  }

  private async transitionToRunning(
    jobId: string,
    userId: string,
    assetId: string,
  ): Promise<void> {
    await this.sleep(this.config.transitionToRunningSeconds * 1000);
    const job = this.jobsService.findById(jobId);
    if (!job || job.state !== 'PENDING') return;

    const updated = this.jobsService.updateState(jobId, 'RUNNING');
    if (!updated) return;

    this.emitUpdate(jobId, userId, 'RUNNING', null);
    void this.transitionToTerminal(jobId, userId, assetId);
  }

  private async transitionToTerminal(
    jobId: string,
    userId: string,
    assetId: string,
  ): Promise<void> {
    await this.sleep(this.config.transitionToTerminalSeconds * 1000);
    const job = this.jobsService.findById(jobId);
    if (!job || job.state !== 'RUNNING') return;

    if (assetId === this.config.faultAssetId) {
      const updated = this.jobsService.updateState(
        jobId,
        'FAILED',
        this.config.faultErrorMessage,
      );
      if (updated) {
        this.emitUpdate(
          jobId,
          userId,
          'FAILED',
          this.config.faultErrorMessage,
        );
      }
    } else {
      const updated = this.jobsService.updateState(jobId, 'COMPLETED');
      if (updated) {
        this.emitUpdate(jobId, userId, 'COMPLETED', null);
      }
    }
  }

  private emitUpdate(
    jobId: string,
    userId: string,
    state: 'RUNNING' | 'COMPLETED' | 'FAILED',
    errorMessage: string | null,
  ): void {
    const payload = {
      job_id: jobId,
      state,
      error_message: errorMessage,
      timestamp: formatUtc(new Date()),
    };
    this.jobsGateway.emitJobUpdate(userId, payload);
    this.logger.log(
      JSON.stringify({
        event: 'job_update_emitted',
        job_id: jobId,
        user_id: userId,
        state,
      }),
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
