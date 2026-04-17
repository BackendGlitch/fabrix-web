"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getJobDetail, type JobDetail } from "@/lib/api/customer-jobs";
import { AlertCircle, Loader, CheckCircle, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { ROUTES } from "@/lib/routes";

interface JobDetailViewProps {
  jobId: string;
}

const statusColors: Record<
  string,
  { bg: string; text: string; icon: React.ReactNode }
> = {
  pending_owner_approval: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    icon: <Clock className="w-5 h-5" />,
  },
  pending: {
    bg: "bg-yellow-50",
    text: "text-yellow-800",
    icon: <Clock className="w-5 h-5" />,
  },
  queued: {
    bg: "bg-blue-50",
    text: "text-blue-800",
    icon: <Clock className="w-5 h-5" />,
  },
  printing: {
    bg: "bg-purple-50",
    text: "text-purple-800",
    icon: <Loader className="w-5 h-5 animate-spin" />,
  },
  completed: {
    bg: "bg-green-50",
    text: "text-green-800",
    icon: <CheckCircle className="w-5 h-5" />,
  },
  failed: {
    bg: "bg-red-50",
    text: "text-red-800",
    icon: <AlertCircle className="w-5 h-5" />,
  },
  cancelled: {
    bg: "bg-gray-50",
    text: "text-gray-800",
    icon: <AlertCircle className="w-5 h-5" />,
  },
};

// Helper function to format seconds into human readable time
function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

// Helper function to calculate elapsed time
function calculateElapsedTime(startedAt: string | null): number | null {
  if (!startedAt) return null;
  const started = new Date(startedAt).getTime();
  const now = Date.now();
  return Math.floor((now - started) / 1000);
}

// Helper function to calculate remaining time
function calculateRemainingTime(
  progress: number | undefined,
  elapsedSeconds: number | null,
  estimatedSeconds: number | undefined,
): number | null {
  if (!progress || progress <= 0 || !elapsedSeconds || !estimatedSeconds)
    return null;

  // If we have progress percentage, calculate remaining based on that
  if (progress > 0 && progress < 100) {
    const totalSeconds = (elapsedSeconds / progress) * 100;
    return Math.max(0, Math.floor(totalSeconds - elapsedSeconds));
  }

  // If no progress but have estimate, use estimate minus elapsed
  if (estimatedSeconds) {
    return Math.max(0, estimatedSeconds - elapsedSeconds);
  }

  return null;
}

export function JobDetailView({ jobId }: JobDetailViewProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const accessToken = session?.accessToken;
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const loadJob = async () => {
      try {
        setLoading(true);
        const data = await getJobDetail(jobId, accessToken);
        setJob(data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load job";
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    loadJob();

    // Poll for job updates every 30 seconds
    const intervalId = setInterval(() => {
      loadJob();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [jobId, accessToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-sm text-red-800 mt-1">
              {error || "Job not found"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const statusStyle = statusColors[job.status] || statusColors.pending;
  const createdDate = new Date(job.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const metadata = job.metadata as Record<string, any> | null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Success Message */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-900">
              Job Created Successfully!
            </p>
            <p className="text-sm text-green-800 mt-1">
              Your print job has been created and is ready for processing.
            </p>
          </div>
        </div>
      </div>

      {/* Job Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{job.name}</h1>
            {job.description && (
              <p className="text-gray-600 mt-2">{job.description}</p>
            )}
          </div>
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full ${statusStyle.bg}`}
          >
            {statusStyle.icon}
            <span className={`font-semibold capitalize ${statusStyle.text}`}>
              {job.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Job ID</p>
            <p className="font-mono text-gray-900 break-all">{job.id}</p>
          </div>
          <div>
            <p className="text-gray-500">Created</p>
            <p className="text-gray-900">{createdDate}</p>
          </div>
        </div>
      </div>

      {/* File Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          File Information
        </h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">File Name</p>
            <p className="font-medium text-gray-900">{job.file.originalName}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">File Size</p>
              <p className="font-medium text-gray-900">
                {(parseInt(job.file.size, 10) / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">MIME Type</p>
              <p className="font-medium text-gray-900">{job.file.mimeType}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">Uploaded</p>
            <p className="font-medium text-gray-900">
              {new Date(job.file.uploadedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Printer Assignment */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Printer Assignment
        </h2>
        {job.printerId ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-500">Assigned Printer</p>
            <p className="font-medium text-gray-900">
              Printer ID: {job.printerId}
            </p>
            <p className="text-xs text-gray-600 mt-3">
              Your job has been assigned to a printer and will begin printing
              soon.
            </p>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-900">
              No printer has been assigned yet. Your job will be assigned when a
              suitable printer becomes available.
            </p>
          </div>
        )}
      </div>

      {/* Progress & Time Estimation */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Progress & Time Estimation
        </h2>

        <div className="space-y-6">
          {/* Progress Bar */}
          {typeof metadata?.progress === "number" && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Print Progress</span>
                <span className="font-semibold text-gray-900">
                  {metadata.progress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${metadata.progress}%` }}
                ></div>
              </div>
              {typeof metadata?.last_progress_message === "string" && (
                <p className="text-xs text-gray-500 mt-1">
                  {metadata.last_progress_message}
                </p>
              )}
            </div>
          )}

          {/* Time Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Estimated Time */}
            {metadata?.estimated_time_seconds && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-800 mb-1">
                  Estimated Print Time
                </p>
                <p className="text-lg font-semibold text-blue-900">
                  {typeof metadata.estimated_time_seconds === "number" &&
                    formatTime(metadata.estimated_time_seconds)}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Based on model dimensions and scale
                </p>
              </div>
            )}

            {/* Elapsed Time */}
            {job.startedAt && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-sm text-green-800 mb-1">Elapsed Time</p>
                <p className="text-lg font-semibold text-green-900">
                  {formatTime(calculateElapsedTime(job.startedAt) || 0)}
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Started{" "}
                  {new Date(job.startedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}

            {/* Remaining Time */}
            {job.startedAt && job.metadata?.estimated_time_seconds && (
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <p className="text-sm text-purple-800 mb-1">
                  Estimated Remaining
                </p>
                <p className="text-lg font-semibold text-purple-900">
                  {(() => {
                    const elapsed = calculateElapsedTime(job.startedAt);
                    const progress = metadata?.progress;
                    const estimated = metadata?.estimated_time_seconds;
                    const remaining = calculateRemainingTime(
                      typeof progress === "number" ? progress : 0,
                      elapsed,
                      typeof estimated === "number" ? estimated : undefined,
                    );

                    if (remaining !== null && remaining > 0) {
                      return formatTime(remaining);
                    } else if (job.status === "printing") {
                      return "Calculating...";
                    } else {
                      return "N/A";
                    }
                  })()}
                </p>
                <p className="text-xs text-purple-700 mt-1">
                  {job.metadata?.progress
                    ? "Based on current progress"
                    : "Based on initial estimate"}
                </p>
              </div>
            )}

            {/* Status-specific messages */}
            {!job.startedAt && job.metadata?.estimated_time_seconds && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-800 mb-1">Print Not Started</p>
                <p className="text-lg font-semibold text-gray-900">
                  Waiting to begin
                </p>
                <p className="text-xs text-gray-700 mt-1">
                  Estimated:{" "}
                  {typeof metadata?.estimated_time_seconds === "number"
                    ? formatTime(metadata.estimated_time_seconds)
                    : "Unknown"}
                </p>
              </div>
            )}
          </div>

          {/* Status Timeline */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm font-semibold text-gray-900 mb-3">
              Status Timeline
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Created</span>
                <span className="text-gray-900">
                  {new Date(job.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {job.startedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Print Started</span>
                  <span className="text-gray-900">
                    {new Date(job.startedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
              {job.completedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Completed</span>
                  <span className="text-gray-900">
                    {new Date(job.completedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Print Settings */}
      {job.metadata && Object.keys(job.metadata).length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Print Settings
          </h2>
          <div className="space-y-3">
            {Object.entries(job.metadata).map(([key, value]) => (
              <div
                key={key}
                className="flex justify-between py-2 border-b border-gray-200"
              >
                <span className="text-gray-600 capitalize">{key}:</span>
                <span className="font-medium text-gray-900">
                  {typeof value === "string" || typeof value === "number"
                    ? value
                    : JSON.stringify(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={() => router.push(ROUTES.dashboard)}
          className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-900 font-medium py-3 px-4 rounded-lg transition-colors"
        >
          Back to Dashboard
        </button>
        <button
          onClick={() => router.push(ROUTES.dashboard)}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          Create New Job
        </button>
      </div>
    </div>
  );
}
