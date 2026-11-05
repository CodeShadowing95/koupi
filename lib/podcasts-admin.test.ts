import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import type { PodcastFeed } from './apple-podcasts';
import { applePodcastUrl, followPodcast, listPodcasts, setPodcastActive, unfollowPodcast } from './podcasts-admin';

const feed = (over: Partial<PodcastFeed> = {}): PodcastFeed => ({
  id: 42, title: 'Silicon Carne', author: 'Carlos', feedUrl: 'https://feed.example/rss', link: 'https://podcasts.apple.com/fr/podcast/id42',
  image: '', episodeCount: 300, genre: 'Technologies', ...over,
});

describe('podcasts suivis', () => {
  let db: Db;
  beforeEach(async () => {
    db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
  });

  it('suivre crée le créateur, son compte podcast et la source suivie', async () => {
    const result = await followPodcast(db, feed());
    expect(result.ok).toBe(true);
    const [podcast] = await listPodcasts(db);
    expect(podcast).toMatchObject({ feedId: '42', title: 'Silicon Carne', active: true, lastFetchedAt: null, creatorName: 'Silicon Carne', feedUrl: 'https://feed.example/rss' });
    const accounts = await db.select().from(schema.creatorAccounts);
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({ platform: 'podcast', externalId: '42', handle: 'Silicon Carne', url: 'https://podcasts.apple.com/fr/podcast/id42', creatorId: podcast.creatorId });
  });

  it('refuse un podcast déjà suivi', async () => {
    await followPodcast(db, feed());
    const again = await followPodcast(db, feed());
    expect(again).toEqual({ ok: false, error: '« Silicon Carne » est déjà suivi.' });
  });

  it('reprend le créateur qui a déjà ce compte podcast, même sous un autre nom', async () => {
    const [creator] = await db.insert(schema.creators).values({ slug: 'carlos-diaz', name: 'Carlos Diaz' }).returning();
    await db.insert(schema.creatorAccounts).values({ creatorId: creator.id, platform: 'podcast', externalId: '42', handle: 'Silicon Carne', url: 'https://example.com' });
    await followPodcast(db, feed());
    const [podcast] = await listPodcasts(db);
    expect(podcast.creatorName).toBe('Carlos Diaz');
    expect(await db.select().from(schema.creators)).toHaveLength(1);
  });

  it('rattache le podcast au créateur du même nom et met un lien Apple s’il manque', async () => {
    await db.insert(schema.creators).values({ slug: 'silicon-carne', name: 'Silicon Carne' });
    await followPodcast(db, feed({ link: '', feedUrl: '' }));
    const [podcast] = await listPodcasts(db);
    expect(podcast.feedUrl).toBeNull();
    expect(await db.select().from(schema.creators)).toHaveLength(1);
    const [account] = await db.select().from(schema.creatorAccounts);
    expect(account.url).toBe(applePodcastUrl(42));
  });

  it('met en pause, reprend et arrête de suivre sans toucher au créateur', async () => {
    await followPodcast(db, feed());
    const [podcast] = await listPodcasts(db);
    expect(await setPodcastActive(db, podcast.id, false)).toBe(true);
    expect((await listPodcasts(db))[0].active).toBe(false);
    expect(await unfollowPodcast(db, podcast.id)).toBe(true);
    expect(await listPodcasts(db)).toEqual([]);
    expect(await db.select().from(schema.creatorAccounts).where(eq(schema.creatorAccounts.platform, 'podcast'))).toHaveLength(1);
    expect(await setPodcastActive(db, podcast.id, true)).toBe(false);
  });

  it('ne touche pas aux chaînes YouTube suivies', async () => {
    const [source] = await db.insert(schema.watchedSources).values({ platform: 'youtube', externalId: 'UCa', title: 'Chaîne' }).returning();
    expect(await unfollowPodcast(db, source.id)).toBe(false);
    expect(await listPodcasts(db)).toEqual([]);
  });

  it('compte les codes venus des épisodes de chaque podcast', async () => {
    await followPodcast(db, feed());
    await followPodcast(db, feed({ id: 420, title: 'Autre' }));
    await db.insert(schema.categories).values({ slug: 'vpn', name: 'VPN' });
    const [tool] = await db.insert(schema.tools).values({ slug: 'nordvpn', name: 'NordVPN', categorySlug: 'vpn', website: 'https://nordvpn.com' }).returning();
    const [silicon] = await listPodcasts(db).then(list => list.filter(item => item.feedId === '42'));
    const code = (value: string, sourceUrl: string, archived = false) => ({ toolId: tool.id, creatorId: silicon.creatorId!, code: value, discount: '-10 %', sourceUrl, archivedAt: archived ? new Date() : null });
    await db.insert(schema.codes).values([
      code('A', 'https://podcasts.apple.com/fr/podcast/titre/id42?i=1&uo=4'),
      code('B', 'https://podcasts.apple.com/podcast/id42?i=2'),
      code('C', 'https://podcasts.apple.com/podcast/id42?i=3', true),
      code('D', 'https://www.youtube.com/watch?v=abc'),
    ]);
    const counts = Object.fromEntries((await listPodcasts(db)).map(item => [item.feedId, item.codesFound]));
    expect(counts).toEqual({ '42': 2, '420': 0 });
  });

  it('donne le rendement de chaque podcast : publiés, copiés ce mois-ci, dernier code', async () => {
    const now = new Date('2026-11-05T12:00:00Z');
    await followPodcast(db, feed());
    await followPodcast(db, feed({ id: 420, title: 'Autre' }));
    await db.insert(schema.categories).values({ slug: 'vpn', name: 'VPN' });
    const [tool] = await db.insert(schema.tools).values({ slug: 'nordvpn', name: 'NordVPN', categorySlug: 'vpn', website: 'https://nordvpn.com' }).returning();
    const [silicon] = await listPodcasts(db).then(list => list.filter(item => item.feedId === '42'));
    const base = { toolId: tool.id, creatorId: silicon.creatorId!, discount: '-10 %' };
    const [published] = await db.insert(schema.codes).values([
      { ...base, code: 'A', sourceUrl: 'https://podcasts.apple.com/podcast/id42?i=1', status: 'verified' as const, createdAt: new Date('2026-10-01T10:00:00Z') },
      { ...base, code: 'B', sourceUrl: 'https://podcasts.apple.com/podcast/id42?i=2', status: 'rejected' as const, createdAt: new Date('2026-11-02T10:00:00Z') },
    ]).returning();
    await db.insert(schema.dailyCounters).values([
      { day: '2026-11-03', metric: 'copy', key: published.id, count: 4 },
      { day: '2026-11-04', metric: 'copy', key: published.id, count: 1 },
      { day: '2026-10-20', metric: 'copy', key: published.id, count: 9 },
    ]);
    const list = await listPodcasts(db, now);
    expect(list.find(item => item.feedId === '42')).toMatchObject({ codesFound: 2, codesPublished: 1, copiesThisMonth: 5, lastCodeAt: '2026-11-02T10:00:00.000Z' });
    expect(list.find(item => item.feedId === '420')).toMatchObject({ codesFound: 0, codesPublished: 0, copiesThisMonth: 0, lastCodeAt: null });
  });

  it('donne le lien Apple d’un épisode', () => {
    expect(applePodcastUrl(42, 7)).toBe('https://podcasts.apple.com/podcast/id42?i=7');
  });
});
