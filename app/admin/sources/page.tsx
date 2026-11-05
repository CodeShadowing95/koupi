import { getDb } from '@/db';
import { listRuns, sourceActivity, sourceInventory, yieldByOrigin } from '@/lib/source-runs';
import { SourcesView } from './sources-view';

export const dynamic = 'force-dynamic';

// D'où viennent les codes : chaque source (recherche YouTube, chaînes et podcasts suivis, visiteurs, ajouts à la main),
// ce qu'elle rapporte, ce qu'elle coûte, et le journal de ses derniers passages.
export default async function Page() {
  const db = getDb();
  const now = new Date();
  const [activity, yields, inventory, runs] = await Promise.all([sourceActivity(db, now), yieldByOrigin(db, now), sourceInventory(db), listRuns(db, 40)]);
  return <SourcesView activity={activity} yields={yields} inventory={inventory} runs={runs} now={now.toISOString()} youtubeReady={Boolean(process.env.YOUTUBE_API_KEY)} />;
}
