import type { Job } from "@/types/job";

interface JobRowProps {
  job: Job;
}

export function JobRow({ job }: JobRowProps) {
  return (
    <tr data-testid="job-row" data-job-id={job.id}>
      <td>{job.asset_id}</td>
      <td>{job.operation}</td>
      <td>{job.start_time}</td>
      <td>{job.end_time}</td>
      <td data-testid="job-state">{job.state}</td>
      <td>
        {job.state === "FAILED" && job.error_message ? (
          <span data-testid="job-error">{job.error_message}</span>
        ) : null}
      </td>
    </tr>
  );
}
