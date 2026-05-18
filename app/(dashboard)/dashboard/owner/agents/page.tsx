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
    <div className="space-y-6">
      <div className="w-12 h-12 rounded-xl border border-primary/20 flex items-center justify-center animate-pulse">
        <div className="w-6 h-6 bg-primary/20 rounded-full" />
      </div>
      <p className="text-muted-foreground text-sm font-mono">Loading agents...</p>
    </div>
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter-hero leading-[0.95] mb-2">
            Agent <span className="slant-highlight slant-highlight-magenta text-black">Pairing</span>
          </h1>
          <p className="text-muted-foreground">
            Approve a pairing code from your running desktop agent, then manage active devices.
          </p>
        </div>
      </div>

        {listError ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-400">
            <p className="font-medium">Could not load devices</p>
            <p className="mt-1 text-amber-400/80">{listError}</p>
            <p className="mt-2 text-amber-400/80">Use Sign out above, then sign in again.</p>
          </div>
        ) : null}

        {showPaired ? (
          <p className="rounded-2xl bg-lime/10 px-4 py-3 text-sm text-lime border border-lime/20">
            Pairing approved. Your agent should finish connecting shortly.
          </p>
        ) : null}
        {showSessionError ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-400">
            <p className="font-medium">Session not accepted by the API</p>
            <p className="mt-1 text-amber-400/80">{OWNER_API_SESSION_REJECTED}</p>
          </div>
        ) : null}
        {showPairError ? (
          <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/20">
            Could not approve that code. It may be expired, already used, or invalid. Try starting the
            agent again for a new code.
          </p>
        ) : null}
        {showRevokeError ? (
          <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/20">
            Could not revoke that device. Try again, or sign out and sign in if your session expired.
          </p>
        ) : null}
        {showRevoked ? (
          <p className="rounded-2xl bg-primary/10 px-4 py-3 text-sm text-primary border border-primary/20">
            Device access revoked. The agent will disconnect and must pair again to reconnect.
          </p>
        ) : null}

        <form action={approvePairingAction} className="flex gap-2">
          <input
            type="text"
            name="code"
            placeholder="Enter pairing code"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary"
            maxLength={10}
            required
            defaultValue={defaultCode}
          />
          <button
            type="submit"
            className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 glow-cyan shrink-0"
          >
            Approve
          </button>
        </form>

        <AgentLiveStatusBoard initialAgents={agents} />

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Active devices</h2>
          {!listError && activeAgents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active paired agents.</p>
          ) : null}
          {!listError &&
            activeAgents.map((agent) => (
              <article
                key={agent.id}
                className="rounded-2xl border border-border bg-card px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-foreground">{agent.displayName}</p>
                    <p className="text-xs text-muted-foreground">Node: {agent.nodeId}</p>
                    <p className="text-xs text-muted-foreground">Runtime: {agent.runtimeStatus ?? 'offline'}</p>
                    <p className="text-xs text-muted-foreground">
                      Last seen:{' '}
                      {agent.lastSeenAt ? new Date(agent.lastSeenAt).toLocaleString() : 'Never'}
                    </p>
                  </div>
                  <form action={revokeAgentAction}>
                    <input type="hidden" name="agentId" value={agent.id} />
                    <button
                      type="submit"
                      className="rounded-xl bg-destructive px-3 py-2 text-xs font-bold text-destructive-foreground hover:bg-destructive/90"
                    >
                      Revoke access
                    </button>
                  </form>
                </div>
              </article>
            ))}
        </div>

        {!listError && revokedAgents.length > 0 ? (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Revoked (cannot reconnect until re-paired)</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {revokedAgents.map((agent) => (
                <li key={agent.id} className="rounded-xl border border-dashed border-border px-3 py-2">
                  {agent.displayName} · {agent.nodeId}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="text-sm text-muted-foreground">
          <Link href={ROUTES.dashboard} className="font-medium text-primary hover:text-primary/80 transition-colors">
            Back to dashboard
          </Link>
        </p>
    </div>
  );
}
