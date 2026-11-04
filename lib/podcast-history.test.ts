import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import type { PodcastDirectory, PodcastEpisode } from './apple-podcasts';
import { podcastHistory } from './podcast-history';
import { readPodcasts } from './podcast-read';
import { followPodcast, listPodcasts } from './podcasts-admin';

const now = new Date('2026-11-02T03:00:00Z');
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);
const episode = (id: number, description: string, published: Date | null): PodcastEpisode => ({ id, title: `Épisode ${id}`, link: '', description, publishedAt: published });
const directory = (episodes: PodcastEpisode[]): PodcastDirectory => ({ search: vi.fn(), podcast: vi.fn(), podcasts: vi.fn(), episodes: vi.fn(async () => episodes) });

describe('podcastHistory', () => {
  let db: Db;
  beforeEach(async () => {
    db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    await db.insert(schema.categories).values({ slug: 'vpn', name: 'VPN' });
    await db.insert(schema.tools).values({ slug: 'nordvpn', name: 'NordVPN', categorySlug: 'vpn', website: 'https://nordvpn.com' });
    await followPodcast(db, { id: 42, title: 'Silicon Carne', author: '', feedUrl: '', link: '', image: '', episodeCount: 3, genre: '' });
    await db.update(schema.watchedSources).set({ createdAt: daysAgo(3) });
  });

  it('montre les épisodes lus et ce qui a été trouvé dans chacun', async () => {
    const episodes = [
      episode(3, 'Pas encore lu, NordVPN : code PLUSTARD', null),
      episode(2, 'NordVPN : code CARNE\nGradium : code GDIY sur gradium.ai', daysAgo(2)),
      episode(1, 'Trop vieux, NordVPN : code VIEUX', daysAgo(90)),
    ];
    await readPodcasts(db, directory(episodes), { now });
    const [podcast] = await listPodcasts(db);
    const history = await podcastHistory(db, directory(episodes), podcast.id);
    expect(history?.lastFetchedAt).toBe(now.toISOString());
    expect(history?.episodes.map(item => [item.id, item.read])).toEqual([[3, false], [2, true], [1, false]]);
    const [, second] = history!.episodes;
    expect(second.link).toBe('https://podcasts.apple.com/podcast/id42?i=2');
    expect(second.codes).toEqual([expect.objectContaining({ code: 'CARNE', tool: 'NordVPN', status: 'pending', archived: false })]);
    expect(second.suggestions).toEqual([expect.objectContaining({ name: 'Gradium', code: 'GDIY', status: 'open' })]);
    expect(history?.olderCodes).toBe(0);
  });

  it('compte les codes d’épisodes plus anciens que la liste', async () => {
    const [podcast] = await listPodcasts(db);
    const [tool] = await db.select().from(schema.tools);
    await db.insert(schema.codes).values({ toolId: tool.id, creatorId: podcast.creatorId!, code: 'ANCIEN', discount: '-5 %', sourceUrl: 'https://podcasts.apple.com/fr/podcast/x/id42?i=77', status: 'verified' });
    await db.insert(schema.codes).values({ toolId: tool.id, creatorId: podcast.creatorId!, code: 'AUTRE', discount: '-5 %', sourceUrl: 'https://podcasts.apple.com/podcast/id420?i=1', status: 'verified' });
    const history = await podcastHistory(db, directory([episode(1, '', daysAgo(1))]), podcast.id);
    expect(history?.olderCodes).toBe(1);
    expect(history?.episodes[0].read).toBe(false);
  });

  it('rend null pour un podcast inconnu', async () => {
    expect(await podcastHistory(db, directory([]), '00000000-0000-0000-0000-000000000000')).toBeNull();
  });
});
