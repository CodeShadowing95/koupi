import { NextResponse } from 'next/server';
import { CREATOR_COOKIE } from '@/lib/creator-session';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CREATOR_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 0, path: '/' });
  return response;
}
