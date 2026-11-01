import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { recordVote } from '@/lib/audience';
import { clientHash } from '@/lib/client';
import { readJsonBody } from '@/lib/http';
import { publicSalt } from '@/lib/public-salt';
import { consumeRateLimit, pruneRateLimits, VOTE_PER_CODE_RULE, VOTE_RULE } from '@/lib/rate-limit';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Vote d'un visiteur sur un code : { worked: true | false }. Une seule fois par code et par jour depuis une même IP (hachée).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidPattern.test(id)) return NextResponse.json({ error: 'Code invalide.' }, { status: 400 });
  const salt = publicSalt();
  if (!salt) return NextResponse.json({ error: 'Les votes sont momentanément indisponibles.' }, { status: 503 });
  try {
    const parsed = await readJsonBody(request, 200);
    if (!parsed.ok || typeof parsed.data.worked !== 'boolean') return NextResponse.json({ error: 'Vote invalide.' }, { status: 400 });
    const db = getDb();
    const ipHash = clientHash(request, salt);
    const burst = await consumeRateLimit(db, `vote:${ipHash}`, VOTE_RULE);
    if (!burst.allowed) return NextResponse.json({ error: 'Trop de votes. Réessaie plus tard.' }, { status: 429, headers: { 'Retry-After': String(burst.retryAfterSeconds) } });
    const once = await consumeRateLimit(db, `vote:${ipHash}:${id}`, VOTE_PER_CODE_RULE);
    if (!once.allowed) return NextResponse.json({ error: 'Tu as déjà voté pour ce code aujourd’hui. Merci !' }, { status: 409 });
    const votes = await recordVote(db, id, parsed.data.worked);
    if (!votes) return NextResponse.json({ error: 'Code introuvable.' }, { status: 404 });
    if (Math.random() < 0.02) await pruneRateLimits(db).catch(error => console.error('rate limit prune failed', error));
    return NextResponse.json({ ok: true, ...votes });
  } catch (error) {
    console.error('vote failed', error);
    return NextResponse.json({ error: 'Le vote n’a pas pu être enregistré.' }, { status: 500 });
  }
}
