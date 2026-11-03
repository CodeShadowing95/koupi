import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import type { PodcastDirectory, PodcastFeed } from './apple-podcasts';
import { createCode } from './codes-admin';
import { applePodcastId, creatorsToLink, linkCreatorAccounts, manualReason } from './creator-account-link';
import { linkedSummary } from './creator-accounts-display';
import type { ChannelInfo, YoutubeBatch } from './creator-youtube-link';

const video = (id: string) => `https://www.youtube.com/watch?v=${id}`;
const episode = (podcast: number, ep: number) => `https://podcasts.apple.com/fr/podcast/x/id${podcast}?i=${ep}`;
const feed = (id: number, title: string): PodcastFeed => ({ id, title, author: '', feedUrl: '', link: `https://podcasts.apple.com/podcast/id${id}`, image: '', episodeCount: 10, genre: '' });

function fakeYoutube(videos: Record<string, string>, channels: Record<string, ChannelInfo>): YoutubeBatch {
  return {
    videoChannels: vi.fn(async (ids: string[]) => new Map(ids.filter(id => videos[id]).map(id => [id, videos[id]]))),
    channels: vi.fn(async (ids: string[]) => new Map(ids.filter(id => channels[id]).map(id => [id, channels[id]]))),
  };
}

function fakeDirectory(feeds: PodcastFeed[]): PodcastDirectory {
  return {
    search: vi.fn(async () => []),
    podcast: vi.fn(async () => null),
    podcasts: vi.fn(async (ids: number[]) => feeds.filter(item => ids.includes(item.id))),
    episodes: vi.fn(async () => []),
  };
}

describe('applePodcastId', () => {
  it('lit l’identifiant du podcast, avec ou sans épisode', () => {
    expect(applePodcastId(episode(42, 7))).toBe(42);
    expect(applePodcastId('https://podcasts.apple.com/fr/podcast/x/id42')).toBe(42);
    expect(applePodcastId('https://open.spotify.com/episode/abc')).toBeNull();
    expect(applePodcastId('pas une adresse')).toBeNull();
  });
});

describe('manualReason', () => {
  it('dit d’où viennent les codes au lieu de parler de YouTube', () => {
    expect(manualReason([], true)).toMatch(/^Aucun code/);
    expect(manualReason(['https://www.instagram.com/p/abc', 'https://www.tiktok.com/@a/video/1'], true)).toBe('Ses codes viennent de Instagram, TikTok : relie son compte à la main.');
    expect(manualReason(['https://open.spotify.com/episode/abc'], true)).toMatch(/podcast hors Apple Podcasts/);
    expect(manualReason(['https://exemple.fr/promo'], true)).toMatch(/site web/);
    expect(manualReason([video('aaaaaaaaaaa')], false)).toMatch(/clé YouTube manque/);
  });
});

describe('linkedSummary', () => {
  it('résume par plateforme', () => {
    expect(linkedSummary([])).toBe('Aucun compte relié.');
    expect(linkedSummary([{ creator: 'A', platform: 'podcast' }])).toBe('1 podcast relié.');
    expect(linkedSummary([{ creator: 'A', platform: 'youtube' }, { creator: 'B', platform: 'youtube' }, { creator: 'C', platform: 'podcast' }])).toBe('2 chaînes YouTube et 1 podcast reliés.');
  });
});

describe('linkCreatorAccounts', () => {
  let db: Db;
  const add = async (creatorName: string, sourceUrl: string, code: string) => {
    const result = await createCode(db, { toolSlug: 'nordvpn', creatorName, code, discount: '-10 %', sourceUrl, sourceTitle: '', creatorLink: null, note: null, status: 'verified' });
    if (!result.ok) throw new Error(result.error);
  };
  const creatorId = async (name: string) => (await db.select().from(schema.creators)).find(row => row.name === name)!.id;

  beforeEach(async () => {
    db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    await db.insert(schema.categories).values({ slug: 'vpn', name: 'VPN' });
    await db.insert(schema.tools).values({ slug: 'nordvpn', name: 'NordVPN', categorySlug: 'vpn', website: 'https://nordvpn.com' });
  });

  it('relie chaîne YouTube et podcast, et ne signale pas un créateur qui a déjà un compte', async () => {
    await add('Ana', video('aaaaaaaaaaa'), 'ANA10');
    await add('Silicon Carne', episode(42, 1), 'SC10');
    await add('Martingale', episode(77, 1), 'MART10');
    await db.insert(schema.creatorAccounts).values({ creatorId: await creatorId('Martingale'), platform: 'podcast', externalId: '77', handle: 'La Martingale', url: 'https://podcasts.apple.com/podcast/id77' });
    expect(await creatorsToLink(db)).toBe(2);

    const youtube = fakeYoutube({ aaaaaaaaaaa: 'UCana' }, { UCana: { id: 'UCana', handle: '@ana', url: 'https://www.youtube.com/@ana', subscribers: 100 } });
    const report = await linkCreatorAccounts(db, { youtube, podcasts: fakeDirectory([feed(42, 'Silicon Carne, le podcast')]) });
    expect(report).toEqual({
      linked: [{ creator: 'Ana', platform: 'youtube' }, { creator: 'Silicon Carne', platform: 'podcast' }],
      toLink: [],
    });
    const podcast = (await db.select().from(schema.creatorAccounts)).find(row => row.externalId === '42');
    expect(podcast).toMatchObject({ platform: 'podcast', handle: 'Silicon Carne, le podcast', adminCheckedAt: null });
    expect(await creatorsToLink(db)).toBe(0);
  });

  it('dit d’où viennent les codes des créateurs restés sans compte', async () => {
    await add('Insta', 'https://www.instagram.com/p/abc', 'INSTA10');
    await add('Spot', 'https://open.spotify.com/episode/abc', 'SPOT10');
    await add('Tube', video('bbbbbbbbbbb'), 'TUBE10');
    const report = await linkCreatorAccounts(db, { youtube: null, podcasts: fakeDirectory([]) });
    expect(report.linked).toEqual([]);
    expect(report.toLink.map(item => item.creator)).toEqual(['Insta', 'Spot', 'Tube']);
    expect(report.toLink[0].reason).toMatch(/Instagram/);
    expect(report.toLink[1].reason).toMatch(/hors Apple Podcasts/);
    expect(report.toLink[2].reason).toMatch(/clé YouTube manque/);
    expect(report.toLink.some(item => /Aucune vidéo YouTube/.test(item.reason))).toBe(false);
  });

  it('ne relie pas un podcast déjà relié à un autre créateur, et relie quand même sans titre Apple', async () => {
    await add('Pod A', episode(9, 1), 'PODA10');
    await add('Pod B', episode(9, 2), 'PODB10');
    await add('Pod C', episode(12, 1), 'PODC10');
    await db.insert(schema.creatorAccounts).values({ creatorId: await creatorId('Pod A'), platform: 'podcast', externalId: '9', handle: 'Neuf', url: 'https://podcasts.apple.com/podcast/id9' });
    const directory = fakeDirectory([]);
    vi.mocked(directory.podcasts).mockRejectedValueOnce(new Error('down'));
    const report = await linkCreatorAccounts(db, { youtube: null, podcasts: directory });
    expect(report.linked).toEqual([{ creator: 'Pod C', platform: 'podcast' }]);
    expect(report.toLink).toEqual([{ creator: 'Pod B', reason: 'Son podcast est déjà relié à Pod A.' }]);
    const podC = (await db.select().from(schema.creatorAccounts)).find(row => row.externalId === '12');
    expect(podC).toMatchObject({ handle: 'Pod C', url: 'https://podcasts.apple.com/podcast/id12' });
  });
});
