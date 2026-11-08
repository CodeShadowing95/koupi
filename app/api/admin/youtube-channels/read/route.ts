import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest } from '@/lib/admin-guard';
import { verificationDeps } from '@/lib/verification-deps';
import { creatorFinder } from '@/lib/compilation-creator';
import { readYoutubeChannels, youtubeChannels } from '@/lib/youtube-channel-read';
import { recordRun } from '@/lib/source-runs';
import { channelSummary } from '@/lib/source-run-summaries';

// Une lecture lit chaque chaîne puis analyse chaque code trouvé : on laisse du temps.
export const maxDuration = 300;

// Lit maintenant les nouvelles vidéos de toutes les chaînes YouTube suivies.
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const youtube = youtubeChannels(process.env.YOUTUBE_API_KEY);
  if (!youtube) return NextResponse.json({ error: 'La clé YouTube (YOUTUBE_API_KEY) manque sur ce serveur.' }, { status: 503 });
  try {
    const db = getDb();
    const report = await recordRun(db, { source: 'youtube_channel', trigger: 'manual', scope: 'Toutes les chaînes suivies' },
      () => readYoutubeChannels(db, youtube, { deps: verificationDeps(), creators: creatorFinder(process.env.YOUTUBE_API_KEY) }), channelSummary);
    return NextResponse.json({ ok: true, ...report });
  } catch (error) {
    console.error('youtube channels read failed', error);
    return NextResponse.json({ error: 'Lecture des chaînes impossible pour le moment.' }, { status: 500 });
  }
}
