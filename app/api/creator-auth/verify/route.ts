import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { readJsonBody } from '@/lib/http';
import { consumeSignInToken } from '@/lib/creator-auth';
import { CREATOR_COOKIE, CREATOR_SESSION_SECONDS, createCreatorToken } from '@/lib/creator-session';

// Utilise un lien de connexion. Appelé en POST par la page /creator/sign-in (pas en GET : les antivirus
// de messagerie ouvrent les liens et grilleraient le jeton).
export async function POST(request: Request) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    console.error('creator sign-in disabled: SESSION_SECRET missing');
    return NextResponse.json({ error: 'La connexion est momentanément indisponible.' }, { status: 503 });
  }
  try {
    const body = await readJsonBody(request, 1_000);
    if (!body.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: body.status });
    const token = typeof body.data.token === 'string' ? body.data.token : '';
    const result = await consumeSignInToken(getDb(), token);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(CREATOR_COOKIE, await createCreatorToken(result.data.userId, secret), {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: CREATOR_SESSION_SECONDS, path: '/',
    });
    return response;
  } catch (error) {
    console.error('creator sign-in verify failed', error);
    return NextResponse.json({ error: 'La connexion a échoué. Réessaie dans un instant.' }, { status: 500 });
  }
}
