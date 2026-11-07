import { getDb } from '@/db';
import { applePodcasts } from '@/lib/apple-podcasts';
import { listPodcasts, STARTER_PODCASTS } from '@/lib/podcasts-admin';
import { listCandidates } from '@/lib/podcast-candidates';
import { redirect } from 'next/navigation';
import { PodcastsView } from './podcasts-view';

export const metadata = { title: 'Podcasts suivis · Admin Merkod' };

export const dynamic = 'force-dynamic';

// Images des podcasts suivis, relues dans Apple Podcasts en un appel. Sans réponse, la liste s'affiche sans images.
async function imagesOf(feedIds: string[]): Promise<Record<string, string>> {
  try {
    const feeds = await applePodcasts().podcasts(feedIds.map(Number));
    return Object.fromEntries(feeds.filter(feed => feed.image).map(feed => [String(feed.id), feed.image]));
  } catch (error) {
    console.error('podcast images failed', error);
    return {};
  }
}

// Podcasts que Merkod lit pour trouver des codes : recherche dans Apple Podcasts, ajout, pause, retrait.
// Les outils absents du catalogue ont leur page sous Outils (/admin/outils/a-ajouter) ; l'ancien onglet y redirige.
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  if (tab === 'outils') redirect('/admin/outils/a-ajouter');
  const db = getDb();
  const [podcasts, candidates] = await Promise.all([listPodcasts(db), listCandidates(db)]);
  const images = await imagesOf(podcasts.map(podcast => podcast.feedId));
  return <PodcastsView podcasts={podcasts} nowIso={new Date().toISOString()} images={images} starters={[...STARTER_PODCASTS]}
    initialTab={tab === 'candidats' ? 'candidates' : undefined} candidates={candidates} />;
}
