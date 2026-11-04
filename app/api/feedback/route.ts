import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { readJsonBody } from '@/lib/http';
import { clientHash, clientIp } from '@/lib/client';
import { consumeRateLimit, FEEDBACK_RULE } from '@/lib/rate-limit';
import { createFeedback, parseFeedback } from '@/lib/feedback';
import { verifyTurnstile } from '@/lib/turnstile';

// Avis d'un visiteur depuis la page « Ton avis ». Mêmes protections que les autres formulaires publics :
// Turnstile en production et 5 envois par IP et par heure.
export async function POST(request: Request) {
  const salt = process.env.HASH_SALT || (process.env.NODE_ENV === 'production' ? '' : 'koupi-development-salt');
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY || '';
  if (!salt || (!turnstileSecret && process.env.NODE_ENV === 'production')) {
    console.error('feedback disabled: HASH_SALT or TURNSTILE_SECRET_KEY missing');
    return NextResponse.json({ error: 'L’envoi d’avis est momentanément indisponible.' }, { status: 503 });
  }
  try {
    const body = await readJsonBody(request, 8_000);
    if (!body.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: body.status });
    const parsed = parseFeedback(body.data);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const token = typeof body.data.turnstileToken === 'string' ? body.data.turnstileToken.slice(0, 4096) : '';
    if (turnstileSecret && !(await verifyTurnstile(token, turnstileSecret, clientIp(request)))) {
      return NextResponse.json({ error: 'La vérification anti-robot a échoué. Recharge la page et réessaie.' }, { status: 400 });
    }
    const ipHash = clientHash(request, salt);
    const db = getDb();
    const limit = await consumeRateLimit(db, `feedback:${ipHash}`, FEEDBACK_RULE);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Tu as déjà envoyé plusieurs avis. Réessaie dans une heure.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } });
    }
    await createFeedback(db, parsed.data, ipHash);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('feedback create failed', error);
    return NextResponse.json({ error: 'Impossible d’envoyer ton avis pour le moment.' }, { status: 500 });
  }
}
