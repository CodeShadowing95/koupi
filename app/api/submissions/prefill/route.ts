import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { readJsonBody } from '@/lib/http';
import { clientHash } from '@/lib/client';
import { consumeRateLimit, PREFILL_RULE } from '@/lib/rate-limit';
import { youtubeSearch } from '@/lib/category-code-search';
import { prefillTools, readVideoPrefill } from '@/lib/submit-prefill';
import { youtubeVideoId } from '@/lib/verification-run';

// Lit une vidéo YouTube pour pré-remplir le bon « Proposer un code ». Rien n'est enregistré :
// le visiteur relit, corrige et envoie lui-même (avec Turnstile) par /api/submissions.
export async function POST(request: Request) {
  const salt = process.env.HASH_SALT || (process.env.NODE_ENV === 'production' ? '' : 'koupi-development-salt');
  const youtube = youtubeSearch(process.env.YOUTUBE_API_KEY);
  if (!salt || !youtube) return NextResponse.json({ error: 'La lecture automatique est momentanément indisponible. Remplis le bon à la main.' }, { status: 503 });
  try {
    const parsed = await readJsonBody(request, 4_000);
    if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
    const url = typeof parsed.data.url === 'string' ? parsed.data.url.trim().slice(0, 1000) : '';
    if (!youtubeVideoId(url)) return NextResponse.json({ error: 'Colle le lien d’une vidéo YouTube (youtube.com/watch, youtu.be ou un Short).' }, { status: 400 });
    const db = getDb();
    const limit = await consumeRateLimit(db, `prefill:${clientHash(request, salt)}`, PREFILL_RULE);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Tu as lu beaucoup de vidéos. Réessaie dans une heure, ou remplis le bon à la main.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } });
    }
    const prefill = await readVideoPrefill(url, youtube, await prefillTools(db));
    if (!prefill) return NextResponse.json({ error: 'Vidéo introuvable : elle est peut-être privée ou supprimée.' }, { status: 404 });
    return NextResponse.json(prefill);
  } catch (error) {
    console.error('submission prefill failed', error);
    return NextResponse.json({ error: 'La vidéo n’a pas pu être lue. Remplis le bon à la main.' }, { status: 502 });
  }
}
