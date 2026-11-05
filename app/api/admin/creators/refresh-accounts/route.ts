import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest } from '@/lib/admin-guard';
import { revalidateCatalog } from '@/lib/catalog-server';
import { youtubeBatch } from '@/lib/creator-youtube-link';
import { podcastAudienceReader } from '@/lib/podcast-audience';
import { refreshAllAccounts } from '@/lib/accounts-refresh';

export const maxDuration = 60;

// « Actualiser les comptes » : abonnés, audience, pays et langue de toutes les chaînes YouTube (1 unité par lot de 50),
// et d'un paquet de podcasts (les moins récemment relus d'abord). Sans clé YouTube, seuls les podcasts sont relus.
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const report = await refreshAllAccounts(getDb(), { youtube: youtubeBatch(process.env.YOUTUBE_API_KEY), podcast: podcastAudienceReader() });
    if (report.youtube || report.podcasts) revalidateCatalog();
    return NextResponse.json({ ok: true, ...report });
  } catch (error) {
    console.error('accounts refresh failed', error);
    return NextResponse.json({ error: 'YouTube ou Apple Podcasts ne répond pas. Réessaie dans un moment.' }, { status: 502 });
  }
}
