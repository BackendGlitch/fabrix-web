"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getJobDetail, cancelCustomerJob, type JobDetail } from "@/lib/api/customer-jobs";
import { useCustomerWebSocket } from "@/lib/websocket/customer-websocket";
import {
  AlertCircle,
  Loader,
  CheckCircle,
  Clock,
  PrinterIcon,
  Zap,
  X,
  Activity,
} from "lucide-react";
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
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    icon: <Clock className="w-5 h-5" />,
  },
  pending: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-400",
    icon: <Clock className="w-5 h-5" />,
  },
  queued: {
    bg: "bg-primary/10",
    text: "text-primary",
    icon: <Clock className="w-5 h-5" />,
  },
  printing: {
    bg: "bg-magenta/10",
    text: "text-magenta",
    icon: <Loader className="w-5 h-5 animate-spin" />,
  },
  completed: {
    bg: "bg-lime/10",
    text: "text-lime",
    icon: <CheckCircle className="w-5 h-5" />,
  },
  failed: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    icon: <AlertCircle className="w-5 h-5" />,
  },
  cancelled: {
    bg: "bg-secondary",
    text: "text-muted-foreground",
    icon: <AlertCircle className="w-5 h-5" />,
  },
};

const statusTimeline = [
  { status: "pending_owner_approval", label: "Awaiting Approval", order: 1 },
  { status: "pending", label: "Approved", order: 2 },
  { status: "queued", label: "Queued", order: 3 },
  { status: "printing", label: "Printing", order: 4 },
  { status: "completed", label: "Completed", order: 5 },
];

// Helper function to format seconds into human readable time
function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
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
  progress: number,
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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoad = useRef(true);

  const loadJob = async () => {
    try {
      const data = await getJobDetail(jobId, accessToken || "");
      setJob(data);
      setLastUpdated(new Date());
      
      // Only show loading on initial load
      if (isInitialLoad.current) {
        setLoading(false);
        isInitialLoad.current = false;
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load job";
      setError(message);
      if (isInitialLoad.current) {
        setLoading(false);
        isInitialLoad.current = false;
      }
      toast.error(message);
    }
  };

  // CS-09: Set up WebSocket for real-time updates
  const { isConnected: wsIsConnected } = useCustomerWebSocket({
    accessToken,
    enabled: !!accessToken,
    callbacks: {
      onJobUpdate: (jobIdUpdate, updateType, data) => {
        // Only update if this is for the current job
        if (jobIdUpdate === jobId) {
          setJob((prevJob) => {
            if (!prevJob) return null;

            return {
              ...prevJob,
              status: data.status,
              metadata: {
                ...(prevJob.metadata || {}),
                progress: data.progress ?? prevJob.metadata?.progress,
                current_layer: data.currentLayer ?? prevJob.metadata?.current_layer,
                total_layers: data.totalLayers ?? prevJob.metadata?.total_layers,
                eta_minutes: data.etaMinutes ?? prevJob.metadata?.eta_minutes,
                ...(data.errorMessage && { error_message: data.errorMessage }),
              },
            };
          });
          setLastUpdated(new Date());

          // Show toast for terminal events
          if (updateType === 'completed') {
            toast.success(`Job completed: ${data.message}`);
          } else if (updateType === 'failed') {
            toast.error(`Job failed: ${data.errorMessage || data.message}`);
          }
        }
      },
      onConnected: () => {
        console.log('WebSocket connected, job updates will be real-time');
        setWsConnected(true);
      },
      onDisconnected: () => {
        console.log('WebSocket disconnected, falling back to polling');
        setWsConnected(false);
      },
      onError: (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      },
    },
  });

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    // Initial load
    loadJob();

    // Poll for job updates every 5 seconds as fallback
    // WebSocket provides real-time updates when available
    pollIntervalRef.current = setInterval(() => {
      loadJob();
    }, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [jobId, accessToken]);

  const handleCancel = async () => {
    if (!accessToken || !job) return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel this job? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      setCancelling(true);
      const result = await cancelCustomerJob(jobId, accessToken);
      setJob(result.job);
      toast.success("Job cancelled successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to cancel job";
      toast.error(message);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-xl border border-primary/20 flex items-center justify-center animate-pulse">
            <Loader className="w-6 h-6 text-primary animate-spin" />
          </div>
          <p className="text-muted-foreground text-sm font-mono">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-destructive">Error</h3>
            <p className="text-sm text-destructive/80 mt-1">
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
      <div className="bg-lime/10 border border-lime/20 rounded-2xl p-4">
        <div className="flex gap-3">
          <CheckCircle className="w-5 h-5 text-lime flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-lime">
              Job Created Successfully!
            </p>
            <p className="text-sm text-lime/80 mt-1">
              Your print job has been created and is ready for processing.
            </p>
          </div>
        </div>
      </div>

      {/* Job Header */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{job.name}</h1>
            {job.description && (
              <p className="text-muted-foreground mt-2">{job.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-full ${statusStyle.bg}`}
            >
              {statusStyle.icon}
              <span className={`font-semibold capitalize ${statusStyle.text}`}>
                {job.status}
              </span>
            </div>
            <Link
              href={`${ROUTES.dashboardAreas.customerJobs}/${job.id}/tracking` as any}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
            >
              <Activity className="w-4 h-4" />
              Tracking
            </Link>
            {["pending_owner_approval", "pending", "queued"].includes(job.status) && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelling ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                {cancelling ? "Cancelling..." : "Cancel"}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Job ID</p>
            <p className="font-mono text-foreground break-all">{job.id}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Created</p>
            <p className="text-foreground">{createdDate}</p>
          </div>
        </div>

        {lastUpdated && (
          <div className="text-xs text-muted-foreground mt-4">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Status Timeline */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6">
          Job Progress
        </h2>
        <div className="space-y-4">
          {statusTimeline.map((stage, idx) => {
            const currentStatusOrder = statusTimeline.find((s) => s.status === job.status)?.order ?? 0;
            const isCompleted = stage.order < currentStatusOrder;
            const isCurrent = stage.status === job.status;

            return (
              <div key={stage.status} className="flex items-start gap-4">
                {/* Timeline dot */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                      isCompleted
                        ? "bg-lime/10 text-lime"
                        : isCurrent
                          ? "bg-primary/20 text-primary ring-2 ring-primary/30"
                          : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? "✓" : stage.order}
                  </div>
                  {idx < statusTimeline.length - 1 && (
                    <div
                      className={`w-0.5 h-12 mt-2 ${
                        isCompleted ? "bg-lime/30" : "bg-border"
                      }`}
                    />
                  )}
                </div>
                {/* Timeline content */}
                <div className="pt-1 flex-1">
                  <p
                    className={`font-medium ${
                      isCompleted
                        ? "text-lime"
                        : isCurrent
                          ? "text-primary"
                          : "text-muted-foreground"
                    }`}
                  >
                    {stage.label}
                  </p>
                  {isCurrent && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Your job is currently at this stage
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* File Information */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          File Information
        </h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">File Name</p>
            <p className="font-medium text-foreground">{job.file.originalName}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">File Size</p>
              <p className="font-medium text-foreground">
                {(parseInt(job.file.size, 10) / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">MIME Type</p>
              <p className="font-medium text-foreground">{job.file.mimeType}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Uploaded</p>
            <p className="font-medium text-foreground">
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
      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Printer Assignment
        </h2>
        {job.printerId ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Assigned Printer</p>
            <p className="font-medium text-foreground">
              Printer ID: {job.printerId}
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              Your job has been assigned to a printer and will begin printing
              soon.
            </p>
          </div>
        ) : (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
            <p className="text-sm text-amber-400">
              No printer has been assigned yet. Your job will be assigned when a
              suitable printer becomes available.
            </p>
          </div>
        )}
      </div>

      {/* Progress & Time Estimation */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Progress & Time Estimation
        </h2>

        <div className="space-y-6">
          {/* Progress Bar */}
          {typeof metadata?.progress === "number" && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Print Progress</span>
                <span className="font-semibold text-foreground">
                  {metadata.progress}%
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-primary to-magenta h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${metadata.progress}%` }}
                ></div>
              </div>
              {typeof metadata?.last_progress_message === "string" && (
                <p className="text-xs text-muted-foreground mt-1">
                  {metadata.last_progress_message}
                </p>
              )}
            </div>
          )}

          {/* Time Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Estimated Time */}
            {metadata?.estimated_time_seconds && (
              <div className="bg-primary/10 rounded-2xl p-4 border border-primary/20">
                <p className="text-sm text-primary mb-1">
                  Estimated Print Time
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {typeof metadata.estimated_time_seconds === "number" &&
                    formatTime(metadata.estimated_time_seconds)}
                </p>
                <p className="text-xs text-primary/70 mt-1">
                  Based on model dimensions and scale
                </p>
              </div>
            )}

            {/* Elapsed Time */}
            {job.startedAt && (
              <div className="bg-lime/10 rounded-2xl p-4 border border-lime/20">
                <p className="text-sm text-lime mb-1">Elapsed Time</p>
                <p className="text-lg font-semibold text-foreground">
                  {formatTime(calculateElapsedTime(job.startedAt) || 0)}
                </p>
                <p className="text-xs text-lime/70 mt-1">
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
              <div className="bg-magenta/10 rounded-2xl p-4 border border-magenta/20">
                <p className="text-sm text-magenta mb-1">
                  Estimated Remaining
                </p>
                <p className="text-lg font-semibold text-foreground">
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
                <p className="text-xs text-magenta/70 mt-1">
                  {job.metadata?.progress
                    ? "Based on current progress"
                    : "Based on initial estimate"}
                </p>
              </div>
            )}

            {/* Status-specific messages */}
            {!job.startedAt && job.metadata?.estimated_time_seconds && (
              <div className="bg-secondary rounded-2xl p-4 border border-border">
                <p className="text-sm text-muted-foreground mb-1">Print Not Started</p>
                <p className="text-lg font-semibold text-foreground">
                  Waiting to begin
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Estimated:{" "}
                  {typeof metadata?.estimated_time_seconds === "number"
                    ? formatTime(metadata.estimated_time_seconds)
                    : "Unknown"}
                </p>
              </div>
            )}
          </div>

          {/* Status Timeline */}
          <div className="pt-4 border-t border-border">
            <p className="text-sm font-semibold text-foreground mb-3">
              Status Timeline
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span className="text-foreground">
                  {new Date(job.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {job.startedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Print Started</span>
                  <span className="text-foreground">
                    {new Date(job.startedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
              {job.completedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="text-foreground">
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
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Print Settings
          </h2>
          <div className="space-y-3">
            {Object.entries(job.metadata).map(([key, value]) => (
              <div
                key={key}
                className="flex justify-between py-2 border-b border-border"
              >
                <span className="text-muted-foreground capitalize">{key}:</span>
                <span className="font-medium text-foreground">
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
          onClick={() => router.push("/dashboard/customer" as any)}
          className="flex-1 border border-border hover:bg-secondary text-foreground font-medium py-3 px-4 rounded-xl transition-colors"
        >
          Back to Dashboard
        </button>
        <button
          onClick={() => router.push("/dashboard/customer" as any)}
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-4 rounded-xl transition-colors glow-cyan"
        >
          Create New Job
        </button>
      </div>
    </div>
  );
}
