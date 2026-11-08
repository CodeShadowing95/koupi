import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/db';
import { readJsonBody } from '@/lib/http';
import { loadCreatorAccount } from '@/lib/creator-auth';
import { addCreatorCode, parseCreatorCode } from '@/lib/creator-codes';
import { CREATOR_COOKIE, readCreatorToken } from '@/lib/creator-session';
import { consumeRateLimit, CREATOR_PROOF_RULE } from '@/lib/rate-limit';
import { revalidateCatalog } from '@/lib/catalog-server';
import { routes } from '@/lib/routes';
import { siteUrl } from '@/lib/seo';

// « Ajouter une offre » dans le Studio (ADR-0043) : publié tout de suite si le créateur est prouvé, sinon relu par l'admin.
export async function POST(request: NextRequest) {
  const userId = await readCreatorToken(request.cookies.get(CREATOR_COOKIE)?.value, process.env.SESSION_SECRET);
  const db = getDb();
  const user = userId ? await loadCreatorAccount(db, userId) : null;
  if (!user) return NextResponse.json({ error: 'Connecte-toi d’abord.' }, { status: 401 });
  if (!user.creator) return NextResponse.json({ error: 'Ouvre d’abord ton studio sur ta page.' }, { status: 409 });
  try {
    const body = await readJsonBody(request, 4_000);
    if (!body.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: body.status });
    const parsed = parseCreatorCode(body.data);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const limit = await consumeRateLimit(db, `creator-codes:${user.id}`, CREATOR_PROOF_RULE);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Beaucoup de codes d’un coup. Réessaie dans un moment.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } });
    }
    const result = await addCreatorCode(db, user.creator, parsed.data, `${siteUrl()}${routes.creator(user.creator.slug)}`);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    if (result.data.status === 'to_test') revalidateCatalog();
    return NextResponse.json({ ok: true, ...result.data });
  } catch (error) {
    console.error('creator code failed', error);
    return NextResponse.json({ error: 'Impossible d’ajouter ce code pour le moment. Réessaie dans un instant.' }, { status: 500 });
  }
}
