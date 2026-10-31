import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { clientHash } from '@/lib/client';
import { consumeRateLimit, LOGIN_RULE } from '@/lib/rate-limit';
import { readJsonBody } from '@/lib/http';
import { ADMIN_COOKIE, ADMIN_SESSION_SECONDS, createAdminToken, safeEqual } from '@/lib/admin-session';

export async function POST(request: Request) {
  const parsed = await readJsonBody(request, 2_000);
  if (!parsed.ok) return NextResponse.json({ error: 'invalid request' }, { status: parsed.status });
  const body = parsed.data as { password?: unknown };
  const expected = process.env.ADMIN_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!expected || !secret) {
    console.error('admin login disabled: ADMIN_PASSWORD or SESSION_SECRET missing');
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
  // Limite d'essais vérifiée avant le mot de passe : une IP bloquée ne peut plus rien tester.
  // Le sel est SESSION_SECRET, déjà obligatoire pour se connecter. Si la base ne répond pas, on refuse (fail closed).
  try {
    const limit = await consumeRateLimit(getDb(), `login:${clientHash(request, secret)}`, LOGIN_RULE);
    if (!limit.allowed) return NextResponse.json({ error: 'too many attempts' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } });
  } catch (error) {
    console.error('admin login rate limit unavailable', error);
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
  if (typeof body.password !== 'string' || !safeEqual(body.password, expected)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, await createAdminToken(secret), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: ADMIN_SESSION_SECONDS, path: '/',
  });
  return response;
}
