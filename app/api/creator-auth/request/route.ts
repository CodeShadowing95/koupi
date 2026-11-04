import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { readJsonBody } from '@/lib/http';
import { clientHash, clientIp } from '@/lib/client';
import { hashIp } from '@/lib/submissions';
import { consumeRateLimit, CREATOR_SIGN_IN_EMAIL_RULE, CREATOR_SIGN_IN_RULE } from '@/lib/rate-limit';
import { createSignInLink, parseSignInRequest, pruneSignInTokens } from '@/lib/creator-auth';
import { mailerFromEnv, signInMail } from '@/lib/creator-mail';
import { verifyTurnstile } from '@/lib/turnstile';

// Demande d'un lien de connexion (ADR-0021). Turnstile, limites par IP et par e-mail.
// L'adresse du lien vient toujours de NEXT_PUBLIC_APP_URL en production, jamais de l'en-tête Host (falsifiable).
export async function POST(request: Request) {
  const production = process.env.NODE_ENV === 'production';
  const salt = process.env.HASH_SALT || (production ? '' : 'koupi-development-salt');
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY || '';
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || (production ? '' : new URL(request.url).origin)).replace(/\/+$/, '');
  if (!salt || !appUrl || (!turnstileSecret && production)) {
    console.error('creator sign-in disabled: HASH_SALT, NEXT_PUBLIC_APP_URL or TURNSTILE_SECRET_KEY missing');
    return NextResponse.json({ error: 'La connexion est momentanément indisponible.' }, { status: 503 });
  }
  try {
    const body = await readJsonBody(request, 4_000);
    if (!body.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: body.status });
    const parsed = parseSignInRequest(body.data);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const token = typeof body.data.turnstileToken === 'string' ? body.data.turnstileToken.slice(0, 4096) : '';
    if (turnstileSecret && !(await verifyTurnstile(token, turnstileSecret, clientIp(request)))) {
      return NextResponse.json({ error: 'La vérification anti-robot a échoué. Recharge la page et réessaie.' }, { status: 400 });
    }
    const db = getDb();
    const ipHash = clientHash(request, salt);
    const tooMany = (seconds: number) => NextResponse.json({ error: 'Beaucoup de demandes d’un coup. Réessaie dans un moment.' }, { status: 429, headers: { 'Retry-After': String(seconds) } });
    const byIp = await consumeRateLimit(db, `creator-sign-in:${ipHash}`, CREATOR_SIGN_IN_RULE);
    if (!byIp.allowed) return tooMany(byIp.retryAfterSeconds);
    const byEmail = await consumeRateLimit(db, `creator-sign-in-email:${hashIp(parsed.data.email, salt)}`, CREATOR_SIGN_IN_EMAIL_RULE);
    if (!byEmail.allowed) return tooMany(byEmail.retryAfterSeconds);

    const created = await createSignInLink(db, parsed.data, { ipHash, appUrl });
    if (!created.ok) return NextResponse.json({ error: created.error }, { status: 404 });
    await pruneSignInTokens(db);
    const mailer = mailerFromEnv();
    // Pas encore d'envoi d'e-mails en production : la revendication est notée, l'admin recontacte la personne.
    if (!mailer) return NextResponse.json({ ok: true, sent: false });
    await mailer(signInMail(parsed.data.email, created.data.link, created.data.creatorName));
    return NextResponse.json({ ok: true, sent: true });
  } catch (error) {
    console.error('creator sign-in request failed', error);
    return NextResponse.json({ error: 'Impossible d’envoyer le lien pour le moment. Réessaie dans un instant.' }, { status: 500 });
  }
}
