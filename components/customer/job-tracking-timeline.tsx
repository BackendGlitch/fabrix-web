"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { getJobTracking, type JobTrackingResponse } from "@/lib/api/customer-jobs";
import { useCustomerWebSocket } from "@/lib/websocket/customer-websocket";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader,
  Zap,
  Wifi,
  WifiOff,
} from "lucide-react";
import toast from "react-hot-toast";

interface JobTrackingTimelineProps {
  jobId: string;
}

const statusColors: Record<
  string,
  { bg: string; text: string; icon: React.ReactNode; badge: string }
> = {
  pending_owner_approval: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    icon: <Clock className="w-5 h-5" />,
    badge: "bg-amber-100 text-amber-800",
  },
  pending: {
    bg: "bg-yellow-50",
    text: "text-yellow-800",
    icon: <Clock className="w-5 h-5" />,
    badge: "bg-yellow-100 text-yellow-800",
  },
  queued: {
    bg: "bg-blue-50",
    text: "text-blue-800",
    icon: <Clock className="w-5 h-5" />,
    badge: "bg-blue-100 text-blue-800",
  },
  printing: {
    bg: "bg-purple-50",
    text: "text-purple-800",
    icon: <Loader className="w-5 h-5 animate-spin" />,
    badge: "bg-purple-100 text-purple-800",
  },
  completed: {
    bg: "bg-green-50",
    text: "text-green-800",
    icon: <CheckCircle className="w-5 h-5" />,
    badge: "bg-green-100 text-green-800",
  },
  failed: {
    bg: "bg-red-50",
    text: "text-red-800",
    icon: <AlertCircle className="w-5 h-5" />,
    badge: "bg-red-100 text-red-800",
  },
  cancelled: {
    bg: "bg-gray-50",
    text: "text-gray-800",
    icon: <AlertCircle className="w-5 h-5" />,
    badge: "bg-gray-100 text-gray-800",
  },
};

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

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getEventLabel(type: string): string {
  const labels: Record<string, string> = {
    progress: "Progress Update",
    completed: "Job Completed",
    failed: "Job Failed",
    status_change: "Status Changed",
    queued: "Queued",
    printing: "Started Printing",
  };
  return labels[type] || type;
}

export function JobTrackingTimeline({ jobId }: JobTrackingTimelineProps) {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;
  const [tracking, setTracking] = useState<JobTrackingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<
    "live" | "reconnecting" | "polling" | "disconnected"
  >("polling");
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoad = useRef(true);

  const loadTracking = async () => {
    try {
      const data = await getJobTracking(jobId, accessToken || "");
      setTracking(data);

      if (isInitialLoad.current) {
        setLoading(false);
        isInitialLoad.current = false;
      }

      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load tracking data";
      if (isInitialLoad.current) {
        setError(message);
        setLoading(false);
        isInitialLoad.current = false;
      }
      console.error("[JobTracking] Error loading tracking:", err);
    }
  };

  // WEB-07: Set up WebSocket with polling fallback
  const { isConnected } = useCustomerWebSocket({
    accessToken,
    enabled: !!accessToken,
    callbacks: {
      onJobUpdate: (jobIdUpdate, updateType, data) => {
        if (jobIdUpdate === jobId) {
          // Update tracking state with new progress
          setTracking((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              current: {
                ...prev.current,
                progress: data.progress ?? prev.current.progress,
                status: data.status ?? prev.current.status,
                currentLayer: data.currentLayer ?? prev.current.currentLayer,
                totalLayers: data.totalLayers ?? prev.current.totalLayers,
                etaMinutes: data.etaMinutes ?? prev.current.etaMinutes,
              },
            };
          });

          // Update connection state
          if (wsConnected) {
            setConnectionState("live");
          }
        }
      },
      onConnected: () => {
        console.log("[JobTracking] WebSocket connected");
        setWsConnected(true);
        setConnectionState("live");
      },
      onDisconnected: () => {
        console.log("[JobTracking] WebSocket disconnected, using polling fallback");
        setWsConnected(false);
        setConnectionState("polling");
      },
      onError: (error) => {
        console.error("[JobTracking] WebSocket error:", error);
        setConnectionState("reconnecting");
      },
    },
  });

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    // Initial load
    loadTracking();

    // Poll for updates every 3 seconds as fallback
    // WebSocket provides real-time updates when available
    pollIntervalRef.current = setInterval(() => {
      loadTracking();
    }, 3000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [jobId, accessToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-sm text-gray-600">Loading tracking data...</p>
        </div>
      </div>
    );
  }

  if (error || !tracking) {
    return (
      <div className={`rounded-lg p-6 ${statusColors.failed.bg}`}>
        <div className="flex items-center gap-3">
          <AlertCircle className={`w-5 h-5 ${statusColors.failed.text}`} />
          <div>
            <h3 className={`font-semibold ${statusColors.failed.text}`}>
              Failed to load tracking
            </h3>
            <p className={`text-sm ${statusColors.failed.text}`}>
              {error || "No tracking data available"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { current, timeline } = tracking;
  const statusConfig =
    statusColors[current.status] || statusColors.pending;

  return (
    <div className="space-y-6">
      {/* Connection State Banner */}
      <div
        className={`rounded-lg p-4 flex items-center gap-3 ${
          connectionState === "live"
            ? "bg-green-50 text-green-800"
            : connectionState === "reconnecting"
              ? "bg-amber-50 text-amber-800"
              : "bg-gray-50 text-gray-700"
        }`}
      >
        {connectionState === "live" ? (
          <Wifi className="w-4 h-4 text-green-600" />
        ) : connectionState === "reconnecting" ? (
          <AlertCircle className="w-4 h-4 text-amber-600 animate-pulse" />
        ) : (
          <WifiOff className="w-4 h-4 text-gray-600" />
        )}
        <span className="text-sm font-medium">
          {connectionState === "live"
            ? "Live Updates - Connected"
            : connectionState === "reconnecting"
              ? "Reconnecting... Using polling"
              : "Polling for updates"}
        </span>
      </div>

      {/* Current Status Card */}
      <div className={`rounded-lg p-6 ${statusConfig.bg}`}>
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            {statusConfig.icon}
            <div>
              <h2 className={`text-2xl font-bold ${statusConfig.text}`}>
                {current.progress}%
              </h2>
              <p className={`text-sm ${statusConfig.text} opacity-75`}>
                Complete
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusConfig.badge}`}>
            {current.status.replace(/_/g, " ")}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                current.status === "completed"
                  ? "bg-green-600"
                  : current.status === "failed"
                    ? "bg-red-600"
                    : "bg-blue-600"
              }`}
              style={{ width: `${current.progress}%` }}
            />
          </div>
        </div>

        {/* Progress Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`${statusConfig.text}`}>
            <p className="text-xs opacity-75 mb-1">Current Layer</p>
            <p className="text-lg font-semibold">
              {current.currentLayer} / {current.totalLayers}
            </p>
          </div>

          <div className={`${statusConfig.text}`}>
            <p className="text-xs opacity-75 mb-1">Time Remaining</p>
            <p className="text-lg font-semibold">
              {current.etaMinutes > 0 ? `${current.etaMinutes}m` : "Done"}
            </p>
          </div>

          <div className={`${statusConfig.text}`}>
            <p className="text-xs opacity-75 mb-1">Last Updated</p>
            <p className="text-xs font-mono break-words">
              {formatDateTime(current.timestamp)}
            </p>
          </div>

          <div className={`${statusConfig.text}`}>
            <p className="text-xs opacity-75 mb-1">Connection</p>
            <p className="text-xs font-semibold">
              {connectionState === "live" ? "🔴 Live" : "📊 Polling"}
            </p>
          </div>
        </div>
      </div>

      {/* Event Timeline */}
      {timeline && timeline.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Event Timeline
          </h3>
          <div className="space-y-3">
            {timeline.map((event, index) => {
              const eventData = (event.data || {}) as any;
              const isProgressEvent = event.type === "progress";
              const isTerminalEvent = ["completed", "failed"].includes(
                event.type,
              );

              return (
                <div
                  key={index}
                  className={`rounded-lg border-l-4 p-4 ${
                    isTerminalEvent && event.type === "completed"
                      ? "border-l-green-500 bg-green-50"
                      : isTerminalEvent && event.type === "failed"
                        ? "border-l-red-500 bg-red-50"
                        : isProgressEvent
                          ? "border-l-blue-500 bg-blue-50"
                          : "border-l-gray-400 bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900">
                        {getEventLabel(event.type)}
                      </p>

                      {/* Progress Event Details */}
                      {isProgressEvent && (
                        <div className="mt-2 space-y-1 text-xs text-gray-700">
                          <p>
                            Progress: {(eventData.progress as number) || 0}%
                          </p>
                          <p>
                            Layer: {(eventData.currentLayer as number) || 0} /{" "}
                            {(eventData.totalLayers as number) || 0}
                          </p>
                          <p>
                            ETA: {(eventData.etaMinutes as number) || 0} minutes
                          </p>
                        </div>
                      )}

                      {/* Failure Event Details */}
                      {event.type === "failed" && (
                        <p className="mt-1 text-xs text-red-700 font-medium">
                          {(eventData.errorMessage as string) ||
                            eventData.message ||
                            "Job failed"}
                        </p>
                      )}

                      {/* Completion Event Details */}
                      {event.type === "completed" && (
                        <p className="mt-1 text-xs text-green-700 font-medium">
                          {(eventData.message as string) ||
                            "Job completed successfully"}
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDateTime(event.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty Timeline */}
      {(!timeline || timeline.length === 0) && (
        <div className="rounded-lg bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-600">
            No events yet. Updates will appear here as the job progresses.
          </p>
        </div>
      )}
    </div>
  );
}
