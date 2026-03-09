import type { Route } from 'next';

export const ROUTES = {
  home: '/' as Route,
  dashboard: '/dashboard' as Route,
  forbidden: '/forbidden' as Route,
  status: '/status' as Route,
  auth: {
    login: '/auth/login' as Route,
    register: '/auth/register' as Route,
  },
  dashboardAreas: {
    admin: '/dashboard/admin' as Route,
    owner: '/dashboard/owner' as Route,
    customer: '/dashboard/customer' as Route,
  },
  api: {
    authRegister: '/api/auth/register',
    revalidatePublicHealth: '/api/revalidate/public-health',
  },
} as const;
