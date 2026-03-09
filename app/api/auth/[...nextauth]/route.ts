import { after, type NextRequest } from 'next/server';

import { handlers } from '@/auth';
import {
  getClientIp,
  inferAuthAction,
  writeAuthAuditEvent,
} from '@/lib/server/auth/audit';

type AuthHandler = (request: NextRequest) => Promise<Response>;

function withAudit(handler: AuthHandler): AuthHandler {
  return async (request) => {
    const startedAt = Date.now();
    const response = await handler(request);

    const action = inferAuthAction(request.nextUrl.pathname);
    if (action !== 'unknown') {
      after(async () => {
        await writeAuthAuditEvent({
          action,
          status: response.status,
          success: response.ok,
          path: request.nextUrl.pathname,
          method: request.method,
          durationMs: Date.now() - startedAt,
          ip: getClientIp(request.headers),
          userAgent: request.headers.get('user-agent') ?? undefined,
        });
      });
    }

    return response;
  };
}

export const GET = withAudit(handlers.GET);
export const POST = withAudit(handlers.POST);
