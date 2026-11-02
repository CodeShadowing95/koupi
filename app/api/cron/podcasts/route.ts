import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { safeEqual } from '@/lib/admin-session';
import { applePodcasts } from '@/lib/apple-podcasts';
import { readPodcasts } from '@/lib/podcast-read';
import { verificationDeps } from '@/lib/verification-deps';

export const maxDuration = 300;

// Tâche planifiée Vercel (vercel.json) : lit chaque nuit les nouveaux épisodes des podcasts suivis.
// Les codes trouvés arrivent en attente dans Vérifications. Désactivée sans CRON_SECRET.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'Lecture désactivée : CRON_SECRET manquant.' }, { status: 503 });
  if (!safeEqual(request.headers.get('authorization') ?? '', `Bearer ${secret}`)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const report = await readPodcasts(getDb(), applePodcasts(), { deps: verificationDeps() });
    return NextResponse.json({ ok: true, podcasts: report.podcasts, episodes: report.episodes, codesFound: report.found.length, failed: report.failed.length });
  } catch (error) {
    console.error('cron podcast read failed', error);
    return NextResponse.json({ error: 'Lecture des podcasts impossible pour le moment.' }, { status: 500 });
  }
}
