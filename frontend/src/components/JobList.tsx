import type { Job } from "@/types/job";
import { JobRow } from "./JobRow";

interface JobListProps {
  jobs: Job[];
}

export function JobList({ jobs }: JobListProps) {
  return (
    <div data-testid="job-list">
      <table>
        <thead>
          <tr>
            <th>Asset</th>
            <th>Operation</th>
            <th>Start</th>
            <th>End</th>
            <th>State</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
