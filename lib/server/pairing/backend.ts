import 'server-only';

import { auth } from '@/auth';
import type { OwnerAgentStatus } from '@/lib/types/agent-status';

function apiBaseUrl(): string {
  const base = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'https://api-fabrix-v2.backendglitch.com';
  if (!base) {
    throw new Error('Missing API_URL or NEXT_PUBLIC_API_URL');
  }
  return base.replace(/\/$/, '');
}

async function ownerFetch(path: string, init?: RequestInit): Promise<Response> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error('Missing authenticated owner access token');
  }
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
      ...(init?.headers ?? {}),
    },
  });
  return response;
}

/** Thrown message for 401 from Central; use with isOwnerApiSessionRejectedError in server actions. */
export const OWNER_API_SESSION_REJECTED =
  'The API rejected your session (invalid or expired token). Sign out and sign in again. ' +
  'If you changed JWT_ACCESS_SECRET on Fabrix Central, every user must log in again.';

export function isOwnerApiSessionRejectedError(e: unknown): boolean {
  return e instanceof Error && e.message === OWNER_API_SESSION_REJECTED;
}

function pairingErrorMessage(status: number, body: unknown): string {
  if (status === 401) {
    return OWNER_API_SESSION_REJECTED;
  }
  if (body && typeof body === 'object' && 'message' in body) {
    const m = (body as { message?: unknown }).message;
    if (typeof m === 'string') {
      return m;
    }
    if (Array.isArray(m) && m.every((x) => typeof x === 'string')) {
      return m.join(', ');
    }
  }
  return `Request failed (${status})`;
}

export async function ownerApprovePairingCode(code: string): Promise<void> {
  const cleanCode = code.trim().toUpperCase();
  const response = await ownerFetch(`/agent/pair/${encodeURIComponent(cleanCode)}/approve`, {
    method: 'POST',
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(pairingErrorMessage(response.status, payload));
  }
}

export async function ownerListAgents(): Promise<OwnerAgentStatus[]> {
  const response = await ownerFetch('/agent/pair/owner/agents');
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(pairingErrorMessage(response.status, payload ?? {}));
  }
  return payload as OwnerAgentStatus[];
}

export async function ownerRevokeAgent(agentId: string): Promise<void> {
  const response = await ownerFetch(`/agent/pair/owner/agents/${encodeURIComponent(agentId)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(pairingErrorMessage(response.status, payload));
  }
}
