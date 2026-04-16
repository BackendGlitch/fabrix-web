'use client';

import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';
import { CreateJobForm } from '@/components/customer/create-job-form';
import { ROUTES } from '@/lib/routes';
import Link from 'next/link';
import { ArrowLeft, Home, Package, LogOut } from 'lucide-react';

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

export default function CreateJobPage() {
  const { data: session } = useSession();
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

      {/* Page Header with Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <Link
              href={ROUTES.dashboardAreas.customerJobs}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Jobs
            </Link>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Create New Print Job</h2>
          <p className="text-gray-600 mt-2">Upload your STL file and we'll handle everything automatically</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <CreateJobForm />
      </div>
    </div>
  );
}
