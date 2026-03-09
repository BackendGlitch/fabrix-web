import Link from 'next/link';
import { ROUTES } from '@/lib/routes';
import { revalidatePublicHealthTag } from '@/lib/server/revalidate/public-health';

import {
  getPublicHealthSnapshot,
} from '@/lib/server/cache/public-health';

async function refreshPublicHealthAction() {
  'use server';

  revalidatePublicHealthTag('max');
}

export default async function StatusPage() {
  const snapshot = await getPublicHealthSnapshot();

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <section className="mx-auto max-w-3xl rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Platform Status</h1>
          <form action={refreshPublicHealthAction}>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Refresh Cache
            </button>
          </form>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <article className="rounded-md bg-gray-100 p-4">
            <p className="text-sm text-gray-600">Status</p>
            <p className="text-lg font-semibold text-gray-900">{snapshot.status}</p>
          </article>

          <article className="rounded-md bg-gray-100 p-4">
            <p className="text-sm text-gray-600">Service</p>
            <p className="text-lg font-semibold text-gray-900">{snapshot.service}</p>
          </article>

          <article className="rounded-md bg-gray-100 p-4">
            <p className="text-sm text-gray-600">Database</p>
            <p className="text-lg font-semibold text-gray-900">{snapshot.database}</p>
          </article>

          <article className="rounded-md bg-gray-100 p-4">
            <p className="text-sm text-gray-600">Timestamp</p>
            <p className="text-lg font-semibold text-gray-900">{snapshot.timestamp}</p>
          </article>
        </div>

        <p className="mt-6 text-sm text-gray-600">
          Source: <span className="font-medium text-gray-900">{snapshot.source}</span>
        </p>

    

        <div className="mt-6">
          <Link href={ROUTES.dashboard} className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Back to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
