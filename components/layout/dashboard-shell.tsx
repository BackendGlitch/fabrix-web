"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { LogoutButton } from "@/components/auth/logout-button";
import WalletBadge from "@/components/wallet/wallet-badge";
import { ROUTES } from "@/lib/routes";
import {
  Home,
  Users,
  BarChart3,
  Clock,
  Zap,
  Printer,
  Wallet,
  Menu,
  X,
  Box,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
}

const navItems: NavItem[] = [
  {
    label: "Hub",
    href: ROUTES.dashboard,
    icon: <Home className="w-5 h-5" />,
    roles: ["OWNER", "ADMIN"],
  },
  {
    label: "Hub",
    href: "/dashboard/customer",
    icon: <Home className="w-5 h-5" />,
    roles: ["CUSTOMER"],
  },
  {
    label: "Jobs",
    href: ROUTES.dashboardAreas.customerJobs,
    icon: <Zap className="w-5 h-5" />,
    roles: ["CUSTOMER"],
  },
  {
    label: "Wallet",
    href: ROUTES.dashboardAreas.customerWallet,
    icon: <Wallet className="w-5 h-5" />,
    roles: ["CUSTOMER"],
  },
  {
    label: "Agents",
    href: ROUTES.dashboardAreas.ownerAgents,
    icon: <Users className="w-5 h-5" />,
    roles: ["OWNER"],
  },
  {
    label: "Printers",
    href: ROUTES.dashboardAreas.ownerPrinters,
    icon: <Printer className="w-5 h-5" />,
    roles: ["OWNER"],
  },
  {
    label: "Pending",
    href: ROUTES.dashboardAreas.ownerJobs,
    icon: <Clock className="w-5 h-5" />,
    roles: ["OWNER"],
  },
  {
    label: "Earnings",
    href: ROUTES.dashboardAreas.ownerWallet,
    icon: <Wallet className="w-5 h-5" />,
    roles: ["OWNER"],
  },
  {
    label: "Health",
    href: ROUTES.status,
    icon: <BarChart3 className="w-5 h-5" />,
    roles: ["OWNER", "ADMIN"],
  },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  const role = session?.user?.role ?? "";
  const userName = session?.user?.name ?? "User";
  const userInitial = userName.charAt(0).toUpperCase();

  const visibleNav = navItems.filter((item) => item.roles.includes(role));

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 flex-col fixed inset-y-0 left-0 z-40 border-r border-border bg-[#0a0a10]">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <Link href={ROUTES.dashboard} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Box className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Fab<span className="text-primary">rix</span>
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href as any}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                <span className={cn(isActive && "text-primary")}>
                  {item.icon}
                </span>
                {item.label}
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-border space-y-3">
          <WalletBadge />
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-magenta/20 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-muted-foreground">{role}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 glass-strong border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href={ROUTES.dashboard} className="flex items-center gap-2">
            <Box className="w-6 h-6 text-primary" />
            <span className="text-lg font-bold">Fabrix</span>
          </Link>
          <div className="flex items-center gap-3">
            <WalletBadge />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileOpen && (
          <nav className="px-4 pb-4 space-y-1 border-t border-border">
            {visibleNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href as any}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
            <div className="pt-3 border-t border-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-magenta/20 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary">
                {userInitial}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">{role}</p>
              </div>
              <LogoutButton />
            </div>
          </nav>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 min-h-screen">
        <div className="lg:hidden h-16" /> {/* Mobile header spacer */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
