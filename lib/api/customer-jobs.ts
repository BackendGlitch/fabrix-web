import axios, { AxiosError } from 'axios';
import { getSession } from 'next-auth/react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Helper function to get and attach token.
// Pass accessToken from useSession in polling/live pages to avoid extra session requests.
async function getAuthConfig(accessToken?: string) {
  const token = accessToken ?? (await getSession())?.accessToken;
  return {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  };
}

// Error interceptor for debugging
apiClient.interceptors.response.use(
  (response) => {
    console.log('[API] Response received:', {
      url: response.config.url,
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error: AxiosError) => {
    console.error('[API] Error details:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      response: error.response?.data,
      requestData: error.config?.data,
    });
    
    if (error.response?.status === 401) {
      console.error('[API] 401 Unauthorized - Token may be invalid');
    } else if (error.response?.status === 400) {
      console.error('[API] 400 Bad Request - Check your request data');
    } else if (error.response?.status === 500) {
      console.error('[API] 500 Server error');
    }
    return Promise.reject(error);
  }
);

export interface PrinterOption {
  id: string;
  nodeId: string;
  displayName: string;
  status: 'online' | 'offline';
  activityState: 'idle' | 'working' | 'offline';
  lastHeartbeatAt: string | null;
  capabilities?: Record<string, unknown>;
  options?: Record<string, unknown>;
  printerConfigId?: string;
}

export interface AvailablePrinters {
  printers: PrinterOption[];
  count: number;
}

export interface JobFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: string;
  uploadedAt: string;
}

export interface UploadSTLResponse {
  file: JobFile;
  message: string;
}

export interface CreateJobRequest {
  fileId: string;
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface JobDetail {
  id: string;
  name: string;
  description: string | null;
  status: string;
  fileId: string;
  customerId: string;
  printerId: string | null;
  file: JobFile;
  metadata: Record<string, unknown> | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch available printers
 */
export async function fetchAvailablePrinters(
  accessToken?: string,
): Promise<AvailablePrinters> {
  const config = await getAuthConfig(accessToken);
  const response = await apiClient.get<AvailablePrinters>('/customer/printers', config);
  return response.data;
}

/**
 * Upload an STL file
 */
export async function uploadSTL(
  file: File,
  accessToken?: string,
): Promise<UploadSTLResponse> {
  const config = await getAuthConfig(accessToken);
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<UploadSTLResponse>('/customer/jobs/upload', formData, {
    ...config,
    headers: {
      ...config.headers,
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

/**
 * Create a new job
 */
export async function createJob(
  request: CreateJobRequest,
  accessToken?: string,
): Promise<JobDetail> {
  console.log('[API createJob] Input request:', JSON.stringify(request));
  const config = await getAuthConfig(accessToken);
  console.log('[API createJob] Auth config:', config);
  console.log('[API createJob] Full request data before send:', JSON.stringify(request));
  
  const response = await apiClient.post<JobDetail>('/customer/jobs', request, config);
  console.log('[API createJob] Response:', response.data);
  return response.data;
}

/**
 * Get job details
 */
export async function getJobDetail(
  jobId: string,
  accessToken?: string,
): Promise<JobDetail> {
  const config = await getAuthConfig(accessToken);
  const response = await apiClient.get<JobDetail>(`/customer/jobs/${jobId}`, config);
  return response.data;
}

/**
 * List customer's jobs
 */
export async function listCustomerJobs(
  accessToken?: string,
): Promise<{ jobs: JobDetail[]; count: number }> {
  const config = await getAuthConfig(accessToken);
  const response = await apiClient.get<{ jobs: JobDetail[]; count: number }>('/customer/jobs/me', config);
  return response.data;
}

/**
 * Cancel a customer's job
 */
export async function cancelCustomerJob(
  jobId: string,
  accessToken?: string,
): Promise<{ message: string; job: JobDetail }> {
  const config = await getAuthConfig(accessToken);
  const response = await apiClient.post<{ message: string; job: JobDetail }>(
    `/customer/jobs/${jobId}/cancel`,
    {},
    config,
  );
  return response.data;
}

export interface JobTrackingEvent {
  type: string;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface JobTrackingResponse {
  current: {
    progress: number;
    status: string;
    currentLayer: number;
    totalLayers: number;
    etaMinutes: number;
    timestamp: string;
  };
  timeline: JobTrackingEvent[];
}

/**
 * WEB-07: Get job tracking timeline and current progress snapshot
 */
export async function getJobTracking(
  jobId: string,
  accessToken?: string,
): Promise<JobTrackingResponse> {
  const config = await getAuthConfig(accessToken);
  const response = await apiClient.get<JobTrackingResponse>(
    `/customer/jobs/${jobId}/tracking`,
    config,
  );
  return response.data;
}

export default apiClient;
