import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

export const PUBLIC_HEALTH_TAG = 'public-health';

export interface PublicHealthSnapshot {
  status: string;
  service: string;
  database: string;
  timestamp: string;
  source: 'backend' | 'fallback';
}

function getApiBaseUrl(): string {
  const url = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'https://api-fabrix.backendglitch.com';
  if (!url) {
    throw new Error('Missing API URL. Set API_URL or NEXT_PUBLIC_API_URL.');
  }

  return url.replace(/\/$/, '');
}

export async function getPublicHealthSnapshot(): Promise<PublicHealthSnapshot> {
  'use cache';

  cacheTag(PUBLIC_HEALTH_TAG);
  cacheLife('health');

  try {
    const response = await fetch(`${getApiBaseUrl()}/health`, {
      cache: 'force-cache',
    });

    if (!response.ok) {
      throw new Error(`Health endpoint returned ${response.status}`);
    }

    const data = (await response.json()) as Partial<PublicHealthSnapshot>;

    return {
      status: typeof data.status === 'string' ? data.status : 'unknown',
      service: typeof data.service === 'string' ? data.service : 'fabrix-central',
      database: typeof data.database === 'string' ? data.database : 'unknown',
      timestamp: typeof data.timestamp === 'string' ? data.timestamp : 'unknown',
      source: 'backend',
    };
  } catch {
    return {
      status: 'degraded',
      service: 'fabrix-central',
      database: 'unreachable',
      timestamp: 'unknown',
      source: 'fallback',
    };
  }
}
