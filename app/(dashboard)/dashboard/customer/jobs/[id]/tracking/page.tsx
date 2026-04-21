"use client";

import { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { JobTrackingTimeline } from "@/components/customer/job-tracking-timeline";
import { ROUTES } from "@/lib/routes";
import Link from "next/link";
import { ArrowLeft, Home, Package, Loader, LogOut, Zap } from "lucide-react";

const roleLabels: Record<string, string> = {
  OWNER: "Property Owner",
  CUSTOMER: "Customer",
  ADMIN: "Administrator",
};

interface NavLink {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
}

const navLinks: NavLink[] = [
  {
    label: "Dashboard",
    href: ROUTES.dashboard,
    icon: <Home className="w-5 h-5" />,
    roles: ["CUSTOMER"],
  },
  {
    label: "Jobs",
    href: ROUTES.dashboardAreas.customerJobs,
    icon: <Package className="w-5 h-5" />,
    roles: ["CUSTOMER"],
  },
];

function TrackingContent({ jobId }: { jobId: string }) {
  return <JobTrackingTimeline jobId={jobId} />;
}

function TrackingSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-96">
      <div className="text-center space-y-4">
        <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600" />
        <p className="text-gray-600">Loading tracking data...</p>
      </div>
    </div>
  );
}

export default function JobTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const { data: session } = useSession();
  const roleLabel = session
    ? (roleLabels[session.user.role] ?? session.user.role)
    : "";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-bold text-gray-900">Fabrix</h1>
              <nav className="hidden md:flex gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href as any}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                      link.href === ROUTES.dashboard
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {session?.user.name}
                </p>
                <p className="text-xs text-gray-500">{roleLabel}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: ROUTES.auth.login })}
                className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb and Back Button */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() =>
              router.push(
                `${ROUTES.dashboardAreas.customerJobs}/${jobId}`,
              )
            }
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Job Details
          </button>
        </div>

        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Job Tracking</h2>
          <p className="text-gray-600 mt-2">
            Real-time progress updates for job {jobId}
          </p>
        </div>

        {/* Tracking Timeline */}
        <Suspense fallback={<TrackingSkeleton />}>
          <TrackingContent jobId={jobId} />
        </Suspense>
      </main>
    </div>
  );
}
