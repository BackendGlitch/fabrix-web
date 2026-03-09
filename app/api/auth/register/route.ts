import { after, NextResponse } from 'next/server';

import { ROUTES } from '@/lib/routes';
import {
  BackendAuthError,
  logoutFromBackend,
  registerWithBackend,
} from '@/lib/server/auth/backend';
import { getClientIp, writeAuthAuditEvent } from '@/lib/server/auth/audit';

export async function POST(request: Request) {
  const routePath = ROUTES.api.authRegister;
  const startedAt = Date.now();
  const userAgent = request.headers.get('user-agent') ?? undefined;
  const ip = getClientIp(request.headers);

  try {
    const body = await request.json();

    const email = typeof body?.email === 'string' ? body.email : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const name = typeof body?.name === 'string' ? body.name : '';
    const role = body?.role === 'OWNER' ? 'OWNER' : body?.role === 'CUSTOMER' ? 'CUSTOMER' : '';

    if (!email || !password || !name || !role) {
      after(async () => {
        await writeAuthAuditEvent({
          action: 'register',
          status: 400,
          success: false,
          path: routePath,
          method: 'POST',
          durationMs: Date.now() - startedAt,
          ip,
          userAgent,
          identifier: email || undefined,
          message: 'Invalid request payload',
        });
      });

      return NextResponse.json(
        { message: 'email, password, name and role are required' },
        { status: 400 },
      );
    }

    const registration = await registerWithBackend({
      email,
      password,
      name,
      role,
    });

    try {
      await logoutFromBackend(registration.refreshToken);
    } catch {
      // Keep registration successful even if cleanup logout fails.
    }

    after(async () => {
      await writeAuthAuditEvent({
        action: 'register',
        status: 201,
        success: true,
        path: routePath,
        method: 'POST',
        durationMs: Date.now() - startedAt,
        ip,
        userAgent,
        identifier: registration.user.email,
      });
    });

    return NextResponse.json(
      {
        message: 'Registration successful',
        user: registration.user,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof BackendAuthError) {
      after(async () => {
        await writeAuthAuditEvent({
          action: 'register',
          status: error.status,
          success: false,
          path: routePath,
          method: 'POST',
          durationMs: Date.now() - startedAt,
          ip,
          userAgent,
          message: error.message,
        });
      });

      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    after(async () => {
      await writeAuthAuditEvent({
        action: 'register',
        status: 500,
        success: false,
        path: routePath,
        method: 'POST',
        durationMs: Date.now() - startedAt,
        ip,
        userAgent,
        message: 'Unhandled registration error',
      });
    });

    return NextResponse.json({ message: 'Registration failed' }, { status: 500 });
  }
}
