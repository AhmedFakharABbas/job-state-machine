"use client";

import { FormEvent, useState } from "react";
import { ApiClientError, createJob } from "@/lib/api";
import type { CreateJobRequest, Job } from "@/types/job";

interface CreateJobFormProps {
  onCreated: (job: Job) => void;
  onUnauthorized: () => void;
}

const emptyForm: CreateJobRequest = {
  asset_id: "",
  operation: "",
  start_time: "",
  end_time: "",
};

export function CreateJobForm({ onCreated, onUnauthorized }: CreateJobFormProps) {
  const [form, setForm] = useState<CreateJobRequest>(emptyForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const job = await createJob(form);
      onCreated(job);
      setForm(emptyForm);
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.status === 401) {
          onUnauthorized();
          return;
        }
        setError(err.message);
      } else {
        setError("Failed to create job");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="asset">Asset ID</label>
        <input
          id="asset"
          type="text"
          data-testid="create-job-asset"
          value={form.asset_id}
          onChange={(e) => setForm({ ...form, asset_id: e.target.value })}
        />
      </div>
      <div>
        <label htmlFor="operation">Operation</label>
        <input
          id="operation"
          type="text"
          data-testid="create-job-operation"
          value={form.operation}
          onChange={(e) => setForm({ ...form, operation: e.target.value })}
        />
      </div>
      <div>
        <label htmlFor="start">Start time (UTC)</label>
        <input
          id="start"
          type="text"
          data-testid="create-job-start"
          value={form.start_time}
          onChange={(e) => setForm({ ...form, start_time: e.target.value })}
        />
      </div>
      <div>
        <label htmlFor="end">End time (UTC)</label>
        <input
          id="end"
          type="text"
          data-testid="create-job-end"
          value={form.end_time}
          onChange={(e) => setForm({ ...form, end_time: e.target.value })}
        />
      </div>
      <button type="submit" data-testid="create-job-submit" disabled={submitting}>
        Submit job
      </button>
      {error ? <div data-testid="create-job-error">{error}</div> : null}
    </form>
  );
}
