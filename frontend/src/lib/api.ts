import type { ApiError, CreateJobRequest, Job } from "@/types/job";
import { clearToken, getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiClientError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearToken();
    throw new ApiClientError(401, "Unauthorized");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({ error: "Request failed" }))) as ApiError;
    throw new ApiClientError(response.status, body.error ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export function listJobs(): Promise<Job[]> {
  return request<Job[]>("/api/jobs");
}

export function createJob(body: CreateJobRequest): Promise<Job> {
  return request<Job>("/api/jobs", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getSocketUrl(): string {
  return process.env.NEXT_PUBLIC_SOCKET_URL ?? API_URL;
}
