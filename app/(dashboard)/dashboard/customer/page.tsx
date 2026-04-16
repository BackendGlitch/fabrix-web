'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { listCustomerJobs, type JobDetail } from '@/lib/api/customer-jobs';
import { ROUTES } from '@/lib/routes';
import { Plus, Loader, AlertCircle, Home, Package, Users, BarChart3, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import toast from 'react-hot-toast';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  queued: 'bg-blue-100 text-blue-800',
  printing: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const roleLabels: Record<string, string> = {
  OWNER: 'Property Owner',
  CUSTOMER: 'Customer',
  ADMIN: 'Administrator',
};

interface NavLink {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
}

const navLinks: NavLink[] = [
  {
    label: 'Dashboard',
    href: ROUTES.dashboard,
    icon: <Home className="w-5 h-5" />,
    roles: ['CUSTOMER'],
  },
  {
    label: 'My Jobs',
    href: ROUTES.dashboardAreas.customerJobs,
    icon: <Package className="w-5 h-5" />,
    roles: ['CUSTOMER'],
  },
];

export default function CustomerDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [jobs, setJobs] = useState<JobDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for session to load
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push(ROUTES.auth.login);
      return;
    }

    const loadJobs = async () => {
      try {
        setLoading(true);
        const data = await listCustomerJobs();
        setJobs(data.jobs);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load jobs';
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    loadJobs();
  }, [status, router]);

  const roleLabel = session ? roleLabels[session.user.role] ?? session.user.role : '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Same as Main Dashboard */}
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
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
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
                <p className="text-sm font-medium text-gray-900">{session?.user.name}</p>
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">My Jobs</h2>
            <p className="text-gray-600 mt-1">Manage your 3D printing orders</p>
          </div>
          <Link
            href={ROUTES.dashboardAreas.customerCreateJob}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Job
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center space-y-4">
              <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="text-gray-600">Loading your jobs...</p>
            </div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Jobs Yet</h3>
            <p className="text-gray-600 mb-6">
              Start by creating your first 3D printing order.
            </p>
            <Link
              href={ROUTES.dashboardAreas.customerCreateJob}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Your First Job
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/dashboard/customer/jobs/${job.id}` as any}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="p-6 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{job.name}</h3>
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${
                          statusColors[job.status] || statusColors.pending
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>
                    {job.description && (
                      <p className="text-gray-600 text-sm mb-3">{job.description}</p>
                    )}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">File</p>
                        <p className="font-medium text-gray-900">{job.file.originalName}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">File Size</p>
                        <p className="font-medium text-gray-900">
                          {(parseInt(job.file.size, 10) / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Created</p>
                        <p className="font-medium text-gray-900">
                          {new Date(job.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">Job ID</p>
                    <p className="font-mono text-xs text-gray-900">{job.id.substring(0, 8)}...</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
