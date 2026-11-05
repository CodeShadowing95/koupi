import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest } from '@/lib/admin-guard';
import { readJsonBody } from '@/lib/http';
import { applePodcasts } from '@/lib/apple-podcasts';
import { followPodcast } from '@/lib/podcasts-admin';
import { refreshCreatorAvatars } from '@/lib/stored-images';
import { revalidateCatalog } from '@/lib/catalog-server';

// Suit un podcast. Seul son identifiant Apple est lu dans la requête : le reste est relu dans l'annuaire.
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const parsed = await readJsonBody(request, 500);
    if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
    const podcastId = Number(parsed.data.podcastId);
    if (!Number.isSafeInteger(podcastId) || podcastId <= 0) return NextResponse.json({ error: 'Podcast invalide.' }, { status: 400 });
    let feed;
    try { feed = await applePodcasts().podcast(podcastId); }
    catch (error) { console.error('podcast lookup failed', error); return NextResponse.json({ error: 'Apple Podcasts ne répond pas. Réessaie dans un moment.' }, { status: 502 }); }
    if (!feed) return NextResponse.json({ error: 'Ce podcast n’existe plus dans Apple Podcasts.' }, { status: 404 });
    const db = getDb();
    const result = await followPodcast(db, feed);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
    // Le créateur du podcast prend sa pochette comme photo s'il n'en a pas encore. Un échec ne gâche pas le suivi.
    const photo = await refreshCreatorAvatars(db, { podcasts: applePodcasts() }, { onlyCreatorId: result.data.creatorId, missingOnly: true })
      .catch(error => { console.error('podcast creator avatar failed', error); return null; });
    if (photo?.updated.length) revalidateCatalog();
    return NextResponse.json({ ok: true, id: result.data.id });
  } catch (error) {
    console.error('podcast follow failed', error);
    return NextResponse.json({ error: 'Impossible de suivre ce podcast.' }, { status: 500 });
  }
}
