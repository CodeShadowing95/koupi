import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest } from '@/lib/admin-guard';
import { revalidateCatalog } from '@/lib/catalog-server';
import { linkYoutubeChannels, youtubeBatch } from '@/lib/creator-youtube-link';

export const maxDuration = 60;

// Relie d'un coup la chaîne YouTube de tous les créateurs qui n'en ont pas, d'après les vidéos sources de leurs codes.
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const youtube = youtubeBatch(process.env.YOUTUBE_API_KEY);
  if (!youtube) return NextResponse.json({ error: 'La clé YouTube (YOUTUBE_API_KEY) manque : les chaînes ne peuvent pas être lues.' }, { status: 503 });
  try {
    const report = await linkYoutubeChannels(getDb(), youtube);
    if (report.linked.length) revalidateCatalog();
    return NextResponse.json({ ok: true, ...report });
  } catch (error) {
    console.error('youtube channels link failed', error);
    return NextResponse.json({ error: 'YouTube ne répond pas. Réessaie dans un moment.' }, { status: 502 });
  }
}
