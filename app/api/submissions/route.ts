import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { readJsonBody } from '@/lib/http';
import { clientHash } from '@/lib/client';
import { consumeRateLimit, pruneRateLimits, SUBMISSION_RULE } from '@/lib/rate-limit';
import { createSubmission } from '@/lib/submissions';

function clean(value: unknown, max: number): string { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function validUrl(value: string): boolean { try { const url = new URL(value); return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname); } catch { return false; } }

export async function POST(request: Request) {
  const salt = process.env.HASH_SALT || (process.env.NODE_ENV === 'production' ? '' : 'koupi-development-salt');
  if (!salt) {
    console.error('submissions disabled: HASH_SALT missing');
    return NextResponse.json({ error: 'Les propositions sont momentanément indisponibles.' }, { status: 503 });
  }
  try {
    const parsed = await readJsonBody(request, 20_000);
    if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
    const body = parsed.data;
    const toolName = clean(body.toolName, 120), creatorName = clean(body.creatorName, 160), code = clean(body.code, 120), discountLabel = clean(body.discountLabel, 240), sourceUrl = clean(body.sourceUrl, 1000), category = clean(body.category, 120);
    const creatorLink = clean(body.creatorLink, 1000), comment = clean(body.comment, 2000), submitterEmail = clean(body.submitterEmail, 320);
    if (!toolName || !creatorName || !code || !discountLabel || !validUrl(sourceUrl)) return NextResponse.json({ error: 'Vérifie les champs obligatoires et le lien source.' }, { status: 400 });
    if (creatorLink && !validUrl(creatorLink)) return NextResponse.json({ error: 'Le lien du créateur doit être une URL valide.' }, { status: 400 });
    if (submitterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterEmail)) return NextResponse.json({ error: 'L’adresse e-mail semble invalide.' }, { status: 400 });
    const ipHash = clientHash(request, salt);
    const db = getDb();
    const limit = await consumeRateLimit(db, `submit:${ipHash}`, SUBMISSION_RULE);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Tu as envoyé beaucoup de propositions. Réessaie dans une heure.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } });
    }
    await createSubmission(db, { toolName, creatorName, code, discountLabel, sourceUrl, category, creatorLink, comment, submitterEmail }, ipHash);
    if (Math.random() < 0.02) await pruneRateLimits(db).catch(error => console.error('rate limit prune failed', error));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('submission create failed', error);
    return NextResponse.json({ error: 'Impossible d’enregistrer la proposition pour le moment.' }, { status: 500 });
  }
}
