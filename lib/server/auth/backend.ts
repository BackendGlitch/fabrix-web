import 'server-only';

import { decodeJwt } from 'jose';

export type UserRole = 'OWNER' | 'CUSTOMER' | 'ADMIN';

export interface BackendAuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface BackendAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: BackendAuthUser;
  message?: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  role: Extract<UserRole, 'OWNER' | 'CUSTOMER'>;
}

export class BackendAuthError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'BackendAuthError';
  }
}

const DEFAULT_ERROR_MESSAGE = 'Authentication request failed';
const USER_ROLE_SET = new Set<UserRole>(['OWNER', 'CUSTOMER', 'ADMIN']);

function getApiBaseUrl(): string {
  const url = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error('Missing API URL. Set API_URL or NEXT_PUBLIC_API_URL.');
  }

  return url.replace(/\/$/, '');
}

function extractErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return DEFAULT_ERROR_MESSAGE;
  }

  const message = (payload as { message?: unknown }).message;
  if (typeof message === 'string') {
    return message;
  }

  if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
    return message.join(', ');
  }

  return DEFAULT_ERROR_MESSAGE;
}

interface BackendRequestResult {
  payload: unknown;
  headers: Headers;
}

function getRefreshCookieName(): string {
  const configuredName =
    process.env.BACKEND_REFRESH_COOKIE_NAME
    ?? process.env.AUTH_REFRESH_COOKIE_NAME
    ?? 'fabrix_refresh_token';

  const cookieName = configuredName.trim();
  if (!cookieName) {
    return 'fabrix_refresh_token';
  }

  return cookieName;
}

function getSetCookieHeaders(headers: Headers): string[] {
  const maybeGetSetCookie = (
    headers as unknown as { getSetCookie?: () => string[] }
  ).getSetCookie;

  if (typeof maybeGetSetCookie === 'function') {
    const setCookies = maybeGetSetCookie.call(headers);
    if (setCookies.length > 0) {
      return setCookies;
    }
  }

  const fallback = headers.get('set-cookie');
  return fallback ? [fallback] : [];
}

function extractRefreshTokenFromSetCookie(headers: Headers): string | undefined {
  const cookieName = getRefreshCookieName();
  const cookiePrefix = `${cookieName}=`;

  for (const setCookieHeader of getSetCookieHeaders(headers)) {
    const startIndex = setCookieHeader.indexOf(cookiePrefix);
    if (startIndex === -1) {
      continue;
    }

    const rawValue = setCookieHeader
      .slice(startIndex + cookiePrefix.length)
      .split(';', 1)[0];

    if (!rawValue) {
      continue;
    }

    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return undefined;
}

function isBackendAuthUser(value: unknown): value is BackendAuthUser {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<BackendAuthUser>;
  return (
    typeof candidate.id === 'string'
    && typeof candidate.email === 'string'
    && typeof candidate.name === 'string'
    && typeof candidate.role === 'string'
    && USER_ROLE_SET.has(candidate.role as UserRole)
  );
}

function parseBackendAuthResponse(
  payload: unknown,
  headers: Headers,
): BackendAuthResponse {
  if (!payload || typeof payload !== 'object') {
    throw new BackendAuthError('Invalid authentication response payload', 502);
  }

  const candidate = payload as Partial<BackendAuthResponse>;
  if (typeof candidate.accessToken !== 'string' || !isBackendAuthUser(candidate.user)) {
    throw new BackendAuthError('Invalid authentication response shape', 502);
  }

  const refreshTokenFromBody =
    typeof candidate.refreshToken === 'string' ? candidate.refreshToken : undefined;
  const refreshToken = refreshTokenFromBody ?? extractRefreshTokenFromSetCookie(headers);

  if (!refreshToken) {
    throw new BackendAuthError('Missing refresh token in authentication response', 502);
  }

  return {
    accessToken: candidate.accessToken,
    refreshToken,
    user: candidate.user,
    message: typeof candidate.message === 'string' ? candidate.message : undefined,
  };
}

async function backendAuthRequest(
  path: string,
  init: RequestInit,
): Promise<BackendRequestResult> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new BackendAuthError(extractErrorMessage(payload), response.status);
  }

  return {
    payload,
    headers: response.headers,
  };
}

export function getAccessTokenExpiry(accessToken: string): number {
  try {
    const decoded = decodeJwt(accessToken);
    if (typeof decoded.exp === 'number') {
      return decoded.exp * 1000;
    }
  } catch {
    // Fall through and use a short fallback expiry.
  }

  return Date.now() + 5 * 60 * 1000;
}

export async function loginWithBackend(
  email: string,
  password: string,
): Promise<BackendAuthResponse> {
  const result = await backendAuthRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  return parseBackendAuthResponse(result.payload, result.headers);
}

export async function registerWithBackend(
  payload: RegisterPayload,
): Promise<BackendAuthResponse> {
  const result = await backendAuthRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return parseBackendAuthResponse(result.payload, result.headers);
}

export async function refreshWithBackend(
  refreshToken: string,
): Promise<BackendAuthResponse> {
  const result = await backendAuthRequest('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });

  return parseBackendAuthResponse(result.payload, result.headers);
}

export async function logoutFromBackend(refreshToken: string): Promise<void> {
  try {
    await backendAuthRequest('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  } catch (error) {
    if (
      error instanceof BackendAuthError
      && (error.status === 400 || error.status === 401)
    ) {
      return;
    }

    throw error;
  }
}
