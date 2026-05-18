"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Loader2, CheckCircle, XCircle, RefreshCw, Settings, ArrowDownLeft } from "lucide-react";

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
      <div className="space-y-6">
        <div className="w-12 h-12 rounded-xl border border-primary/20 flex items-center justify-center animate-pulse">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
        <p className="text-muted-foreground text-sm font-mono">Checking authentication...</p>
      </div>
    );
  }

  // Don't render anything if not authenticated as owner (redirect will happen)
  if (!session || session.user.role !== "OWNER") {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter-hero leading-[0.95] mb-2">
            Pending <span className="slant-highlight slant-highlight-amber text-black">Approvals</span>
          </h1>
          <p className="text-muted-foreground">
            Review and approve or reject 3D print jobs submitted to your
            printers. Jobs must be approved before they can be sent to your
            agents.
          </p>
          {jobCount > 0 && !loading && !error && (
            <p className="mt-1 text-sm font-bold text-primary">
              {jobCount} job{jobCount === 1 ? "" : "s"} waiting for approval
            </p>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <div className="text-xs text-muted-foreground mr-2">
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
            className="inline-flex items-center px-4 py-2 text-sm font-bold text-foreground bg-secondary hover:bg-secondary/80 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-secondary px-4 py-4 text-sm text-foreground">
          <p className="font-medium">Loading pending jobs…</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-4 text-sm text-destructive">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Unable to load jobs</p>
              <p className="mt-1 text-destructive/80">{error}</p>
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-destructive/70">
                  Troubleshooting steps:
                </p>
                <ul className="text-xs text-destructive/70 space-y-1 ml-4 list-disc">
                  <li>Check your internet connection</li>
                  <li>Verify the backend server is running</li>
                  <li>Ensure you have owner permissions</li>
                  <li>Try refreshing the page or logging out and back in</li>
                </ul>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => loadJobs()}
                  className="rounded-xl bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground hover:bg-destructive/90"
                >
                  Try loading again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-xl border border-destructive/30 bg-card px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10"
                >
                  Refresh page
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : jobCount === 0 ? (
        <div className="rounded-2xl border border-lime/20 bg-gradient-to-br from-lime/10 to-lime/5 px-6 py-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-lime/20 mb-4">
              <CheckCircle className="h-8 w-8 text-lime" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              All caught up!
            </h3>
            <p className="text-muted-foreground mb-6">
              No pending jobs require your approval right now. When customers
              submit print jobs to your printers, they'll appear here for
              review.
            </p>
            <div className="bg-card rounded-2xl border border-border p-4 mb-6">
              <h4 className="font-bold text-foreground mb-2">
                What to expect:
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 text-left">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-lime mr-2 mt-0.5 flex-shrink-0" />
                  <span>
                    Jobs appear here when customers upload STL files to your
                    printers
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-lime mr-2 mt-0.5 flex-shrink-0" />
                  <span>
                    You'll see customer name, file details, and estimated
                    print time
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-lime mr-2 mt-0.5 flex-shrink-0" />
                  <span>
                    Approve jobs to send them to your agent for printing
                  </span>
                </li>
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => loadJobs()}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl glow-cyan"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Check for new jobs
              </button>
              <Link
                href={ROUTES.dashboardAreas.ownerAgents}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold text-foreground bg-secondary hover:bg-secondary/80 rounded-xl"
              >
                <Settings className="w-4 h-4 mr-2" />
                View your printers
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">
            Jobs waiting for approval
          </h2>
          <p className="text-sm text-muted-foreground">
            Each job below has been assigned to one of your printers and
            requires your approval before printing.
          </p>

          <div className="space-y-4">
            {jobs.map((job) => (
              <article
                key={job.id}
                className="rounded-2xl border border-border bg-card p-4 transition-all hover:shadow-[0_0_30px_rgba(0,240,255,0.06)] hover:border-primary/30"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-foreground">
                        {job.name}
                      </h3>
                      {job.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {job.description}
                        </p>
                      )}
                    </div>
                    <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/20">
                      Pending approval
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
                    <div>
                      <p className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">Customer</p>
                      <p className="text-foreground">
                        {job.customerName || "Unknown customer"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ID: {job.customerId.slice(0, 8)}…
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">
                        File details
                      </p>
                      <p className="text-foreground">{job.file.originalName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(job.file.size)} • Uploaded{" "}
                        {formatDate(job.file.uploadedAt)}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">
                        Assigned Printer
                      </p>
                      <p className="text-foreground">
                        {job.printerDisplayName || "No printer assigned"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ID:{" "}
                        {job.printerId
                          ? job.printerId.slice(0, 8) + "…"
                          : "Not assigned"}
                      </p>
                    </div>
                  </div>

                  {job.metadata && (
                    <div className="rounded-xl bg-secondary p-3 text-sm">
                      <p className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">
                        Job metadata
                      </p>
                      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">
                        {JSON.stringify(job.metadata, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                    <div className="text-xs text-muted-foreground">
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
                        className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed glow-cyan"
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

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
        <div>
          <Link
            href={ROUTES.dashboardAreas.ownerAgents}
            className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowDownLeft className="mr-1.5 h-4 w-4 rotate-45" />
            Back to Agent Management
          </Link>
        </div>
        <div className="text-sm text-muted-foreground">
          <Link
            href={ROUTES.dashboard}
            className="font-medium text-foreground hover:text-primary transition-colors"
          >
            Dashboard
          </Link>
          {" • "}
          <span className="text-muted-foreground/70">Pending Jobs</span>
        </div>
      </div>
    </div>
  );
}
