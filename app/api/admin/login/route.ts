import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, ADMIN_SESSION_SECONDS, createAdminToken, safeEqual } from '@/lib/admin-session';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { password?: unknown };
  const expected = process.env.ADMIN_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!expected || !secret) {
    console.error('admin login disabled: ADMIN_PASSWORD or SESSION_SECRET missing');
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
  if (typeof body.password !== 'string' || !safeEqual(body.password, expected)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, await createAdminToken(secret), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: ADMIN_SESSION_SECONDS, path: '/',
  });
  return response;
}
