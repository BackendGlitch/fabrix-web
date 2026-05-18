"use client";

import Link from "next/link";
import {
  Clock,
  Loader,
  CheckCircle,
  AlertCircle,
  Layers,
  Box,
  Timer,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { JobDetail } from "@/lib/api/customer-jobs";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode; gradient: string }> = {
  pending_owner_approval: {
    label: "Awaiting Approval",
    color: "text-amber-400",
    icon: <Clock className="w-3.5 h-3.5" />,
    gradient: "from-amber-400/20 to-orange-500/5",
  },
  pending: {
    label: "Approved",
    color: "text-yellow-400",
    icon: <Clock className="w-3.5 h-3.5" />,
    gradient: "from-yellow-400/20 to-yellow-600/5",
  },
  queued: {
    label: "Queued",
    color: "text-primary",
    icon: <Layers className="w-3.5 h-3.5" />,
    gradient: "from-primary/20 to-cyan-600/5",
  },
  printing: {
    label: "Printing",
    color: "text-magenta",
    icon: <Zap className="w-3.5 h-3.5 animate-pulse" />,
    gradient: "from-magenta/20 to-pink-600/5",
  },
  completed: {
    label: "Completed",
    color: "text-lime",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    gradient: "from-lime/20 to-green-600/5",
  },
  failed: {
    label: "Failed",
    color: "text-destructive",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    gradient: "from-red-500/20 to-red-900/5",
  },
};

interface JobCardProps {
  job: JobDetail;
  index?: number;
}

function ModelPreviewPlaceholder({ job }: { job: JobDetail }) {
  const name = job.name || job.file?.originalName || "Untitled";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="relative w-full h-48 bg-gradient-to-br from-secondary to-background flex items-center justify-center overflow-hidden">
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `linear-gradient(rgba(0,240,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
      />
      {/* Glowing center */}
      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <span className="text-3xl font-black text-primary">{initial}</span>
        </div>
        <span className="text-xs text-muted-foreground font-mono">STL</span>
      </div>
      {/* Corner glow */}
      <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
      <div className="absolute -top-8 -left-8 w-24 h-24 bg-magenta/5 rounded-full blur-2xl" />
    </div>
  );
}

function ETAProgress({ job }: { job: JobDetail }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate progress calculation based on job metadata or status
    const metadata = job.metadata as any;
    const estimatedMinutes = metadata?.estimatedPrintTimeMinutes ?? 120;
    const startedAt = job.startedAt ? new Date(job.startedAt) : null;

    if (!startedAt || job.status === "completed" || job.status === "failed") {
      setProgress(job.status === "completed" ? 100 : job.status === "failed" ? 0 : 0);
      return;
    }

    const elapsed = (Date.now() - startedAt.getTime()) / 1000 / 60;
    const pct = Math.min(100, Math.max(0, (elapsed / estimatedMinutes) * 100));
    setProgress(pct);

    const interval = setInterval(() => {
      const newElapsed = (Date.now() - startedAt.getTime()) / 1000 / 60;
      const newPct = Math.min(100, Math.max(0, (newElapsed / estimatedMinutes) * 100));
      setProgress(newPct);
    }, 30000);

    return () => clearInterval(interval);
  }, [job]);

  const isDone = progress >= 100;
  const opacity = isDone ? 1 : Math.max(0.3, 1 - progress / 200);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground flex items-center gap-1">
          <Timer className="w-3 h-3" />
          Progress
        </span>
        <span className={isDone ? "text-lime font-bold" : "text-primary font-mono"}>
          {isDone ? "DONE" : `${Math.round(progress)}%`}
        </span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${progress}%`,
            background: isDone
              ? "linear-gradient(90deg, #ccff00, #4ade80)"
              : "linear-gradient(90deg, #00f0ff, #a855f7)",
            boxShadow: isDone ? "0 0 10px rgba(204,255,0,0.5)" : "0 0 10px rgba(0,240,255,0.3)",
          }}
        />
      </div>
    </div>
  );
}

export function JobCard({ job, index = 0 }: JobCardProps) {
  const config = statusConfig[job.status] || statusConfig.pending_owner_approval;
  const createdDate = new Date(job.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <Link href={`/dashboard/customer/jobs/${job.id}` as any}>
      <div
        className={`group relative rounded-2xl border border-border bg-card overflow-hidden card-tilt cursor-pointer`}
        style={{
          animationDelay: `${index * 100}ms`,
        }}
      >
        {/* Glow border on hover */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            boxShadow: "inset 0 0 0 1px rgba(0,240,255,0.2), 0 0 30px rgba(0,240,255,0.08)"
          }}
        />

        {/* Model Preview */}
        <ModelPreviewPlaceholder job={job} />

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-bold text-foreground truncate text-lg tracking-tight">
                {job.name || job.file?.originalName || "Untitled Model"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                {job.id.slice(0, 8)}... · {createdDate}
              </p>
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r ${config.gradient} border border-border ${config.color} shrink-0`}>
              {config.icon}
              {config.label}
            </div>
          </div>

          {/* ETA / Progress */}
          <ETAProgress job={job} />

          {/* Footer Stats */}
          <div className="flex items-center gap-4 pt-2 border-t border-border">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Box className="w-3.5 h-3.5 text-primary/60" />
              <span className="font-mono">
                {(job.metadata as any)?.dimensions
                  ? `${((job.metadata as any).dimensions.width * (job.metadata as any).dimensions.height * (job.metadata as any).dimensions.depth / 1000).toFixed(1)}cm³`
                  : "—"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Layers className="w-3.5 h-3.5 text-magenta/60" />
              <span className="font-mono">
                {(job.metadata as any)?.estimatedPrintTimeMinutes
                  ? `${Math.ceil((job.metadata as any).estimatedPrintTimeMinutes / 60)}h`
                  : "—"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
              <span className="font-bold text-foreground">
                {(job.metadata as any)?.totalPrice
                  ? `${Math.ceil((job.metadata as any).totalPrice)} TND`
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
