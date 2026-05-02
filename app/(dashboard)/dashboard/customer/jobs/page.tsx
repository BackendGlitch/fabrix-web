"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { listCustomerJobs, type JobDetail } from "@/lib/api/customer-jobs";
import { AlertCircle, Loader, CheckCircle, Clock, Plus, Home, Zap, LogOut } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import toast from "react-hot-toast";

const statusColors: Record<
  string,
  { bg: string; text: string; label: string; icon: React.ReactNode }
> = {
  pending_owner_approval: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    label: "Awaiting Approval",
    icon: <Clock className="w-4 h-4" />,
  },
  pending: {
    bg: "bg-yellow-50",
    text: "text-yellow-800",
    label: "Approved",
    icon: <Clock className="w-4 h-4" />,
  },
  queued: {
    bg: "bg-blue-50",
    text: "text-blue-800",
    label: "Queued",
    icon: <Clock className="w-4 h-4" />,
  },
  printing: {
    bg: "bg-purple-50",
    text: "text-purple-800",
    label: "Printing",
    icon: <Loader className="w-4 h-4 animate-spin" />,
  },
  completed: {
    bg: "bg-green-50",
    text: "text-green-800",
    label: "Completed",
    icon: <CheckCircle className="w-4 h-4" />,
  },
  failed: {
    bg: "bg-red-50",
    text: "text-red-800",
    label: "Failed",
    icon: <AlertCircle className="w-4 h-4" />,
  },
  cancelled: {
    bg: "bg-gray-50",
    text: "text-gray-800",
    label: "Cancelled",
    icon: <AlertCircle className="w-4 h-4" />,
  },
};

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
    label: "Job Status",
    href: ROUTES.dashboardAreas.customerJobs,
    icon: <Zap className="w-5 h-5" />,
    roles: ["CUSTOMER"],
  },
];

export default function CustomerJobsPage() {
  const { data: session } = useSession();
  const [jobs, setJobs] = useState<JobDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoad = useRef(true);
  const roleLabel = session
    ? (roleLabels[session.user.role] ?? session.user.role)
    : "";

  useEffect(() => {
    async function loadJobs() {
      try {
        if (isInitialLoad.current) {
          setLoading(true);
        }
        setError(null);
        const data = await listCustomerJobs(session?.accessToken);
        setJobs(data.jobs || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load jobs";
        setError(message);
        if (isInitialLoad.current) {
          toast.error(message);
        }
      } finally {
        setLoading(false);
        isInitialLoad.current = false;
      }
    }

    if (session?.accessToken) {
      // Initial load
      loadJobs();

      // Poll for job updates every 5 seconds (fallback when WebSocket unavailable)
      pollIntervalRef.current = setInterval(() => {
        loadJobs();
      }, 5000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [session?.accessToken]);

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
                      link.href === ROUTES.dashboardAreas.customerJobs
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

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-2 py-2 overflow-x-auto">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href as any}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 whitespace-nowrap text-sm"
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Page Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Job Status</h1>
              <p className="mt-1 text-sm text-gray-600">
                Track all your 3D printing jobs in real-time
              </p>
            </div>
            <Link
              href={ROUTES.dashboard}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              New Job
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-gray-600">Loading your jobs...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Error loading jobs</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="flex justify-center mb-4">
              <Clock className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-600 text-lg font-medium mb-2">No jobs yet</p>
            <p className="text-gray-500 mb-6">
              Create your first 3D printing job to get started
            </p>
            <Link
              href={ROUTES.dashboard}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Create Job
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {jobs.map((job) => {
              const statusInfo = statusColors[job.status] || statusColors.pending;
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
                  <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {job.name || job.file.originalName}
                        </h2>
                        {job.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {job.description}
                          </p>
                        )}
                      </div>
                      <div
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bg} ${statusInfo.text}`}
                      >
                        {statusInfo.icon}
                        {statusInfo.label}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center gap-6">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">File</p>
                          <p className="text-sm font-medium text-gray-900">
                            {job.file.originalName}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Size</p>
                          <p className="text-sm font-medium text-gray-900">
                            {(parseFloat(job.file.size) / 1024 / 1024).toFixed(2)}{" "}
                            MB
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Created</p>
                          <p className="text-sm font-medium text-gray-900">
                            {createdDate} at {createdTime}
                          </p>
                        </div>
                      </div>
                      <div className="text-blue-600 group-hover:text-blue-700 font-medium">
                        View Details →
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
