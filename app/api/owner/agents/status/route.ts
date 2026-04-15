import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import {
  isOwnerApiSessionRejectedError,
  ownerListAgents,
} from '@/lib/server/pairing/backend';

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== 'OWNER') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const agents = await ownerListAgents();
    return NextResponse.json(
      {
        agents,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    if (isOwnerApiSessionRejectedError(error)) {
      return NextResponse.json({ message: 'Session expired' }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Failed to load agent statuses';
    return NextResponse.json({ message }, { status: 502 });
  }
}
