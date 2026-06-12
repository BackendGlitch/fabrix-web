import axios, { AxiosError } from "axios";
import { getSession } from "next-auth/react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api-fabrix-v2.backendglitch.com";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Helper function to get and attach token.
// Pass accessToken from useSession to avoid extra /api/auth/session calls.
async function getAuthConfig(accessToken?: string) {
  const token = accessToken ?? (await getSession())?.accessToken;
  return {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  };
}

// Error interceptor for debugging
apiClient.interceptors.response.use(
  (response) => {
    console.log("[Owner Jobs API] Response received:", {
      url: response.config.url,
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error: AxiosError) => {
    console.error("[Owner Jobs API] Error details:", {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      response: error.response?.data,
      requestData: error.config?.data,
    });

    if (error.response?.status === 401) {
      console.error("[Owner Jobs API] 401 Unauthorized - Token may be invalid");
    } else if (error.response?.status === 403) {
      console.error("[Owner Jobs API] 403 Forbidden - User is not an owner");
    } else if (error.response?.status === 400) {
      console.error(
        "[Owner Jobs API] 400 Bad Request - Check your request data",
      );
    } else if (error.response?.status === 500) {
      console.error("[Owner Jobs API] 500 Server error");
    }
    return Promise.reject(error);
  },
);

export interface JobFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: string;
  uploadedAt: string;
}

export interface JobDetail {
  id: string;
  name: string;
  description: string | null;
  status: string;
  fileId: string;
  customerId: string;
  customerName?: string | null;
  printerId: string | null;
  printerDisplayName?: string | null;
  file: JobFile;
  metadata: Record<string, unknown> | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListJobsResponse {
  jobs: JobDetail[];
  count: number;
}

/**
 * Fetch jobs pending owner approval for the current owner's printers
 */
export async function fetchPendingJobs(
  accessToken?: string,
): Promise<ListJobsResponse> {
  const config = await getAuthConfig(accessToken);
  const response = await apiClient.get<ListJobsResponse>(
    "/owner/jobs/pending",
    config,
  );
  return response.data;
}

/**
 * Approve a pending job (move to queued)
 */
export async function approveJob(
  jobId: string,
  accessToken?: string,
): Promise<JobDetail> {
  const config = await getAuthConfig(accessToken);
  const response = await apiClient.put<JobDetail>(
    `/owner/jobs/${jobId}/approve`,
    {},
    config,
  );
  return response.data;
}

/**
 * Reject a pending job (move back to pending)
 */
export async function rejectJob(
  jobId: string,
  accessToken?: string,
): Promise<JobDetail> {
  const config = await getAuthConfig(accessToken);
  const response = await apiClient.put<JobDetail>(
    `/owner/jobs/${jobId}/reject`,
    {},
    config,
  );
  return response.data;
}

/**
 * Update job status (generic method)
 */
export async function updateJobStatus(
  jobId: string,
  status: string,
  accessToken?: string,
): Promise<JobDetail> {
  const config = await getAuthConfig(accessToken);
  const response = await apiClient.put<JobDetail>(
    `/owner/jobs/${jobId}/status`,
    { status },
    config,
  );
  return response.data;
}

export default apiClient;
