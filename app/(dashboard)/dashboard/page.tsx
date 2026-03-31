import { Suspense } from 'react';
import Link from 'next/link';
import { LogoutButton } from '@/components/auth/logout-button';
import { ROUTES } from '@/lib/routes';
import { requireAuth } from '@/lib/server/auth/require-auth';

const roleLabels: Record<string, string> = {
  OWNER: 'Property Owner',
  CUSTOMER: 'Customer',
  ADMIN: 'Administrator',
};

function DashboardFallback() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </main>
    </div>
  );
}

async function DashboardContent() {
  const session = await requireAuth();

  const roleLabel = roleLabels[session.user.role] ?? session.user.role;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Fabrix</h1>
          <LogoutButton />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome, {session.user.name}!
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Email</p>
              <p className="text-lg font-semibold text-gray-900">{session.user.email}</p>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Role</p>
              <p className="text-lg font-semibold text-gray-900">{roleLabel}</p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="mt-2 text-sm text-blue-900">
              Cached health example:{' '}
              <Link href={ROUTES.status} className="font-medium underline">
                {ROUTES.status}
              </Link>
            </p>
            {session.user.role === 'OWNER' ? (
              <p className="mt-2 text-sm text-blue-900">
                Agent pairing:{' '}
                <Link href={ROUTES.dashboardAreas.ownerAgents} className="font-medium underline">
                  {ROUTES.dashboardAreas.ownerAgents}
                </Link>
              </p>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardContent />
    </Suspense>
  );
}
