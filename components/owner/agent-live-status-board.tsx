'use client';

import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import type { OwnerAgentStatus } from '@/lib/types/agent-status';

type Props = {
  initialAgents: OwnerAgentStatus[];
};

type ApiPayload = {
  agents: OwnerAgentStatus[];
  timestamp: string;
};

const POLL_MS = 5000;

function statusTone(status: OwnerAgentStatus['runtimeStatus']) {
  switch (status) {
    case 'online':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'revoked':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    case 'offline':
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function activityTone(activity: OwnerAgentStatus['activityState']) {
  switch (activity) {
    case 'working':
      return 'bg-amber-100 text-amber-900 border-amber-200';
    case 'idle':
      return 'bg-sky-100 text-sky-900 border-sky-200';
    case 'offline':
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function formatAge(iso: string | null | undefined): string {
  if (!iso) {
    return 'never';
  }
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) {
    return 'just now';
  }
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AgentLiveStatusBoard({ initialAgents }: Props) {
  const [agents, setAgents] = useState<OwnerAgentStatus[]>(initialAgents);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function pull() {
      try {
        const response = await fetch('/api/owner/agents/status', {
          method: 'GET',
          cache: 'no-store',
        });
        const payload = (await response.json().catch(() => null)) as ApiPayload | { message?: string } | null;
        if (!response.ok) {
          const msg = payload && typeof payload === 'object' && 'message' in payload
            ? String(payload.message || 'Unable to refresh status')
            : 'Unable to refresh status';
          throw new Error(msg);
        }

        if (!active) {
          return;
        }

        const apiData = payload as ApiPayload;
        setAgents(apiData.agents ?? []);
        setUpdatedAt(apiData.timestamp ?? new Date().toISOString());
        setError(null);
      } catch (e) {
        if (!active) {
          return;
        }
        setError(e instanceof Error ? e.message : 'Unable to refresh status');
      }
    }

    pull();
    const timer = window.setInterval(pull, POLL_MS);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const activeAgents = useMemo(
    () => agents.filter((agent) => agent.status === 'active'),
    [agents],
  );

  const totals = useMemo(() => {
    let online = 0;
    let offline = 0;
    let working = 0;
    let idle = 0;

    for (const agent of activeAgents) {
      if (agent.runtimeStatus === 'online') {
        online += 1;
      } else {
        offline += 1;
      }

      if (agent.activityState === 'working') {
        working += 1;
      } else if (agent.activityState === 'idle') {
        idle += 1;
      }
    }

    return { online, offline, working, idle };
  }, [activeAgents]);

  return (
    <section className="mt-8 rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-gray-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Live agent status</h2>
          <p className="mt-1 text-sm text-gray-600">
            Auto-refresh every 5 seconds for real-time presence and activity.
          </p>
        </div>
        <div className="rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white">
          {updatedAt ? `Updated ${formatAge(updatedAt)}` : 'Syncing...'}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricChip label="Online" value={totals.online} tone="text-emerald-700" />
        <MetricChip label="Offline" value={totals.offline} tone="text-slate-700" />
        <MetricChip label="Working" value={totals.working} tone="text-amber-700" />
        <MetricChip label="Idle" value={totals.idle} tone="text-sky-700" />
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {error}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {activeAgents.length === 0 ? (
          <p className="text-sm text-gray-600">No active agents to monitor yet.</p>
        ) : (
          activeAgents.map((agent) => {
            const runtimeStatus = agent.runtimeStatus ?? 'offline';
            const activityState = agent.activityState ?? 'offline';
            return (
              <article
                key={agent.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-[0_1px_0_rgba(0,0,0,0.03)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{agent.displayName}</p>
                    <p className="mt-1 text-xs text-gray-600">Node: {agent.nodeId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium',
                        statusTone(runtimeStatus),
                      )}
                    >
                      {runtimeStatus}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium',
                        activityTone(activityState),
                      )}
                    >
                      {activityState}
                    </span>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-gray-600">
                  <p>Last seen: {formatAge(agent.lastSeenAt)}</p>
                  <p>Heartbeat: {formatAge(agent.lastHeartbeatAt)}</p>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function MetricChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className={cn('mt-1 text-xl font-semibold', tone)}>{value}</p>
    </div>
  );
}
