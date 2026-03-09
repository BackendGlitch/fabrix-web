import 'server-only';

import { revalidateTag } from 'next/cache';

import { PUBLIC_HEALTH_TAG } from '@/lib/server/cache/public-health';

export function revalidatePublicHealthTag(profile: string = 'max'): void {
  revalidateTag(PUBLIC_HEALTH_TAG, profile);
}
