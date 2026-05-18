"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { JobCard } from "@/components/customer/job-card";
import { StartPrintModal } from "@/components/customer/start-print-modal";
import { listCustomerJobs, type JobDetail } from "@/lib/api/customer-jobs";
import { ROUTES } from "@/lib/routes";
import {
  Plus,
  Box,
  Zap,
  Wallet,
  ArrowUpRight,
  Layers,
  Loader2,
} from "lucide-react";

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="absolute inset-0 grid-bg opacity-50" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-magenta/5 rounded-full blur-3xl" />

      <div className="relative z-10 space-y-8 max-w-2xl">
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center float">
            <Box className="w-12 h-12 text-primary" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-magenta/20 border border-magenta/30 flex items-center justify-center">
            <Zap className="w-4 h-4 text-magenta" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter-hero leading-[0.95]">
            <span className="block glitch-text" data-text="Nothing">
              Nothing
            </span>
            <span className="block text-muted-foreground">to print</span>
            <span className="block">
              <span className="slant-highlight slant-highlight-lime text-black">yet.</span>
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Upload your 3D model and get it printed by local makers in minutes.
          </p>
        </div>

        <button
          onClick={onStart}
          className="group relative inline-flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground font-bold text-lg rounded-2xl transition-all duration-300 hover:scale-105 glow-cyan"
        >
          <Plus className="w-6 h-6 transition-transform group-hover:rotate-90" />
          Start New Print
          <ArrowUpRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
        </button>
      </div>
    </div>
  );
}

function JobGrid({ jobs, onStart }: { jobs: JobDetail[]; onStart: () => void }) {
  return (
    <div className="space-y-8">
      <div className="relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2" />
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter-hero leading-[0.95] mb-2">
              Your{" "}
              <span className="slant-highlight slant-highlight-lime text-black">prints</span>
            </h1>
            <p className="text-muted-foreground">
              {jobs.length} active job{jobs.length !== 1 ? "s" : ""} — track progress in real-time
            </p>
          </div>
          <button
            onClick={onStart}
            className="group inline-flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground font-bold rounded-xl transition-all hover:scale-105 glow-cyan shrink-0"
          >
            <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
            New Print
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Jobs",
            value: jobs.length,
            icon: <Layers className="w-4 h-4" />,
            color: "text-primary",
          },
          {
            label: "Printing",
            value: jobs.filter((j) => j.status === "printing").length,
            icon: <Zap className="w-4 h-4" />,
            color: "text-magenta",
          },
          {
            label: "Completed",
            value: jobs.filter((j) => j.status === "completed").length,
            icon: <Box className="w-4 h-4" />,
            color: "text-lime",
          },
          {
            label: "Wallet",
            value: "View →",
            icon: <Wallet className="w-4 h-4" />,
            color: "text-primary",
            href: ROUTES.dashboardAreas.customerWallet,
          },
        ].map((stat) => (
          <div key={stat.label}>
            {stat.href ? (
              <Link
                href={stat.href as any}
                className="block p-4 rounded-2xl border border-border bg-card hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={stat.color}>{stat.icon}</span>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    {stat.label}
                  </span>
                </div>
                <p className="text-xl font-bold">{stat.value}</p>
              </Link>
            ) : (
              <div className="p-4 rounded-2xl border border-border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <span className={stat.color}>{stat.icon}</span>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    {stat.label}
                  </span>
                </div>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {jobs.map((job, i) => (
          <JobCard key={job.id} job={job} index={i} />
        ))}
      </div>
    </div>
  );
}

export default function CustomerDashboard() {
  const [jobs, setJobs] = useState<JobDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    async function loadJobs() {
      try {
        const data = await listCustomerJobs();
        setJobs(data.jobs);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    loadJobs();
  }, []);

  useEffect(() => {
    if (!modalOpen && !loading) {
      async function refresh() {
        try {
          const data = await listCustomerJobs();
          setJobs(data.jobs);
        } catch {
          // ignore
        }
      }
      refresh();
    }
  }, [modalOpen]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl border border-primary/20 flex items-center justify-center animate-pulse">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
          <p className="text-muted-foreground text-sm font-mono">
            Loading your prints...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="relative z-10">
        {jobs.length === 0 ? (
          <EmptyState onStart={() => setModalOpen(true)} />
        ) : (
          <JobGrid jobs={jobs} onStart={() => setModalOpen(true)} />
        )}
      </div>
      <StartPrintModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
