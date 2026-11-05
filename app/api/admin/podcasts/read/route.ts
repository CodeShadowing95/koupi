import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest, UUID_PATTERN } from '@/lib/admin-guard';
import { readJsonBody } from '@/lib/http';
import { applePodcasts } from '@/lib/apple-podcasts';
import { readPodcasts } from '@/lib/podcast-read';
import { verificationDeps } from '@/lib/verification-deps';
import { recordRun } from '@/lib/source-runs';
import { podcastSummary } from '@/lib/source-run-summaries';

// Une lecture lit chaque podcast puis analyse chaque code trouvé : on laisse du temps.
export const maxDuration = 300;

// Lit maintenant les épisodes récents de tous les podcasts actifs, ou d'un seul ({ id }).
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const parsed = await readJsonBody(request, 200);
  if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
  const id = parsed.data.id;
  if (id !== undefined && (typeof id !== 'string' || !UUID_PATTERN.test(id))) return NextResponse.json({ error: 'Podcast invalide.' }, { status: 400 });
  try {
    const db = getDb();
    const report = await recordRun(db, { source: 'podcast', trigger: 'manual', scope: id ? 'Un podcast' : 'Tous les podcasts suivis' },
      () => readPodcasts(db, applePodcasts(), { onlyId: id, deps: verificationDeps() }), podcastSummary);
    return NextResponse.json({ ok: true, ...report });
  } catch (error) {
    console.error('podcast read failed', error);
    return NextResponse.json({ error: 'Lecture des podcasts impossible pour le moment.' }, { status: 500 });
  }
}
