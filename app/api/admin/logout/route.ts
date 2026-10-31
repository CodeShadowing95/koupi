import { NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/admin-session';

// Déconnexion : efface le cookie de session puis renvoie vers la page de connexion.
export function POST(request: Request) {
  const response = NextResponse.redirect(new URL('/admin/login', request.url), 303);
  response.cookies.set(ADMIN_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 0, path: '/' });
  return response;
}
