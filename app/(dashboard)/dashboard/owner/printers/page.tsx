import type { Route } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { LogoutButton } from '@/components/auth/logout-button';
import { PrinterConfigManager } from '@/components/owner/printer-config-manager';
import { requireAuth } from '@/lib/server/auth/require-auth';
import { ROUTES } from '@/lib/routes';
import {
  getPrinterConfig,
  getFilaments,
  getFilamentStandards,
  type PrinterConfig,
  type Filament,
  type FilamentStandard,
} from '@/lib/server/printer-config/backend';
import { ownerListAgents } from '@/lib/server/pairing/backend';

interface AgentWithConfig {
  id: string;
  displayName: string;
  nodeId: string;
  status: string;
  config?: PrinterConfig;
  filaments?: Filament[];
}

async function loadOwnerPrinters(): Promise<{
  agents: AgentWithConfig[];
  standards: FilamentStandard[];
  error?: string;
}> {
  try {
    const [agents, standards] = await Promise.all([
      ownerListAgents(),
      getFilamentStandards(),
    ]);
    console.log('[Printers] Loaded standards:', standards.length, standards);

    // Load config and filaments for each active agent
    const activeAgents = agents.filter((a) => a.status === 'active');
    const agentsWithConfig = await Promise.all(
      activeAgents.map(async (agent) => {
        try {
          const config = await getPrinterConfig(agent.id);
          if (config) {
            const filaments = await getFilaments(config.id);
            return {
              ...agent,
              config,
              filaments,
            };
          }
          return {
            ...agent,
            config: undefined,
            filaments: [],
          };
        } catch (e) {
          return {
            ...agent,
            config: undefined,
            filaments: [],
          };
        }
      }),
    );

    return {
      agents: agentsWithConfig,
      standards,
    };
  } catch (e) {
    return {
      agents: [],
      standards: [],
      error:
        e instanceof Error
          ? e.message
          : 'Failed to load printer configurations',
    };
  }
}

function PrintersFallback() {
  return (
    <div className="space-y-6">
      <div className="w-12 h-12 rounded-xl border border-primary/20 flex items-center justify-center animate-pulse">
        <div className="w-6 h-6 bg-primary/20 rounded-full" />
      </div>
      <p className="text-muted-foreground text-sm font-mono">Loading printer configurations...</p>
    </div>
  );
}

export default function OwnerPrintersPage() {
  return (
    <Suspense fallback={<PrintersFallback />}>
      <OwnerPrintersContent />
    </Suspense>
  );
}

async function OwnerPrintersContent() {
  await requireAuth(['OWNER']);
  const { agents, standards, error } = await loadOwnerPrinters();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter-hero leading-[0.95] mb-2">
            Printer <span className="slant-highlight slant-highlight-magenta text-black">Config</span>
          </h1>
          <p className="text-muted-foreground">
            Configure your 3D printers and manage available filaments.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-400">
          <p className="font-medium">Could not load printers</p>
          <p className="mt-1 text-amber-400/80">{error}</p>
        </div>
      ) : null}

      {agents.length === 0 && !error ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No active printers found.</p>
          <p className="mt-2 text-sm text-muted-foreground/70">
            Pair an agent first to configure your printer.
          </p>
          <Link
            href={ROUTES.dashboardAreas.ownerAgents}
            className="mt-4 inline-block rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 glow-cyan"
          >
            Go to Agent Pairing
          </Link>
        </div>
      ) : null}

      <div className="space-y-8">
        {agents.map((agent) => (
          <PrinterConfigManager
            key={agent.id}
            agent={{
              id: agent.id,
              displayName: agent.displayName,
              nodeId: agent.nodeId,
              status: agent.status,
            }}
            initialConfig={agent.config}
            initialFilaments={agent.filaments || []}
            filamentStandards={standards}
          />
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        <Link
          href={ROUTES.dashboard}
          className="font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
