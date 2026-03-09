import 'server-only';

import { ROUTES } from '@/lib/routes';

import type { UserRole } from './backend';

interface RouteRoleRule {
  prefix: string;
  allowedRoles: UserRole[];
}

const ROUTE_ROLE_RULES: RouteRoleRule[] = [
  { prefix: ROUTES.dashboardAreas.admin, allowedRoles: ['ADMIN'] },
  { prefix: ROUTES.dashboardAreas.owner, allowedRoles: ['OWNER', 'ADMIN'] },
  { prefix: ROUTES.dashboardAreas.customer, allowedRoles: ['CUSTOMER', 'ADMIN'] },
];
const USER_ROLE_SET = new Set<UserRole>(['OWNER', 'CUSTOMER', 'ADMIN']);

function isPathUnderPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isAllowedRoleForPath(
  pathname: string,
  role: unknown,
): boolean {
  const rule = ROUTE_ROLE_RULES.find((item) => isPathUnderPrefix(pathname, item.prefix));

  if (!rule) {
    return true;
  }

  if (typeof role !== 'string' || !USER_ROLE_SET.has(role as UserRole)) {
    return false;
  }

  return rule.allowedRoles.includes(role as UserRole);
}
