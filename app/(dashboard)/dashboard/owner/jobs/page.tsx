"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

import { LogoutButton } from "@/components/auth/logout-button";
import { ROUTES } from "@/lib/routes";
import {
  fetchPendingJobs,
  approveJob,
  rejectJob,
  type JobDetail,
} from "@/lib/api/owner-jobs";
import { useOwnerWebSocketWithSession } from "@/lib/websocket/owner-websocket";

export default function OwnerJobsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const accessToken = session?.accessToken;
  const isOwner = session?.user.role === "OWNER";

  const [jobs, setJobs] = useState<JobDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingJobId, setApprovingJobId] = useState<string | null>(null);
  const [rejectingJobId, setRejectingJobId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Check authentication and role
  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/auth/login");
      return;
    }

    if (!isOwner) {
      router.push("/dashboard");
      return;
    }
  }, [session, status, router, isOwner]);

  const loadJobs = useCallback(async () => {
    // Don't load jobs if not authenticated as owner
    if (status === "loading" || !isOwner || !accessToken) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await fetchPendingJobs(accessToken);
      setJobs(result.jobs);

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load pending jobs:", err);
      setError(
        err instanceof Error
          ? `Failed to load jobs: ${err.message}. Please check your connection and try again.`
          : "Failed to load pending jobs. Please ensure you're connected to the internet and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [status, isOwner, accessToken]);

  const upsertPendingJob = useCallback((incomingJob: JobDetail) => {
    setJobs((prevJobs) => {
      const existingIndex = prevJobs.findIndex((job) => job.id === incomingJob.id);
      if (existingIndex === -1) {
        return [incomingJob, ...prevJobs];
      }

      const nextJobs = [...prevJobs];
      nextJobs[existingIndex] = incomingJob;
      return nextJobs;
    });
    setLastUpdated(new Date());
  }, []);

  // WebSocket for real-time job updates
  useOwnerWebSocketWithSession(
    session,
    {
      onNewPendingJobs: (jobCount, message, job) => {
        if (job?.status === "pending_owner_approval") {
          upsertPendingJob(job);
          toast.success(`New pending job: ${job.name}`);
          return;
        }

        toast.success(message || `${jobCount} pending job(s) updated`);
      },
      onJobStatusUpdate: (jobId, status, action) => {
        console.log(`Job ${jobId} ${action} (status: ${status})`);

        // Keep this page focused strictly on pending approvals.
        if (status !== "pending_owner_approval") {
          setJobs((prevJobs) => prevJobs.filter((job) => job.id !== jobId));
          setLastUpdated(new Date());

          if (action === "approved" || action === "rejected") {
            toast.success(`Job ${jobId.slice(0, 8)}... ${action} successfully`);
          }
        }
      },
      onConnected: () => {
        console.log("Owner WebSocket connected");
      },
      onDisconnected: () => {
        console.log("Owner WebSocket disconnected");
      },
    },
  );

  // Manual refresh only - no auto-refresh to prevent UI flashing

  useEffect(() => {
    if (status === "loading") return;
    if (!isOwner || !accessToken) return;

    loadJobs();
  }, [loadJobs, status, isOwner, accessToken]);

  // Manual refresh only - no auto-refresh to prevent UI flashing

  const handleApprove = async (jobId: string) => {
    if (
      !confirm(
        "Approve this job for printing? It will be sent to your agent for execution.",
      )
    ) {
      return;
    }

    // Optimistic update
    const jobToApprove = jobs.find((job) => job.id === jobId);
    if (jobToApprove) {
      setJobs((prevJobs) => prevJobs.filter((job) => job.id !== jobId));
    }

    try {
      setApprovingJobId(jobId);

      await approveJob(jobId, accessToken);
      toast.success(
        `Job "${jobToApprove?.name || jobId.slice(0, 8)}" approved! Job has been queued and will be sent to your agent for printing.`,
      );

    } catch (err) {
      console.error("Failed to approve job:", err);

      // Revert optimistic update on error
      if (jobToApprove) {
        setJobs((prevJobs) => [...prevJobs, jobToApprove]);
      }

      // Show error toast
      toast.error(
        `Failed to approve job: ${err instanceof Error ? err.message : "Unknown error"}. Please try again or contact support if the issue persists.`,
      );
    } finally {
      setApprovingJobId(null);
    }
  };

  const handleReject = async (jobId: string) => {
    if (
      !confirm(
        "Are you sure you want to reject this job? It will be returned to the queue for another printer.",
      )
    ) {
      return;
    }

    // Optimistic update
    const jobToReject = jobs.find((job) => job.id === jobId);
    if (jobToReject) {
      setJobs((prevJobs) => prevJobs.filter((job) => job.id !== jobId));
    }

    try {
      setRejectingJobId(jobId);

      await rejectJob(jobId, accessToken);
      toast.success(
        `Job "${jobToReject?.name || jobId.slice(0, 8)}" rejected! Job has been returned to the queue and will be available for other printers.`,
      );

    } catch (err) {
      console.error("Failed to reject job:", err);

      // Revert optimistic update on error
      if (jobToReject) {
        setJobs((prevJobs) => [...prevJobs, jobToReject]);
      }

      // Show error toast
      toast.error(
        `Failed to reject job: ${err instanceof Error ? err.message : "Unknown error"}. Please try again or contact support if the issue persists.`,
      );
    } finally {
      setRejectingJobId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (size: string) => {
    const bytes = parseInt(size, 10);
    if (isNaN(bytes)) return size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const jobCount = jobs.length;

  // Show loading while checking session
  if (status === "loading") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 px-4 py-10">
        <section className="mx-auto max-w-5xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600">Checking authentication...</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // Don't render anything if not authenticated as owner (redirect will happen)
  if (!session || session.user.role !== "OWNER") {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 px-4 py-10">
      <section className="mx-auto max-w-5xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Pending Job Approvals
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Review and approve or reject 3D print jobs submitted to your
              printers. Jobs must be approved before they can be sent to your
              agents.
            </p>
            {jobCount > 0 && !loading && !error && (
              <p className="mt-1 text-sm font-medium text-blue-600">
                {jobCount} job{jobCount === 1 ? "" : "s"} waiting for approval
              </p>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <div className="text-xs text-gray-500 mr-2">
              {lastUpdated && (
                <span>
                  Last updated:{" "}
                  {lastUpdated.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
            <button
              onClick={() => loadJobs()}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
            <LogoutButton />
          </div>
        </div>

        {/* Toast notifications will handle success/error messages */}

        {loading ? (
          <div className="mt-6 rounded-md border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
            <p className="font-medium">Loading pending jobs…</p>
          </div>
        ) : error ? (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-900">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="font-medium text-red-900">Unable to load jobs</p>
                <p className="mt-1 text-red-800">{error}</p>
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-red-700 font-medium">
                    Troubleshooting steps:
                  </p>
                  <ul className="text-xs text-red-700 space-y-1 ml-4 list-disc">
                    <li>Check your internet connection</li>
                    <li>Verify the backend server is running</li>
                    <li>Ensure you have owner permissions</li>
                    <li>Try refreshing the page or logging out and back in</li>
                  </ul>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => loadJobs()}
                    className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Try loading again
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="rounded border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    Refresh page
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : jobCount === 0 ? (
          <div className="mt-6 rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 px-6 py-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                All caught up!
              </h3>
              <p className="text-gray-600 mb-6">
                No pending jobs require your approval right now. When customers
                submit print jobs to your printers, they'll appear here for
                review.
              </p>
              <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                <h4 className="font-medium text-gray-900 mb-2">
                  What to expect:
                </h4>
                <ul className="text-sm text-gray-600 space-y-1 text-left">
                  <li className="flex items-start">
                    <svg
                      className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>
                      Jobs appear here when customers upload STL files to your
                      printers
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>
                      You'll see customer name, file details, and estimated
                      print time
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>
                      Approve jobs to send them to your agent for printing
                    </span>
                  </li>
                </ul>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => loadJobs()}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Check for new jobs
                </button>
                <Link
                  href={ROUTES.dashboardAreas.ownerAgents}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  View your printers
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Jobs waiting for approval
            </h2>
            <p className="text-sm text-gray-600">
              Each job below has been assigned to one of your printers and
              requires your approval before printing.
            </p>

            <div className="space-y-4">
              {jobs.map((job) => (
                <article
                  key={job.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {job.name}
                        </h3>
                        {job.description && (
                          <p className="mt-1 text-sm text-gray-600">
                            {job.description}
                          </p>
                        )}
                      </div>
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                        Pending approval
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
                      <div>
                        <p className="font-medium text-gray-700">Customer</p>
                        <p className="text-gray-900">
                          {job.customerName || "Unknown customer"}
                        </p>
                        <p className="text-xs text-gray-500">
                          Customer ID: {job.customerId.slice(0, 8)}…
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">
                          File details
                        </p>
                        <p className="text-gray-900">{job.file.originalName}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(job.file.size)} • Uploaded{" "}
                          {formatDate(job.file.uploadedAt)}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">
                          Assigned Printer
                        </p>
                        <p className="text-gray-900">
                          {job.printerDisplayName || "No printer assigned"}
                        </p>
                        <p className="text-xs text-gray-500">
                          Printer ID:{" "}
                          {job.printerId
                            ? job.printerId.slice(0, 8) + "…"
                            : "Not assigned"}
                        </p>
                      </div>
                    </div>

                    {job.metadata && (
                      <div className="rounded-md bg-gray-50 p-3 text-sm">
                        <p className="font-medium text-gray-700">
                          Job metadata
                        </p>
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs text-gray-600">
                          {JSON.stringify(job.metadata, null, 2)}
                        </pre>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
                      <div className="text-xs text-gray-500">
                        <p>Created: {formatDate(job.createdAt)}</p>
                        <p>Job ID: {job.id.slice(0, 8)}…</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(job.id)}
                          disabled={
                            rejectingJobId === job.id ||
                            approvingJobId === job.id
                          }
                          className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {rejectingJobId === job.id
                            ? "Rejecting..."
                            : "Reject"}
                        </button>
                        <button
                          onClick={() => handleApprove(job.id)}
                          disabled={
                            approvingJobId === job.id ||
                            rejectingJobId === job.id
                          }
                          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {approvingJobId === job.id
                            ? "Approving..."
                            : "Approve for printing"}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-6">
          <div>
            <Link
              href={ROUTES.dashboardAreas.ownerAgents}
              className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <svg
                className="mr-1.5 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Agent Management
            </Link>
          </div>
          <div className="text-sm text-gray-600">
            <Link
              href={ROUTES.dashboard}
              className="font-medium text-gray-900 hover:text-gray-700"
            >
              Dashboard
            </Link>
            {" • "}
            <span className="text-gray-500">Pending Jobs</span>
          </div>
        </div>
      </section>
    </main>
  );
}
