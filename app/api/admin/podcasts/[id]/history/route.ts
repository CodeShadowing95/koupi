import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest, UUID_PATTERN } from '@/lib/admin-guard';
import { applePodcasts } from '@/lib/apple-podcasts';
import { podcastHistory } from '@/lib/podcast-history';

export const dynamic = 'force-dynamic';

// Derniers épisodes d'un podcast suivi, lus ou non, avec les codes trouvés dans chacun.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Podcast invalide.' }, { status: 400 });
  try {
    const history = await podcastHistory(getDb(), applePodcasts(), id);
    return history ? NextResponse.json(history) : NextResponse.json({ error: 'Podcast introuvable.' }, { status: 404 });
  } catch (error) {
    console.error('podcast history failed', error);
    return NextResponse.json({ error: 'Apple Podcasts ne répond pas. Réessaie dans un instant.' }, { status: 502 });
  }
}
