export type JobState = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface Job {
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

export interface JobUpdateEvent {
  job_id: string;
  state: JobState;
  error_message: string | null;
  timestamp: string;
}

export interface CreateJobRequest {
  asset_id: string;
  operation: string;
  start_time: string;
  end_time: string;
}

export interface ApiError {
  error: string;
}
