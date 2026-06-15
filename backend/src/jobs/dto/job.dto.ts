export type JobState = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface JobEntity {
  id: string;
  userId: string;
  assetId: string;
  operation: string;
  startTime: Date;
  endTime: Date;
  state: JobState;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobResponseDto {
  id: string;
  asset_id: string;
  operation: string;
  start_time: string;
  end_time: string;
  state: JobState;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobUpdateEventDto {
  job_id: string;
  state: JobState;
  error_message: string | null;
  timestamp: string;
}

export function formatUtc(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, '.000Z');
}

export function toJobResponse(job: JobEntity): JobResponseDto {
  return {
    id: job.id,
    asset_id: job.assetId,
    operation: job.operation,
    start_time: formatUtc(job.startTime),
    end_time: formatUtc(job.endTime),
    state: job.state,
    error_message: job.errorMessage,
    created_at: formatUtc(job.createdAt),
    updated_at: formatUtc(job.updatedAt),
  };
}
