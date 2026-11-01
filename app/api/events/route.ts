import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { bumpCounter, isPublicCode } from '@/lib/audience';
import { clientHash } from '@/lib/client';
import { readJsonBody } from '@/lib/http';
import { publicSalt } from '@/lib/public-salt';
import { consumeRateLimit, pruneRateLimits, EVENT_RULE } from '@/lib/rate-limit';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Mesure d'audience anonyme envoyée par le site : { metric: 'copy' | 'open', codeId }.
// On ajoute 1 au total du jour. L'IP hachée ne sert qu'à limiter les abus, elle n'est pas gardée avec la mesure.
export async function POST(request: Request) {
  const salt = publicSalt();
  if (!salt) return new NextResponse(null, { status: 204 });
  try {
    const parsed = await readJsonBody(request, 300);
    if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
    const { metric, codeId } = parsed.data;
    if ((metric !== 'copy' && metric !== 'open') || typeof codeId !== 'string' || !uuidPattern.test(codeId)) return NextResponse.json({ error: 'Mesure invalide.' }, { status: 400 });
    const db = getDb();
    const limit = await consumeRateLimit(db, `event:${clientHash(request, salt)}`, EVENT_RULE);
    if (!limit.allowed) return new NextResponse(null, { status: 204 });
    if (await isPublicCode(db, codeId)) await bumpCounter(db, metric, codeId.toLowerCase());
    if (Math.random() < 0.01) await pruneRateLimits(db).catch(error => console.error('rate limit prune failed', error));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('event failed', error);
    return new NextResponse(null, { status: 204 });
  }
}
