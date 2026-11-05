import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { safeEqual } from '@/lib/admin-session';
import { readJsonBody } from '@/lib/http';
import { catalogToolIds, saveCandidates, scriptCatalog } from '@/lib/podcast-candidates';
import { parseCandidates } from '@/lib/podcast-index';

export const maxDuration = 60;

// Appelée par le script hebdomadaire de la GitHub Action Podcast Index (ADR-0036), avec le même secret que les tâches
// de nuit (CRON_SECRET). GET : les outils du catalogue et les podcasts déjà suivis. POST : les podcasts candidats.
function denied(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'Désactivé : CRON_SECRET manquant.' }, { status: 503 });
  if (!safeEqual(request.headers.get('authorization') ?? '', `Bearer ${secret}`)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  return null;
}

export async function GET(request: NextRequest) {
  const refused = denied(request);
  if (refused) return refused;
  try {
    return NextResponse.json(await scriptCatalog(getDb()));
  } catch (error) {
    console.error('podcast index catalog failed', error);
    return NextResponse.json({ error: 'Catalogue indisponible.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const refused = denied(request);
  if (refused) return refused;
  try {
    const parsed = await readJsonBody(request, 2_000_000);
    if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
    const db = getDb();
    const candidates = parseCandidates(parsed.data.candidates, await catalogToolIds(db));
    const result = await saveCandidates(db, candidates);
    return NextResponse.json({ ok: true, received: Array.isArray(parsed.data.candidates) ? parsed.data.candidates.length : 0, valid: candidates.length, ...result });
  } catch (error) {
    console.error('podcast index save failed', error);
    return NextResponse.json({ error: 'Enregistrement impossible pour le moment.' }, { status: 500 });
  }
}
