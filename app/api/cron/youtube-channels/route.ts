import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { safeEqual } from '@/lib/admin-session';
import { verificationDeps } from '@/lib/verification-deps';
import { readYoutubeChannels, youtubeChannels } from '@/lib/youtube-channel-read';
import { recordRun } from '@/lib/source-runs';
import { channelSummary } from '@/lib/source-run-summaries';

export const maxDuration = 300;

// Tâche planifiée Vercel (vercel.json) : lit chaque nuit les nouvelles vidéos des chaînes YouTube suivies.
// Les codes trouvés arrivent en attente dans Vérifications. Désactivée sans CRON_SECRET ou sans clé YouTube.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'Lecture désactivée : CRON_SECRET manquant.' }, { status: 503 });
  if (!safeEqual(request.headers.get('authorization') ?? '', `Bearer ${secret}`)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const youtube = youtubeChannels(process.env.YOUTUBE_API_KEY);
  if (!youtube) return NextResponse.json({ error: 'Lecture désactivée : YOUTUBE_API_KEY manquant.' }, { status: 503 });
  try {
    const db = getDb();
    const report = await recordRun(db, { source: 'youtube_channel', trigger: 'cron', scope: 'Toutes les chaînes suivies' },
      () => readYoutubeChannels(db, youtube, { deps: verificationDeps() }), channelSummary);
    return NextResponse.json({ ok: true, channels: report.channels, videos: report.videos, units: report.units, codesFound: report.found.length, failed: report.failed.length });
  } catch (error) {
    console.error('cron youtube channels read failed', error);
    return NextResponse.json({ error: 'Lecture des chaînes impossible pour le moment.' }, { status: 500 });
  }
}
