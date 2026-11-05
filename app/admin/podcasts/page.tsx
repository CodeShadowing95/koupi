import { getDb } from '@/db';
import { applePodcasts } from '@/lib/apple-podcasts';
import { aiConfigFrom, aiStatusOf } from '@/lib/ai-extract';
import { listCategoriesAdmin } from '@/lib/catalog-admin';
import { toolOptions } from '@/lib/codes-admin';
import { listPodcasts, STARTER_PODCASTS } from '@/lib/podcasts-admin';
import { listToolSuggestions } from '@/lib/tool-suggestions';
import { aiSpendSince, startOfMonthUtc } from '@/lib/verification-store';
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

// Podcasts que Merkod lit pour trouver des codes : recherche dans Apple Podcasts, ajout, pause, retrait,
// et les outils absents du catalogue dont un code a été trouvé.
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const db = getDb();
  const [podcasts, suggestions, categories, tools, spent, { tab }] = await Promise.all([listPodcasts(db), listToolSuggestions(db), listCategoriesAdmin(db), toolOptions(db), aiSpendSince(db, startOfMonthUtc()), searchParams]);
  const ai = aiStatusOf(aiConfigFrom(process.env), spent);
  const images = await imagesOf(podcasts.map(podcast => podcast.feedId));
  return <PodcastsView podcasts={podcasts} nowIso={new Date().toISOString()} images={images} starters={[...STARTER_PODCASTS]} suggestions={suggestions}
    categories={categories.map(category => ({ slug: category.slug, name: category.name }))} tools={tools} ai={{ active: ai.state === 'active', label: ai.label }} initialTab={tab === 'outils' ? 'tools' : undefined} />;
}
