import { Suspense } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { CustomerFlow } from "@/components/customer/customer-flow";
import { ROUTES } from "@/lib/routes";
import { requireAuth } from "@/lib/server/auth/require-auth";
import { Home, Users, Briefcase, BarChart3, Clock, Zap } from "lucide-react";

const roleLabels: Record<string, string> = {
  OWNER: "Property Owner",
  CUSTOMER: "Customer",
  ADMIN: "Administrator",
};

function DashboardFallback() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    </div>
  );
}

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
    roles: ["OWNER", "CUSTOMER", "ADMIN"],
  },
  {
    label: "Job Status",
    href: ROUTES.dashboardAreas.customerJobs,
    icon: <Zap className="w-5 h-5" />,
    roles: ["CUSTOMER"],
  },
  {
    label: "Agents",
    href: ROUTES.dashboardAreas.ownerAgents,
    icon: <Users className="w-5 h-5" />,
    roles: ["OWNER"],
  },
  {
    label: "Pending Jobs",
    href: ROUTES.dashboardAreas.ownerJobs,
    icon: <Clock className="w-5 h-5" />,
    roles: ["OWNER"],
  },
  {
    label: "System Health",
    href: ROUTES.status,
    icon: <BarChart3 className="w-5 h-5" />,
    roles: ["OWNER", "ADMIN"],
  },
];

async function DashboardContent() {
  const session = await requireAuth();
  const roleLabel = roleLabels[session.user.role] ?? session.user.role;
  const visibleNavLinks = navLinks.filter((link) =>
    link.roles.includes(session.user.role),
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-bold text-gray-900">Fabrix</h1>
              <nav className="hidden md:flex gap-1">
                {visibleNavLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href as any}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors text-sm font-medium"
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
                  {session.user.name}
                </p>
                <p className="text-xs text-gray-500">{roleLabel}</p>
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-2 py-2 overflow-x-auto">
          {visibleNavLinks.map((link) => (
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Role-specific content */}
        {session.user.role === "CUSTOMER" ? (
          <div className="space-y-6">
            {/* Welcome Section for Customers */}
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome, {session.user.name}!
              </h2>
              <p className="text-gray-600">
                Ready to start your 3D printing journey? Upload your model
                below.
              </p>
            </div>

            {/* Customer Flow */}
            <CustomerFlow />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome, {session.user.name}!
              </h2>
              <p className="text-gray-600">Here's your Fabrix dashboard</p>
            </div>

            {/* User Info Card */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Account Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Email Address</p>
                  <p className="font-medium text-gray-900">
                    {session.user.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Role</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {roleLabel}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Account ID</p>
                  <p className="font-mono text-sm text-gray-900">
                    {session.user.id.substring(0, 8)}...
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions for OWNER/ADMIN */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {session.user.role === "OWNER" && (
                <>
                  <Link
                    href={ROUTES.dashboardAreas.ownerAgents}
                    className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow hover:border-blue-400 border"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Users className="w-6 h-6 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        Agents
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Manage and pair your 3D printer agents
                    </p>
                  </Link>

                  <Link
                    href={ROUTES.status}
                    className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow hover:border-blue-400 border"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <BarChart3 className="w-6 h-6 text-green-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        System Health
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Check system status and health metrics
                    </p>
                  </Link>

                  <Link
                    href={ROUTES.dashboardAreas.ownerJobs}
                    className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow hover:border-blue-400 border"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="w-6 h-6 text-amber-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        Pending Jobs
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Review and approve jobs waiting for your printers
                    </p>
                  </Link>
                </>
              )}

              {session.user.role === "ADMIN" && (
                <Link
                  href={ROUTES.status}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow hover:border-blue-400 border"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <BarChart3 className="w-6 h-6 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      System Health
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Monitor all system metrics and logs
                  </p>
                </Link>
              )}
            </div>
          </div>
        )}
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
