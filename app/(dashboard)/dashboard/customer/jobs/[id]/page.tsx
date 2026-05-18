"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { JobDetailView } from "@/components/customer/job-detail-view";
import { ROUTES } from "@/lib/routes";
import Link from "next/link";
import { ArrowLeft, Loader } from "lucide-react";

function JobDetailSkeleton() {
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

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={ROUTES.dashboardAreas.customerJobs as any}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Back to Jobs
      </Link>

      <Suspense fallback={<JobDetailSkeleton />}>
        <JobDetailView jobId={jobId} />
      </Suspense>
    </div>
  );
}
