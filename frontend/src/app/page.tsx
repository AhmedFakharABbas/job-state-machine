"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreateJobForm } from "@/components/CreateJobForm";
import { JobList } from "@/components/JobList";
import { LogoutButton } from "@/components/LogoutButton";
import { useJobSocket } from "@/hooks/useJobSocket";
import { ApiClientError, listJobs } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { Job, JobUpdateEvent } from "@/types/job";

export default function DashboardPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [authChecked, setAuthChecked] = useState(false);

  const handleUnauthorized = useCallback(() => {
    router.push("/login");
  }, [router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setAuthChecked(true);

    listJobs()
      .then((data) => setJobs(data))
      .catch((err) => {
        if (err instanceof ApiClientError && err.status === 401) {
          handleUnauthorized();
        }
      });
  }, [router, handleUnauthorized]);

  const handleJobUpdate = useCallback((update: JobUpdateEvent) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === update.job_id
          ? { ...job, state: update.state, error_message: update.error_message }
          : job,
      ),
    );
  }, []);

  useJobSocket(handleJobUpdate);

  const handleCreated = (job: Job) => {
    setJobs((prev) => [job, ...prev]);
  };

  if (!authChecked) {
    return null;
  }

  return (
    <main>
      <header>
        <h1>Job Dashboard</h1>
        <LogoutButton />
      </header>
      <CreateJobForm onCreated={handleCreated} onUnauthorized={handleUnauthorized} />
      <JobList jobs={jobs} />
    </main>
  );
}
