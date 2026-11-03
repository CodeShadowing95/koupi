import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest } from '@/lib/admin-guard';
import { applePodcasts } from '@/lib/apple-podcasts';
import { revalidateCatalog } from '@/lib/catalog-server';
import { linkCreatorAccounts } from '@/lib/creator-account-link';
import { youtubeBatch } from '@/lib/creator-youtube-link';

export const maxDuration = 60;

// Relie d'un coup les comptes des créateurs (chaîne YouTube, podcast) d'après les sources de leurs codes.
// Sans clé YouTube, seuls les podcasts sont reliés ; le rapport le dit.
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const report = await linkCreatorAccounts(getDb(), { youtube: youtubeBatch(process.env.YOUTUBE_API_KEY), podcasts: applePodcasts() });
    if (report.linked.length) revalidateCatalog();
    return NextResponse.json({ ok: true, ...report });
  } catch (error) {
    console.error('creator accounts link failed', error);
    return NextResponse.json({ error: 'YouTube ou Apple Podcasts ne répond pas. Réessaie dans un moment.' }, { status: 502 });
  }
}
