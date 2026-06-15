import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { JobRow } from "@/components/JobRow";
import type { Job } from "@/types/job";

const failedJob: Job = {
  id: "job-123",
  asset_id: "asset-fault",
  operation: "calibration",
  start_time: "2026-05-19T14:00:00.000Z",
  end_time: "2026-05-19T15:00:00.000Z",
  state: "FAILED",
  error_message: "Simulated failure (asset-fault)",
  created_at: "2026-05-18T10:00:00.000Z",
  updated_at: "2026-05-18T10:00:02.000Z",
};

describe("JobRow", () => {
  it("renders FAILED state with error_message", () => {
    render(
      <table>
        <tbody>
          <JobRow job={failedJob} />
        </tbody>
      </table>,
    );
    expect(screen.getByTestId("job-state")).toHaveTextContent("FAILED");
    expect(screen.getByTestId("job-error")).toHaveTextContent("Simulated failure (asset-fault)");
  });
});
