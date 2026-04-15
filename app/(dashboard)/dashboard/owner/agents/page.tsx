import type { Route } from 'next';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { LogoutButton } from '@/components/auth/logout-button';
import { AgentLiveStatusBoard } from '@/components/owner/agent-live-status-board';
import { requireAuth } from '@/lib/server/auth/require-auth';
import { ROUTES } from '@/lib/routes';
import {
  isOwnerApiSessionRejectedError,
  ownerApprovePairingCode,
  ownerListAgents,
  ownerRevokeAgent,
  OWNER_API_SESSION_REJECTED,
} from '@/lib/server/pairing/backend';

function ownerAgentsUrl(query: Record<string, string>): Route {
  const q = new URLSearchParams(query);
  const s = q.toString();
  if (!s) {
    return ROUTES.dashboardAreas.ownerAgents;
  }
  return `${ROUTES.dashboardAreas.ownerAgents}?${s}` as Route;
}

async function approvePairingAction(formData: FormData) {
  'use server';
  const code = String(formData.get('code') || '').trim().toUpperCase();
  if (!code) {
    return;
  }
  try {
    await ownerApprovePairingCode(code);
  } catch (e) {
    if (isOwnerApiSessionRejectedError(e)) {
      redirect(ownerAgentsUrl({ sessionError: '1', code }));
    }
    redirect(ownerAgentsUrl({ pairError: '1', code }));
  }
  revalidatePath(ROUTES.dashboardAreas.ownerAgents);
  redirect(ownerAgentsUrl({ paired: '1' }));
}

async function revokeAgentAction(formData: FormData) {
  'use server';
  const agentId = String(formData.get('agentId') || '');
  if (!agentId) {
    return;
  }
  try {
    await ownerRevokeAgent(agentId);
  } catch (e) {
    if (isOwnerApiSessionRejectedError(e)) {
      redirect(ownerAgentsUrl({ sessionError: '1' }));
    }
    redirect(ownerAgentsUrl({ revokeError: '1' }));
  }
  revalidatePath(ROUTES.dashboardAreas.ownerAgents);
  redirect(ownerAgentsUrl({ revoked: '1' }));
}

type AgentsSearchParams = {
  code?: string;
  paired?: string;
  pairError?: string;
  sessionError?: string;
  revokeError?: string;
  revoked?: string;
};

function OwnerAgentsFallback() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-4xl rounded-lg border bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-600">Loading…</p>
      </div>
    </main>
  );
}

export default function OwnerAgentsPage({
  searchParams,
}: {
  searchParams: Promise<AgentsSearchParams>;
}) {
  return (
    <Suspense fallback={<OwnerAgentsFallback />}>
      <OwnerAgentsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function OwnerAgentsContent({
  searchParams,
}: {
  searchParams: Promise<AgentsSearchParams>;
}) {
  await requireAuth(['OWNER']);
  const sp = await searchParams;
  const defaultCode = sp.code?.trim().toUpperCase() ?? '';
  const showPaired = sp.paired === '1';
  const showPairError = sp.pairError === '1';
  const showSessionError = sp.sessionError === '1';
  const showRevokeError = sp.revokeError === '1';
  const showRevoked = sp.revoked === '1';

  let agents: Awaited<ReturnType<typeof ownerListAgents>> = [];
  let listError: string | null = null;
  try {
    agents = await ownerListAgents();
  } catch (e) {
    listError = e instanceof Error ? e.message : 'Failed to load paired agents';
  }

  const activeAgents = agents.filter((a) => a.status === 'active');
  const revokedAgents = agents.filter((a) => a.status === 'revoked');

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 px-4 py-10">
      <section className="mx-auto max-w-5xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agent Pairing</h1>
            <p className="mt-2 text-sm text-gray-600">
              Approve a pairing code from your running desktop agent, then manage active devices.
            </p>
          </div>
          <LogoutButton />
        </div>

        {listError ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            <p className="font-medium">Could not load devices</p>
            <p className="mt-1 text-amber-800">{listError}</p>
            <p className="mt-2 text-amber-800">Use Sign out above, then sign in again.</p>
          </div>
        ) : null}

        {showPaired ? (
          <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
            Pairing approved. Your agent should finish connecting shortly.
          </p>
        ) : null}
        {showSessionError ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            <p className="font-medium">Session not accepted by the API</p>
            <p className="mt-1 text-amber-800">{OWNER_API_SESSION_REJECTED}</p>
          </div>
        ) : null}
        {showPairError ? (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            Could not approve that code. It may be expired, already used, or invalid. Try starting the
            agent again for a new code.
          </p>
        ) : null}
        {showRevokeError ? (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            Could not revoke that device. Try again, or sign out and sign in if your session expired.
          </p>
        ) : null}
        {showRevoked ? (
          <p className="mt-4 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900">
            Device access revoked. The agent will disconnect and must pair again to reconnect.
          </p>
        ) : null}

        <form action={approvePairingAction} className="mt-6 flex gap-2">
          <input
            type="text"
            name="code"
            placeholder="Enter pairing code"
            className="w-full rounded border px-3 py-2"
            maxLength={10}
            required
            defaultValue={defaultCode}
          />
          <button
            type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Approve
          </button>
        </form>

        <AgentLiveStatusBoard initialAgents={agents} />

        <div className="mt-8 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">Active devices</h2>
          {!listError && activeAgents.length === 0 ? (
            <p className="text-sm text-gray-600">No active paired agents.</p>
          ) : null}
          {!listError &&
            activeAgents.map((agent) => (
              <article
                key={agent.id}
                className="rounded border border-gray-200 bg-gray-50 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{agent.displayName}</p>
                    <p className="text-xs text-gray-600">Node: {agent.nodeId}</p>
                    <p className="text-xs text-gray-600">Runtime: {agent.runtimeStatus ?? 'offline'}</p>
                    <p className="text-xs text-gray-600">
                      Last seen:{' '}
                      {agent.lastSeenAt ? new Date(agent.lastSeenAt).toLocaleString() : 'Never'}
                    </p>
                  </div>
                  <form action={revokeAgentAction}>
                    <input type="hidden" name="agentId" value={agent.id} />
                    <button
                      type="submit"
                      className="rounded bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700"
                    >
                      Revoke access
                    </button>
                  </form>
                </div>
              </article>
            ))}
        </div>

        {!listError && revokedAgents.length > 0 ? (
          <div className="mt-10 space-y-2">
            <h2 className="text-sm font-semibold text-gray-500">Revoked (cannot reconnect until re-paired)</h2>
            <ul className="space-y-2 text-sm text-gray-500">
              {revokedAgents.map((agent) => (
                <li key={agent.id} className="rounded border border-dashed border-gray-200 px-3 py-2">
                  {agent.displayName} · {agent.nodeId}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mt-8 text-sm text-gray-600">
          <Link href={ROUTES.dashboard} className="font-medium text-blue-600 hover:text-blue-700">
            Back to dashboard
          </Link>
        </p>
      </section>
    </main>
  );
}
