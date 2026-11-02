import { getDb } from '@/db';
import { listPodcasts, STARTER_PODCASTS } from '@/lib/podcasts-admin';
import { PodcastsView } from './podcasts-view';

export const dynamic = 'force-dynamic';

// Podcasts que Koupi lit pour trouver des codes : recherche dans Apple Podcasts, ajout, pause, retrait.
export default async function Page() {
  return <PodcastsView podcasts={await listPodcasts(getDb())} starters={[...STARTER_PODCASTS]} />;
}
