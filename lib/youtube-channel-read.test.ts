import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import type { FoundVideo } from './category-code-search';
import { channelWatches, followChannelsWithCodes, readYoutubeChannels, setChannelWatch, uploadsPlaylistId, youtubeChannels, type Upload, type YoutubeChannels } from './youtube-channel-read';

const now = new Date('2026-11-05T04:00:00Z');
const CHANNEL = 'UC' + 'a'.repeat(22);
const OTHER = 'UC' + 'b'.repeat(22);
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);

describe('uploadsPlaylistId', () => {
  it('donne la liste des vidéos mises en ligne d’une chaîne', () => {
    expect(uploadsPlaylistId(CHANNEL)).toBe('UU' + 'a'.repeat(22));
    expect(uploadsPlaylistId('@pseudo')).toBeNull();
  });
});

describe('youtubeChannels', () => {
  it('lit les dernières vidéos d’une chaîne puis leurs descriptions', async () => {
    const fetchFn = vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('/playlistItems?')
      ? { items: [{ contentDetails: { videoId: 'v1', videoPublishedAt: '2026-11-04T10:00:00Z' } }, { contentDetails: {} }] }
      : { items: [{ id: 'v1', snippet: { title: 'Avis', description: 'code X', channelTitle: 'Chaîne', channelId: CHANNEL } }] })));
    const youtube = youtubeChannels('KEY', fetchFn as unknown as typeof fetch)!;
    expect(await youtube.uploads(CHANNEL, 20)).toEqual([{ videoId: 'v1', publishedAt: new Date('2026-11-04T10:00:00Z') }]);
    expect(Object.fromEntries(new URL(fetchFn.mock.calls[0][0]).searchParams)).toMatchObject({ part: 'contentDetails', playlistId: 'UU' + 'a'.repeat(22), maxResults: '20' });
    expect(await youtube.videos(['v1'])).toEqual([{ id: 'v1', title: 'Avis', description: 'code X', channelTitle: 'Chaîne', channelId: CHANNEL }]);
    expect(youtubeChannels(undefined)).toBeNull();
  });

  it('une chaîne sans vidéo n’est pas une panne', async () => {
    const youtube = youtubeChannels('KEY', (async () => new Response('{}', { status: 404 })) as unknown as typeof fetch)!;
    expect(await youtube.uploads(CHANNEL, 20)).toEqual([]);
  });
});

describe('chaînes suivies en base', () => {
  let db: Db;
  let creatorId: string;
  let accountId: string;
  beforeEach(async () => {
    db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    await db.insert(schema.categories).values({ slug: 'vpn', name: 'VPN' });
    const [tool] = await db.insert(schema.tools).values({ slug: 'nordvpn', name: 'NordVPN', categorySlug: 'vpn', website: 'https://nordvpn.com' }).returning();
    const [creator] = await db.insert(schema.creators).values({ slug: 'geek', name: 'Geek' }).returning();
    creatorId = creator.id;
    const [account] = await db.insert(schema.creatorAccounts).values({ creatorId, platform: 'youtube', externalId: CHANNEL, handle: '@geek', url: 'https://youtube.com/@geek' }).returning();
    accountId = account.id;
    await db.insert(schema.codes).values({ toolId: tool.id, creatorId, code: 'OLD', discount: '-10 %', sourceUrl: 'https://youtube.com/watch?v=old', sourceTitle: '', status: 'verified' });
    // Un créateur sans code : sa chaîne n'est pas suivie d'un coup.
    const [quiet] = await db.insert(schema.creators).values({ slug: 'calme', name: 'Calme' }).returning();
    await db.insert(schema.creatorAccounts).values({ creatorId: quiet.id, platform: 'youtube', externalId: OTHER, handle: '@calme', url: 'https://youtube.com/@calme' });
  });

  it('suit une chaîne, la met en pause, et suit d’un coup celles des créateurs qui ont un code', async () => {
    expect(await followChannelsWithCodes(db)).toEqual({ followed: 1, already: 0 });
    expect([...(await channelWatches(db)).keys()]).toEqual([CHANNEL]);
    expect(await setChannelWatch(db, accountId, false)).toEqual({ ok: true });
    expect((await channelWatches(db)).get(CHANNEL)?.active).toBe(false);
    // En pause à la main : le suivi d'un coup ne la relance pas.
    expect(await followChannelsWithCodes(db)).toEqual({ followed: 0, already: 1 });
    expect((await channelWatches(db)).get(CHANNEL)?.active).toBe(false);
    expect(await setChannelWatch(db, '00000000-0000-0000-0000-000000000000', true)).toEqual({ ok: false, error: 'Compte introuvable.' });
  });

  const fake = (uploads: Upload[], videos: FoundVideo[]): YoutubeChannels => ({
    uploads: vi.fn(async () => uploads),
    videos: vi.fn(async (ids: string[]) => videos.filter(video => ids.includes(video.id))),
  });

  it('lit les vidéos récentes, met les codes en attente une seule fois et écarte les vidéos déjà lues', async () => {
    await setChannelWatch(db, accountId, true);
    const youtube = fake(
      [{ videoId: 'v1', publishedAt: daysAgo(1) }, { videoId: 'v2', publishedAt: daysAgo(10) }, { videoId: 'vieux', publishedAt: daysAgo(90) }],
      [
        { id: 'v1', title: 'Mon VPN', description: 'NordVPN : -70 % avec le code GEEK70', channelTitle: 'Geek', channelId: CHANNEL },
        { id: 'v2', title: 'Setup', description: 'Rien ici', channelTitle: 'Geek', channelId: CHANNEL },
      ],
    );
    const report = await readYoutubeChannels(db, youtube, { now });
    expect(report).toMatchObject({ channels: 1, videos: 2, skipped: 0, units: 2, found: [{ channel: '@geek', code: 'GEEK70', tool: 'NordVPN' }], failed: [] });
    expect(vi.mocked(youtube.videos).mock.calls[0][0]).toEqual(['v1', 'v2']);
    const [code] = await db.select().from(schema.codes).where(eq(schema.codes.code, 'GEEK70'));
    expect(code).toMatchObject({ status: 'pending', origin: 'youtube_channel', creatorId, sourceUrl: 'https://www.youtube.com/watch?v=v1' });
    const [log] = await db.select().from(schema.codeLogs).where(eq(schema.codeLogs.codeId, code.id));
    expect(log.note).toBe('Chaîne suivie @geek');
    expect((await channelWatches(db)).get(CHANNEL)?.lastFetchedAt).toBe(now.toISOString());

    // Le lendemain : seule la vidéo d'hier est encore récente ; déjà lue, elle est écartée. Une seule unité.
    const next = await readYoutubeChannels(db, youtube, { now: new Date(now.getTime() + 86_400_000) });
    expect(next).toMatchObject({ channels: 1, videos: 0, skipped: 1, units: 1, found: [] });
    expect(youtube.videos).toHaveBeenCalledTimes(1);
  });

  it('ne lit pas une chaîne en pause, et s’arrête au premier refus de YouTube', async () => {
    await setChannelWatch(db, accountId, false);
    const youtube = fake([], []);
    expect((await readYoutubeChannels(db, youtube, { now })).channels).toBe(0);
    await setChannelWatch(db, accountId, true);
    const refused: YoutubeChannels = { uploads: vi.fn(async () => { throw new Error('YouTube API playlistItems 403'); }), videos: vi.fn() };
    const report = await readYoutubeChannels(db, refused, { now });
    expect(report.failed).toEqual(['@geek']);
  });
});
