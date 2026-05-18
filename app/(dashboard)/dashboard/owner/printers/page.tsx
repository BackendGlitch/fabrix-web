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
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-6xl rounded-lg border bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-600">Loading printer configurations...</p>
      </div>
    </main>
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
    <main className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 px-4 py-10">
      <section className="mx-auto max-w-6xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Printer Configuration
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Configure your 3D printers and manage available filaments.
            </p>
          </div>
          <LogoutButton />
        </div>

        {error ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            <p className="font-medium">Could not load printers</p>
            <p className="mt-1 text-amber-800">{error}</p>
          </div>
        ) : null}

        {agents.length === 0 && !error ? (
          <div className="mt-8 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <p className="text-gray-600">No active printers found.</p>
            <p className="mt-2 text-sm text-gray-500">
              Pair an agent first to configure your printer.
            </p>
            <Link
              href={ROUTES.dashboardAreas.ownerAgents}
              className="mt-4 inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Go to Agent Pairing
            </Link>
          </div>
        ) : null}

        <div className="mt-8 space-y-8">
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

        <p className="mt-8 text-sm text-gray-600">
          <Link
            href={ROUTES.dashboard}
            className="font-medium text-blue-600 hover:text-blue-700"
          >
            Back to dashboard
          </Link>
        </p>
      </section>
    </main>
  );
}
