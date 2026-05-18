"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { listCustomerJobs, type JobDetail } from "@/lib/api/customer-jobs";
import { AlertCircle, Loader, CheckCircle, Clock, Plus, Zap, Box, ArrowRight } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import toast from "react-hot-toast";

const statusConfig: Record<string, { bg: string; text: string; label: string; icon: React.ReactNode; glow: string }> = {
  pending_owner_approval: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    label: "Awaiting Approval",
    icon: <Clock className="w-3.5 h-3.5" />,
    glow: "shadow-amber-500/10",
  },
  pending: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-400",
    label: "Approved",
    icon: <Clock className="w-3.5 h-3.5" />,
    glow: "shadow-yellow-500/10",
  },
  queued: {
    bg: "bg-primary/10",
    text: "text-primary",
    label: "Queued",
    icon: <Clock className="w-3.5 h-3.5" />,
    glow: "shadow-primary/10",
  },
  printing: {
    bg: "bg-magenta/10",
    text: "text-magenta",
    label: "Printing",
    icon: <Zap className="w-3.5 h-3.5 animate-pulse" />,
    glow: "shadow-magenta/10",
  },
  completed: {
    bg: "bg-lime/10",
    text: "text-lime",
    label: "Completed",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    glow: "shadow-lime/10",
  },
  failed: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    label: "Failed",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    glow: "shadow-destructive/10",
  },
  cancelled: {
    bg: "bg-secondary",
    text: "text-muted-foreground",
    label: "Cancelled",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    glow: "",
  },
};

export default function CustomerJobsPage() {
  const { data: session } = useSession();
  const [jobs, setJobs] = useState<JobDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    async function loadJobs() {
      try {
        if (isInitialLoad.current) setLoading(true);
        setError(null);
        const data = await listCustomerJobs(session?.accessToken);
        setJobs(data.jobs || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load jobs";
        setError(message);
        if (isInitialLoad.current) toast.error(message);
      } finally {
        setLoading(false);
        isInitialLoad.current = false;
      }
    }

    if (session?.accessToken) {
      loadJobs();
      pollIntervalRef.current = setInterval(() => loadJobs(), 5000);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [session?.accessToken]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter-hero leading-[0.95] mb-2">
            Job <span className="slant-highlight slant-highlight-lime text-black">Status</span>
          </h1>
          <p className="text-muted-foreground">
            Track all your 3D printing jobs in real-time
          </p>
        </div>
        <Link
          href="/dashboard/customer"
          className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground font-bold rounded-xl transition-all hover:scale-105 glow-cyan shrink-0"
        >
          <Plus className="w-5 h-5" />
          New Job
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-xl border border-primary/20 flex items-center justify-center animate-pulse">
              <Loader className="w-6 h-6 text-primary animate-spin" />
            </div>
            <p className="text-muted-foreground text-sm font-mono">Loading your jobs...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6 flex gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-destructive font-medium">Error loading jobs</p>
            <p className="text-destructive/80 text-sm">{error}</p>
          </div>
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <div className="flex justify-center mb-4">
            <Box className="w-12 h-12 text-muted-foreground/50" />
          </div>
          <p className="text-foreground text-lg font-bold mb-2">No jobs yet</p>
          <p className="text-muted-foreground mb-6">
            Create your first 3D printing job to get started
          </p>
          <Link
            href="/dashboard/customer"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-3 rounded-xl transition-colors font-bold glow-cyan"
          >
            <Plus className="w-5 h-5" />
            Create Job
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => {
            const info = statusConfig[job.status] || statusConfig.pending;
            const createdDate = new Date(job.createdAt).toLocaleDateString();
            const createdTime = new Date(job.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <Link
                key={job.id}
                href={`${ROUTES.dashboardAreas.customerJobs}/${job.id}` as any}
              >
                <div className="group bg-card rounded-2xl border border-border p-5 transition-all hover:border-primary/30 hover:shadow-[0_0_30px_rgba(0,240,255,0.06)] cursor-pointer">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {job.name || job.file.originalName}
                      </h2>
                      {job.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {job.description}
                        </p>
                      )}
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${info.bg} ${info.text} shrink-0`}>
                      {info.icon}
                      {info.label}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">File</p>
                        <p className="text-sm font-medium text-foreground truncate max-w-[180px]">
                          {job.file.originalName}
                        </p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Size</p>
                        <p className="text-sm font-medium text-foreground">
                          {(parseFloat(job.file.size) / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <div className="hidden md:block">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Created</p>
                        <p className="text-sm font-medium text-foreground">
                          {createdDate} at {createdTime}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-primary font-bold group-hover:gap-2 transition-all shrink-0">
                      Details
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
