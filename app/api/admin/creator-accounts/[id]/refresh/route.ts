import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest, UUID_PATTERN } from '@/lib/admin-guard';
import { refreshCreatorAccount, youtubeChannelReader } from '@/lib/creator-accounts';
import { revalidateCatalog } from '@/lib/catalog-server';
import { podcastAudienceReader } from '@/lib/podcast-audience';

// Relit un compte à sa source : chaîne YouTube (abonnés, pseudo, vues, vidéos : 1 unité de quota) ou podcast Apple (note, épisodes).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Compte invalide.' }, { status: 400 });
  try {
    const result = await refreshCreatorAccount(getDb(), id, { readChannel: youtubeChannelReader(process.env.YOUTUBE_API_KEY), readAudience: { podcast: podcastAudienceReader() } });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === 'Compte introuvable.' ? 404 : 400 });
    revalidateCatalog();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('creator account refresh failed', error);
    return NextResponse.json({ error: 'Impossible d’actualiser ce compte.' }, { status: 500 });
  }
}
