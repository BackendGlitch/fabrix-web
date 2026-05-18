import { Suspense } from "react";
import Link from "next/link";
import CustomerDashboard from "@/components/customer/customer-dashboard";
import { ROUTES } from "@/lib/routes";
import { requireAuth } from "@/lib/server/auth/require-auth";
import {
  Users,
  BarChart3,
  Clock,
  Zap,
  Printer,
  Wallet,
  ArrowUpRight,
  Box,
  Layers,
} from "lucide-react";

const roleLabels: Record<string, string> = {
  OWNER: "Printer Owner",
  CUSTOMER: "Maker",
  ADMIN: "Admin",
};

function DashboardFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl border border-primary/20 flex items-center justify-center animate-pulse">
          <Box className="w-6 h-6 text-primary" />
        </div>
        <p className="text-muted-foreground text-sm">Loading your hub...</p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  href,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: "cyan" | "magenta" | "lime";
  href: string;
}) {
  const colorMap = {
    cyan: "from-primary/10 to-primary/5 border-primary/20 text-primary",
    magenta:
      "from-magenta/10 to-magenta/5 border-magenta/20 text-magenta",
    lime: "from-lime/10 to-lime/5 border-lime/20 text-lime",
  };

  return (
    <Link
      href={href as any}
      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${colorMap[color]} p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
        </div>
        <div className="p-3 rounded-xl bg-background/50 backdrop-blur-sm">
          {icon}
        </div>
      </div>
      <ArrowUpRight className="absolute bottom-4 right-4 w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

function QuickActionCard({
  title,
  description,
  icon,
  href,
  accent,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  accent: "cyan" | "magenta" | "lime" | "orange";
}) {
  const accentMap = {
    cyan: "hover:border-primary/40 hover:shadow-[0_0_30px_rgba(0,240,255,0.1)]",
    magenta:
      "hover:border-magenta/40 hover:shadow-[0_0_30px_rgba(255,45,110,0.1)]",
    lime: "hover:border-lime/40 hover:shadow-[0_0_30px_rgba(204,255,0,0.1)]",
    orange:
      "hover:border-orange-500/40 hover:shadow-[0_0_30px_rgba(255,149,0,0.1)]",
  };

  return (
    <Link
      href={href as any}
      className={`group block rounded-2xl border border-border bg-card p-6 transition-all duration-300 ${accentMap[accent]}`}
    >
      <div className="flex items-center gap-4 mb-3">
        <div className="p-3 rounded-xl bg-secondary">{icon}</div>
        <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
          {title}
        </h3>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}

async function DashboardContent() {
  const session = await requireAuth();

  const roleLabel = roleLabels[session.user.role] ?? session.user.role;

  // Customer role: render customer dashboard inline
  if (session.user.role === "CUSTOMER") {
    return (
      <Suspense fallback={<DashboardFallback />}>
        <CustomerDashboard />
      </Suspense>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface to-background p-8 sm:p-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-magenta/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              {roleLabel}
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter-hero mb-4">
            Welcome back,
            <br />
            <span className="gradient-text">{session.user.name}</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl">
            {session.user.role === "OWNER"
              ? "Manage your printers, review pending jobs, and track your earnings."
              : "Monitor system health and manage platform operations."}
          </p>
        </div>
      </div>

      {/* Role-specific content */}
      <div className="space-y-8">
        {/* Owner Stats */}
        {session.user.role === "OWNER" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Earnings"
              value="View →"
              icon={<Wallet className="w-5 h-5" />}
              color="cyan"
              href={ROUTES.dashboardAreas.ownerWallet}
            />
            <StatCard
              label="Pending Jobs"
              value="View →"
              icon={<Clock className="w-5 h-5" />}
              color="magenta"
              href={ROUTES.dashboardAreas.ownerJobs}
            />
            <StatCard
              label="Agents"
              value="View →"
              icon={<Box className="w-5 h-5" />}
              color="lime"
              href={ROUTES.dashboardAreas.ownerAgents}
            />
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {session.user.role === "OWNER" && (
              <>
                <QuickActionCard
                  title="Manage Agents"
                  description="Pair and configure your 3D printer agents"
                  icon={<Users className="w-5 h-5 text-primary" />}
                  href={ROUTES.dashboardAreas.ownerAgents}
                  accent="cyan"
                />
                <QuickActionCard
                  title="Printers"
                  description="Configure printer settings and filaments"
                  icon={<Printer className="w-5 h-5 text-magenta" />}
                  href={ROUTES.dashboardAreas.ownerPrinters}
                  accent="magenta"
                />
                <QuickActionCard
                  title="Pending Jobs"
                  description="Review and approve incoming print requests"
                  icon={<Clock className="w-5 h-5 text-lime" />}
                  href={ROUTES.dashboardAreas.ownerJobs}
                  accent="lime"
                />
                <QuickActionCard
                  title="Earnings"
                  description="Track your revenue and withdraw funds"
                  icon={<Wallet className="w-5 h-5 text-primary" />}
                  href={ROUTES.dashboardAreas.ownerWallet}
                  accent="cyan"
                />
                <QuickActionCard
                  title="System Health"
                  description="Monitor all system metrics and logs"
                  icon={<BarChart3 className="w-5 h-5 text-orange-400" />}
                  href={ROUTES.status}
                  accent="orange"
                />
              </>
            )}

            {session.user.role === "ADMIN" && (
              <QuickActionCard
                title="System Health"
                description="Monitor all system metrics and logs"
                icon={<BarChart3 className="w-5 h-5 text-primary" />}
                href={ROUTES.status}
                accent="cyan"
              />
            )}
          </div>
        </div>

        {/* Account Info */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Account</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Email
              </p>
              <p className="font-mono text-sm">{session.user.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Role
              </p>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                {roleLabel}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                ID
              </p>
              <p className="font-mono text-sm text-muted-foreground">
                {session.user.id.substring(0, 8)}...
              </p>
            </div>
          </div>
        </div>
      </div>
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
