import 'server-only';

import { auth } from '@/auth';
import type { JobDetail, ListJobsResponse } from '@/lib/api/owner-jobs';

function apiBaseUrl(): string {
  const base = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'https://api-fabrix-v2.backendglitch.com';
  if (!base) {
    throw new Error('Missing API_URL or NEXT_PUBLIC_API_URL');
  }
  return base.replace(/\/$/, '');
}

async function ownerFetch(path: string, init?: RequestInit): Promise<Response> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error('Missing authenticated owner access token');
  }
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
      ...(init?.headers ?? {}),
    },
  });
  return response;
}

/** Thrown message for 401 from Central; use in server actions. */
export const OWNER_API_SESSION_REJECTED =
  'The API rejected your session (invalid or expired token). Sign out and sign in again. ' +
  'If you changed JWT_ACCESS_SECRET on Fabrix Central, every user must log in again.';

export function isOwnerApiSessionRejectedError(e: unknown): boolean {
  return e instanceof Error && e.message === OWNER_API_SESSION_REJECTED;
}

function ownerJobsErrorMessage(status: number, body: unknown): string {
  if (status === 401) {
    return OWNER_API_SESSION_REJECTED;
  }
  if (status === 403) {
    return 'You do not have permission to manage jobs (not an owner).';
  }
  if (body && typeof body === 'object' && 'message' in body) {
    const m = (body as { message?: unknown }).message;
    if (typeof m === 'string') {
      return m;
    }
    if (Array.isArray(m) && m.every((x) => typeof x === 'string')) {
      return m.join(', ');
    }
  }
  return `Request failed (${status})`;
}

/**
 * Fetch jobs pending owner approval for the current owner's printers
 */
export async function ownerFetchPendingJobs(): Promise<ListJobsResponse> {
  const response = await ownerFetch('/owner/jobs/pending');
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(ownerJobsErrorMessage(response.status, payload ?? {}));
  }
  return payload as ListJobsResponse;
}

/**
 * Approve a pending job (move to queued)
 */
export async function ownerApproveJob(jobId: string): Promise<JobDetail> {
  const response = await ownerFetch(`/owner/jobs/${encodeURIComponent(jobId)}/approve`, {
    method: 'PUT',
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(ownerJobsErrorMessage(response.status, payload ?? {}));
  }
  return payload as JobDetail;
}

/**
 * Reject a pending job (move back to pending)
 */
export async function ownerRejectJob(jobId: string): Promise<JobDetail> {
  const response = await ownerFetch(`/owner/jobs/${encodeURIComponent(jobId)}/reject`, {
    method: 'PUT',
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(ownerJobsErrorMessage(response.status, payload ?? {}));
  }
  return payload as JobDetail;
}

/**
 * Update job status (generic method)
 */
export async function ownerUpdateJobStatus(jobId: string, status: string): Promise<JobDetail> {
  const response = await ownerFetch(`/owner/jobs/${encodeURIComponent(jobId)}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(ownerJobsErrorMessage(response.status, payload ?? {}));
  }
  return payload as JobDetail;
}
