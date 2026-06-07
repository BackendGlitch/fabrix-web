import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { ROUTES } from '@/lib/routes';
import { isAllowedRoleForPath } from '@/lib/server/auth/roles';

export const proxy = auth((request) => {
  const isAuthenticated = Boolean(request.auth?.user);
  const role = request.auth?.user?.role;
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname === ROUTES.auth.login || pathname === ROUTES.auth.register;
  const isDashboardPage = pathname.startsWith(ROUTES.dashboard);

  if (isDashboardPage && !isAuthenticated) {
    return NextResponse.redirect(new URL(ROUTES.auth.login, request.nextUrl));
  }

  if (isDashboardPage && !isAllowedRoleForPath(pathname, role)) {
    return NextResponse.redirect(new URL(ROUTES.forbidden, request.nextUrl));
  }

  if ((isAuthPage || pathname === ROUTES.home) && isAuthenticated) {
    return NextResponse.redirect(new URL(ROUTES.dashboard, request.nextUrl));
  }

  // Allow unauthenticated users to see the landing page
  return NextResponse.next();
});

export const config = {
  matcher: ['/', '/dashboard/:path*', '/auth/login', '/auth/register', '/forbidden'],
};
