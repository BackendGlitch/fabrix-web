import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ROUTES } from '@/lib/routes';
import { ownerApprovePairingCode } from '@/lib/server/pairing/backend';

type SearchParams = { code?: string };

function AgentAuthFallback() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-sm text-gray-600">Loading…</p>
    </main>
  );
}

export default function AgentPairingCallbackPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<AgentAuthFallback />}>
      <AgentPairingCallbackContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AgentPairingCallbackContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { code: raw } = await searchParams;
  const code = raw?.trim().toUpperCase();

  if (!code) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-gray-900">Missing pairing code</h1>
        <p className="mt-2 text-sm text-gray-600">
          Use the link shown in your Fabrix Agent, or approve manually on the owner page.
        </p>
        <Link
          href={ROUTES.dashboardAreas.ownerAgents}
          className="mt-6 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Open agent pairing
        </Link>
      </main>
    );
  }

  const session = await auth();
  if (!session?.user) {
    const returnTo = `/agent/auth?code=${encodeURIComponent(code)}`;
    redirect(`${ROUTES.auth.login}?next=${encodeURIComponent(returnTo)}`);
  }

  if (session.user.role !== 'OWNER') {
    redirect(ROUTES.forbidden);
  }

  try {
    await ownerApprovePairingCode(code);
  } catch {
    redirect(`${ROUTES.dashboardAreas.ownerAgents}?pairError=1&code=${encodeURIComponent(code)}`);
  }

  redirect(`${ROUTES.dashboardAreas.ownerAgents}?paired=1`);
}
