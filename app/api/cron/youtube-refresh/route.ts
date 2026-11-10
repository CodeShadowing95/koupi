import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { safeEqual } from '@/lib/admin-session';
import { refreshAllAccounts } from '@/lib/accounts-refresh';
import { applePodcasts } from '@/lib/apple-podcasts';
import { revalidateCatalog } from '@/lib/catalog-server';
import { youtubeBatch } from '@/lib/creator-youtube-link';
import { podcastAudienceReader } from '@/lib/podcast-audience';
import { refreshCreatorAvatars } from '@/lib/stored-images';
import { purgeStaleYoutubeData } from '@/lib/youtube-retention';

export const maxDuration = 300;

// Tâche planifiée Vercel (vercel.json), chaque lundi : règle des 30 jours de l'API YouTube (ADR-0049).
// Relit les abonnés et les photos des chaînes (1 unité de quota par lot de 50 chaînes), puis efface ce qui a plus
// de 30 jours et n'a pas pu être relu. Sans clé YouTube, rien n'est relu : l'effacement se fait quand même.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'Tâche désactivée : CRON_SECRET manquant.' }, { status: 503 });
  if (!safeEqual(request.headers.get('authorization') ?? '', `Bearer ${secret}`)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const db = getDb();
  const youtube = youtubeBatch(process.env.YOUTUBE_API_KEY);
  let refreshed = { accounts: 0, photos: 0 };
  try {
    const accounts = await refreshAllAccounts(db, { youtube, podcast: podcastAudienceReader() });
    const photos = await refreshCreatorAvatars(db, { youtube, podcasts: applePodcasts() });
    refreshed = { accounts: accounts.youtube + accounts.podcasts, photos: photos.updated.length };
  } catch (error) {
    // YouTube ou Apple ne répond pas : on efface quand même ce qui est périmé.
    console.error('cron youtube refresh failed', error);
  }
  try {
    const purged = await purgeStaleYoutubeData(db);
    if (refreshed.accounts || refreshed.photos || purged.accounts || purged.photos) revalidateCatalog();
    return NextResponse.json({ ok: true, refreshed, purged });
  } catch (error) {
    console.error('cron youtube purge failed', error);
    return NextResponse.json({ error: 'Effacement des données YouTube périmées impossible pour le moment.' }, { status: 500 });
  }
}
