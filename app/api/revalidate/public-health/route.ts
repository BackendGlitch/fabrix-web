import { NextResponse } from 'next/server';

import { PUBLIC_HEALTH_TAG } from '@/lib/server/cache/public-health';
import { revalidatePublicHealthTag } from '@/lib/server/revalidate/public-health';

function getProvidedSecret(request: Request, body: unknown): string | undefined {
  const fromUrl = new URL(request.url).searchParams.get('secret');
  if (fromUrl) {
    return fromUrl.trim();
  }

  const fromCustomHeader = request.headers.get('x-revalidate-secret');
  if (fromCustomHeader) {
    return fromCustomHeader.trim();
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }

  if (body && typeof body === 'object') {
    const secret = (body as { secret?: unknown }).secret;
    if (typeof secret === 'string') {
      return secret;
    }
  }

  return undefined;
}

export async function POST(request: Request) {
  const expectedSecret = process.env.REVALIDATE_SECRET;

  if (!expectedSecret) {
    return NextResponse.json(
      { message: 'Missing REVALIDATE_SECRET in environment' },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => null);
  const providedSecret = getProvidedSecret(request, body);
  if (!providedSecret) {
    return NextResponse.json(
      {
        message: 'Missing revalidation secret. Provide Bearer token, x-revalidate-secret header, ?secret=..., or {\"secret\":\"...\"} body.',
      },
      { status: 400 },
    );
  }

  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ message: 'Invalid revalidation secret' }, { status: 401 });
  }

  revalidatePublicHealthTag('max');

  return NextResponse.json({ revalidated: true, tag: PUBLIC_HEALTH_TAG });
}
