import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/db';
import { readJsonBody } from '@/lib/http';
import { loadCreatorAccount } from '@/lib/creator-auth';
import { startOwnPage } from '@/lib/creator-start';
import { CREATOR_COOKIE, readCreatorToken } from '@/lib/creator-session';
import { consumeRateLimit, CREATOR_SIGN_IN_RULE } from '@/lib/rate-limit';

// « Passer cette étape » : le créateur connecté ouvre son studio sur une page à son nom, non vérifiée.
export async function POST(request: NextRequest) {
  const userId = await readCreatorToken(request.cookies.get(CREATOR_COOKIE)?.value, process.env.SESSION_SECRET);
  const db = getDb();
  const user = userId ? await loadCreatorAccount(db, userId) : null;
  if (!user) return NextResponse.json({ error: 'Connecte-toi d’abord.' }, { status: 401 });
  try {
    const body = await readJsonBody(request, 500);
    if (!body.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: body.status });
    const limit = await consumeRateLimit(db, `creator-start:${user.id}`, CREATOR_SIGN_IN_RULE);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Beaucoup d’essais d’un coup. Réessaie dans un moment.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } });
    }
    const result = await startOwnPage(db, user, body.data.name);
    if (!result.ok) return NextResponse.json({ error: result.error, match: result.match ?? null }, { status: result.match ? 409 : 400 });
    return NextResponse.json({ ok: true, ...result.data });
  } catch (error) {
    console.error('creator start failed', error);
    return NextResponse.json({ error: 'Impossible d’ouvrir ton studio pour le moment. Réessaie dans un instant.' }, { status: 500 });
  }
}
