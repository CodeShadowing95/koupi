import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { readJsonBody } from '@/lib/http';
import { clientHash, clientIp } from '@/lib/client';
import { consumeRateLimit, CREATOR_REQUEST_RULE } from '@/lib/rate-limit';
import { createCreatorRequest, parseCreatorRequest } from '@/lib/creator-requests';
import { verifyTurnstile } from '@/lib/turnstile';

// « C'est ma page » et « Page incorrecte » depuis la page publique d'un créateur.
// Mêmes protections que les propositions de codes : Turnstile en production et 5 demandes par IP et par heure.
export async function POST(request: Request) {
  const salt = process.env.HASH_SALT || (process.env.NODE_ENV === 'production' ? '' : 'koupi-development-salt');
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY || '';
  if (!salt || (!turnstileSecret && process.env.NODE_ENV === 'production')) {
    console.error('creator requests disabled: HASH_SALT or TURNSTILE_SECRET_KEY missing');
    return NextResponse.json({ error: 'Les demandes sont momentanément indisponibles.' }, { status: 503 });
  }
  try {
    const body = await readJsonBody(request, 8_000);
    if (!body.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: body.status });
    const parsed = parseCreatorRequest(body.data);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const token = typeof body.data.turnstileToken === 'string' ? body.data.turnstileToken.slice(0, 4096) : '';
    if (turnstileSecret && !(await verifyTurnstile(token, turnstileSecret, clientIp(request)))) {
      return NextResponse.json({ error: 'La vérification anti-robot a échoué. Recharge la page et réessaie.' }, { status: 400 });
    }
    const ipHash = clientHash(request, salt);
    const db = getDb();
    const limit = await consumeRateLimit(db, `creator-request:${ipHash}`, CREATOR_REQUEST_RULE);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Tu as envoyé beaucoup de demandes. Réessaie dans une heure.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } });
    }
    const created = await createCreatorRequest(db, parsed.data, ipHash);
    if (!created.ok) return NextResponse.json({ error: created.error }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('creator request create failed', error);
    return NextResponse.json({ error: 'Impossible d’envoyer la demande pour le moment.' }, { status: 500 });
  }
}
