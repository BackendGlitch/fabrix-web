import 'server-only';

import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ROUTES } from '@/lib/routes';

import type { UserRole } from './backend';

export async function requireAuth(allowedRoles?: UserRole[]) {
  const session = await auth();

  if (!session?.user || session.error === 'RefreshAccessTokenError') {
    redirect(ROUTES.auth.login);
  }

  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    redirect(ROUTES.forbidden);
  }

  return session;
}
