import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest } from '@/lib/admin-guard';
import { verificationDeps } from '@/lib/verification-deps';
import { readYoutubeChannels, youtubeChannels } from '@/lib/youtube-channel-read';

// Une lecture lit chaque chaîne puis analyse chaque code trouvé : on laisse du temps.
export const maxDuration = 300;

// Lit maintenant les nouvelles vidéos de toutes les chaînes YouTube suivies.
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const youtube = youtubeChannels(process.env.YOUTUBE_API_KEY);
  if (!youtube) return NextResponse.json({ error: 'La clé YouTube (YOUTUBE_API_KEY) manque sur ce serveur.' }, { status: 503 });
  try {
    return NextResponse.json({ ok: true, ...(await readYoutubeChannels(getDb(), youtube, { deps: verificationDeps() })) });
  } catch (error) {
    console.error('youtube channels read failed', error);
    return NextResponse.json({ error: 'Lecture des chaînes impossible pour le moment.' }, { status: 500 });
  }
}
