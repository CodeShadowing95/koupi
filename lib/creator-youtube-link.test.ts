import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { compilationNote } from './compilation-note';
import { createCode } from './codes-admin';
import { creatorsWithoutChannel, linkYoutubeChannels, youtubeBatch, type ChannelInfo, type YoutubeBatch } from './creator-youtube-link';

const video = (id: string) => `https://www.youtube.com/watch?v=${id}`;
const info = (id: string, handle: string, subscribers: number | null = 5000): ChannelInfo => ({ id, handle, url: `https://www.youtube.com/${handle}`, subscribers });

function fakeYoutube(videos: Record<string, string>, channels: Record<string, ChannelInfo>): YoutubeBatch {
  return {
    videoChannels: vi.fn(async (ids: string[]) => new Map(ids.filter(id => videos[id]).map(id => [id, videos[id]]))),
    channels: vi.fn(async (ids: string[]) => new Map(ids.filter(id => channels[id]).map(id => [id, channels[id]]))),
  };
}

describe('youtubeBatch', () => {
  it('ne lit rien sans clé', () => {
    expect(youtubeBatch(undefined)).toBeNull();
  });
  it('demande les vidéos et les chaînes par lots de 50', async () => {
    const fetchFn = vi.fn(async (url: string) => {
      if (url.includes('/videos?')) {
        const ids = new URL(url).searchParams.get('id')!.split(',');
        return new Response(JSON.stringify({ items: ids.map(id => ({ id, snippet: { channelId: 'UCa' } })) }));
      }
      return new Response(JSON.stringify({ items: [{ id: 'UCa', snippet: { customUrl: '@ana', country: 'fr', defaultLanguage: 'fr-FR' }, statistics: { subscriberCount: '1200', viewCount: '50000', videoCount: '12' } }] }));
    });
    const youtube = youtubeBatch('k', fetchFn as unknown as typeof fetch)!;
    const ids = Array.from({ length: 60 }, (_, i) => `vid${String(i).padStart(8, '0')}`);
    expect((await youtube.videoChannels(ids)).size).toBe(60);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(await youtube.channels(['UCa'])).toEqual(new Map([['UCa', { id: 'UCa', handle: '@ana', url: 'https://www.youtube.com/@ana', subscribers: 1200, thumbnail: undefined, metrics: { views: 50_000, videos: 12, country: 'FR', language: 'fr' } }]]));
  });
});

describe('linkYoutubeChannels', () => {
  let db: Db;
  const add = async (creatorName: string, sourceUrl: string, code: string) => {
    const result = await createCode(db, { toolSlug: 'nordvpn', creatorName, code, discount: '-10 %', sourceUrl, sourceTitle: '', creatorLink: null, note: null, status: 'verified' });
    if (!result.ok) throw new Error(result.error);
  };

  beforeEach(async () => {
    db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    await db.insert(schema.categories).values({ slug: 'vpn', name: 'VPN' });
    await db.insert(schema.tools).values({ slug: 'nordvpn', name: 'NordVPN', categorySlug: 'vpn', website: 'https://nordvpn.com' });
  });

  it('relie la chaîne qui a publié les vidéos sources, sans la marquer contrôlée', async () => {
    await add('Ana', video('aaaaaaaaaaa'), 'ANA10');
    await add('Ana', video('bbbbbbbbbbb'), 'ANA20');
    const youtube = fakeYoutube({ aaaaaaaaaaa: 'UCana', bbbbbbbbbbb: 'UCana' }, { UCana: info('UCana', '@ana', 48_000) });
    expect(await creatorsWithoutChannel(db)).toBe(1);
    expect(await linkYoutubeChannels(db, youtube)).toEqual({ linked: ['Ana'], skipped: [] });
    const [account] = await db.select().from(schema.creatorAccounts);
    expect(account).toMatchObject({ platform: 'youtube', externalId: 'UCana', handle: '@ana', subscribers: 48_000, adminCheckedAt: null });
    expect(await creatorsWithoutChannel(db)).toBe(0);
    // Une deuxième fois, il n'y a plus rien à faire.
    expect(await linkYoutubeChannels(db, youtube)).toEqual({ linked: [], skipped: [] });
  });

  it('ne relie pas à un créateur la chaîne d’une compilation qui reprend son code', async () => {
    await add('Baptiste Pitois', video('ccccccccccc'), 'BAPTISTE');
    await db.update(schema.codes).set({ note: compilationNote('Backed', 'Baptiste Pitois', 'code BAPTISTE') });
    const youtube = fakeYoutube({ ccccccccccc: 'UCbacked' }, { UCbacked: info('UCbacked', '@backed', 10_000) });
    expect(await linkYoutubeChannels(db, youtube)).toEqual({ linked: [], skipped: [] });
    expect(await db.select().from(schema.creatorAccounts)).toEqual([]);
  });

  it('signale ce qu’il ne peut pas relier tout seul', async () => {
    await add('Pod', 'https://podcasts.apple.com/fr/podcast/x/id1', 'POD10');
    await add('Mix', video('ccccccccccc'), 'MIX10');
    await add('Mix', video('ddddddddddd'), 'MIX20');
    await add('Gone', video('eeeeeeeeeee'), 'GONE10');
    await add('Jean', video('fffffffffff'), 'JEAN10');
    await add('Jean D.', video('ggggggggggg'), 'JEAND10');
    const youtube = fakeYoutube(
      { ccccccccccc: 'UC1', ddddddddddd: 'UC2', fffffffffff: 'UCjean', ggggggggggg: 'UCjean' },
      { UC1: info('UC1', '@one'), UC2: info('UC2', '@two'), UCjean: info('UCjean', '@jean') },
    );
    const report = await linkYoutubeChannels(db, youtube);
    expect(report.linked).toEqual([]);
    expect(report.skipped).toEqual([
      { creator: 'Gone', reason: 'Ses vidéos sources ne sont plus en ligne.' },
      { creator: 'Jean', reason: 'Même chaîne que Jean D. : doublon de nom à corriger.' },
      { creator: 'Jean D.', reason: 'Même chaîne que Jean : doublon de nom à corriger.' },
      { creator: 'Mix', reason: 'Ses vidéos viennent de 2 chaînes différentes : relie la bonne à la main.' },
    ]);
  });

  it('ne relie pas une chaîne déjà reliée à un autre créateur', async () => {
    await add('Ana', video('aaaaaaaaaaa'), 'ANA10');
    await add('Ana bis', video('bbbbbbbbbbb'), 'ANA20');
    const youtube = fakeYoutube({ aaaaaaaaaaa: 'UCana', bbbbbbbbbbb: 'UCana' }, { UCana: info('UCana', '@ana') });
    const [ana] = await db.select().from(schema.creators).limit(1);
    await linkYoutubeChannels(db, youtube, { onlyCreatorId: ana.id });
    const report = await linkYoutubeChannels(db, youtube);
    expect(report.skipped).toEqual([{ creator: 'Ana bis', reason: 'Sa chaîne est déjà reliée à Ana.' }]);
  });

  it('ne traite qu’un créateur avec onlyCreatorId', async () => {
    await add('Ana', video('aaaaaaaaaaa'), 'ANA10');
    await add('Bob', video('bbbbbbbbbbb'), 'BOB10');
    const youtube = fakeYoutube({ aaaaaaaaaaa: 'UCana', bbbbbbbbbbb: 'UCbob' }, { UCana: info('UCana', '@ana'), UCbob: info('UCbob', '@bob') });
    const [bob] = (await db.select().from(schema.creators)).filter(row => row.name === 'Bob');
    expect(await linkYoutubeChannels(db, youtube, { onlyCreatorId: bob.id })).toEqual({ linked: ['Bob'], skipped: [] });
    expect(await creatorsWithoutChannel(db)).toBe(1);
  });
});
