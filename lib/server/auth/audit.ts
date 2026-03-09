import 'server-only';

export type AuthAuditAction = 'register' | 'login' | 'logout' | 'unknown';

export interface AuthAuditEvent {
  action: AuthAuditAction;
  status: number;
  success: boolean;
  path: string;
  method: string;
  durationMs: number;
  ip?: string;
  userAgent?: string;
  identifier?: string;
  message?: string;
}

export function inferAuthAction(pathname: string): AuthAuditAction {
  if (pathname.includes('/register')) {
    return 'register';
  }

  if (pathname.includes('/signin') || pathname.includes('/callback/credentials')) {
    return 'login';
  }

  if (pathname.includes('/signout')) {
    return 'logout';
  }

  return 'unknown';
}

export function getClientIp(headers: Headers): string | undefined {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim();
  }

  const realIp = headers.get('x-real-ip');
  return realIp?.trim() || undefined;
}

export async function writeAuthAuditEvent(event: AuthAuditEvent): Promise<void> {
  const payload = {
    timestamp: new Date().toISOString(),
    ...event,
  };

  const webhook = process.env.AUTH_AUDIT_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });
      return;
    } catch {
      // Fall back to stdout logging.
    }
  }

  console.info(`[auth-audit] ${JSON.stringify(payload)}`);
}
