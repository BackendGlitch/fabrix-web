import { NextResponse } from 'next/server';

export async function GET() {
  const url = 'https://api-fabrix-v2.backendglitch.com/health';
  try {
    const res = await fetch(url, { cache: 'no-store' });
    const body = await res.text();
    return NextResponse.json({ ok: res.ok, status: res.status, body, url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, cause: e.cause?.message, url });
  }
}
