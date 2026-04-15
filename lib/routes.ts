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
  /** Deep link from agent `login_url` (Central AGENT_LOGIN_BASE_URL) */
  agentPairingCallback: '/agent/auth' as Route,
  dashboardAreas: {
    admin: '/dashboard/admin' as Route,
    owner: '/dashboard/owner' as Route,
    ownerAgents: '/dashboard/owner/agents' as Route,
    customer: '/dashboard/customer' as Route,
  },
  api: {
    authRegister: '/api/auth/register',
    revalidatePublicHealth: '/api/revalidate/public-health',
    ownerAgentStatus: '/api/owner/agents/status',
  },
} as const;
