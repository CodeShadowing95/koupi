import { getDb } from '@/db';
import { applePodcasts } from '@/lib/apple-podcasts';
import { listPodcasts, STARTER_PODCASTS } from '@/lib/podcasts-admin';
import { PodcastsView } from './podcasts-view';

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

// Podcasts que Koupi lit pour trouver des codes : recherche dans Apple Podcasts, ajout, pause, retrait.
export default async function Page() {
  const podcasts = await listPodcasts(getDb());
  const images = await imagesOf(podcasts.map(podcast => podcast.feedId));
  return <PodcastsView podcasts={podcasts} images={images} starters={[...STARTER_PODCASTS]} />;
}
