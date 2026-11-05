import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import {
  accountsByCreator, addCreatorAccount, channelLocale, deleteCreatorAccount, refreshCreatorAccount, updateCreatorAccount,
  youtubeChannelReader, youtubeChannelRef, type ChannelReader,
} from './creator-accounts';
import { formatSubscribers } from './creator-accounts-display';

const CHANNEL_ID = 'UC' + 'a'.repeat(22);
const now = new Date('2026-11-02T12:00:00Z');

describe('youtubeChannelRef', () => {
  it('lit les liens de chaîne, les @pseudos et les ID', () => {
    expect(youtubeChannelRef('https://www.youtube.com/@Ana.Tech')).toEqual({ by: 'handle', value: '@Ana.Tech' });
    expect(youtubeChannelRef('youtube.com/@ana/videos')).toEqual({ by: 'handle', value: '@ana' });
    expect(youtubeChannelRef('@ana')).toEqual({ by: 'handle', value: '@ana' });
    expect(youtubeChannelRef(`https://youtube.com/channel/${CHANNEL_ID}`)).toEqual({ by: 'id', value: CHANNEL_ID });
    expect(youtubeChannelRef(CHANNEL_ID)).toEqual({ by: 'id', value: CHANNEL_ID });
    expect(youtubeChannelRef('https://m.youtube.com/user/AnaTech')).toEqual({ by: 'username', value: 'AnaTech' });
  });
  it('refuse une vidéo ou un autre site', () => {
    expect(youtubeChannelRef('https://www.youtube.com/watch?v=abc')).toBeNull();
    expect(youtubeChannelRef('https://example.com/@ana')).toBeNull();
    expect(youtubeChannelRef('ana')).toBeNull();
  });
});

describe('youtubeChannelReader', () => {
  it('ne lit rien sans clé', () => {
    expect(youtubeChannelReader(undefined)).toBeNull();
  });
  it('rend l’ID, le pseudo et les abonnés', async () => {
    const fetchFn = vi.fn(async (url: string) => {
      expect(url).toContain('forHandle=%40ana');
      return new Response(JSON.stringify({ items: [{ id: CHANNEL_ID, snippet: { title: 'Ana', customUrl: '@ana' }, statistics: { subscriberCount: '12400', viewCount: '2500000', videoCount: '140' } }] }));
    });
    const read = youtubeChannelReader('k', fetchFn as unknown as typeof fetch)!;
    expect(await read({ by: 'handle', value: '@ana' })).toEqual({
      externalId: CHANNEL_ID, title: 'Ana', handle: '@ana', url: 'https://www.youtube.com/@ana', subscribers: 12400,
      metrics: { views: 2_500_000, videos: 140 },
    });
  });
  it('garde les abonnés vides quand la chaîne les masque, et null si rien ne correspond', async () => {
    const hidden = vi.fn(async () => new Response(JSON.stringify({ items: [{ id: CHANNEL_ID, snippet: { title: 'Ana' }, statistics: { hiddenSubscriberCount: true } }] })));
    expect((await youtubeChannelReader('k', hidden as unknown as typeof fetch)!({ by: 'id', value: CHANNEL_ID }))?.subscribers).toBeNull();
    const none = vi.fn(async () => new Response(JSON.stringify({})));
    expect(await youtubeChannelReader('k', none as unknown as typeof fetch)!({ by: 'handle', value: '@zzz' })).toBeNull();
  });
});

describe('formatSubscribers', () => {
  it('écrit le nombre à la française', () => {
    expect(formatSubscribers(12400)).toBe('12 400 abonnés');
    expect(formatSubscribers(1)).toBe('1 abonné');
    expect(formatSubscribers(null)).toBeNull();
  });
});

describe('comptes créateurs', () => {
  let db: Db;
  let ana: string;
  let bob: string;
  const reader = (subscribers: number | null = 12400): ChannelReader => async () => ({ externalId: CHANNEL_ID, title: 'Ana', handle: '@ana', url: 'https://www.youtube.com/@ana', subscribers });

  beforeEach(async () => {
    db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    const rows = await db.insert(schema.creators).values([{ slug: 'ana', name: 'Ana' }, { slug: 'bob', name: 'Bob' }]).returning();
    [ana, bob] = rows.map(row => row.id);
  });

  it('relie une chaîne YouTube lue par l’API', async () => {
    const result = await addCreatorAccount(db, ana, { platform: 'youtube', channel: 'https://youtube.com/@ana' }, { readChannel: reader(), now });
    expect(result.ok).toBe(true);
    const [account] = (await accountsByCreator(db)).get(ana)!;
    expect(account).toMatchObject({ platform: 'youtube', externalId: CHANNEL_ID, handle: '@ana', subscribers: 12400, level: 'spotted' });
  });

  it('explique ce qui manque', async () => {
    expect(await addCreatorAccount(db, ana, { platform: 'youtube', channel: 'https://youtube.com/@ana' }, { readChannel: null })).toEqual({ ok: false, error: expect.stringContaining('YOUTUBE_API_KEY') });
    expect(await addCreatorAccount(db, ana, { platform: 'youtube', channel: 'nimporte' }, { readChannel: reader() })).toEqual({ ok: false, error: expect.stringContaining('lien de la chaîne') });
    expect(await addCreatorAccount(db, ana, { platform: 'youtube', channel: '@zzz' }, { readChannel: async () => null })).toEqual({ ok: false, error: 'Aucune chaîne YouTube ne correspond à ce lien.' });
    expect(await addCreatorAccount(db, ana, { platform: 'myspace' }, { readChannel: null })).toEqual({ ok: false, error: 'Choisis un réseau.' });
    expect(await addCreatorAccount(db, ana, { platform: 'tiktok', handle: '@ana', url: 'tiktok.com/@ana' }, { readChannel: null })).toEqual({ ok: false, error: expect.stringContaining('https://') });
    expect(await addCreatorAccount(db, ana, { platform: 'tiktok', handle: '@ana', url: 'https://tiktok.com/@ana', subscribers: 'beaucoup' }, { readChannel: null })).toEqual({ ok: false, error: expect.stringContaining('nombre entier') });
  });

  it('refuse un compte déjà relié à un autre créateur, en le nommant', async () => {
    await addCreatorAccount(db, ana, { platform: 'youtube', channel: '@ana' }, { readChannel: reader() });
    expect(await addCreatorAccount(db, bob, { platform: 'youtube', channel: '@ana' }, { readChannel: reader() })).toEqual({ ok: false, error: 'Ce compte est déjà relié à Ana.' });
    await addCreatorAccount(db, ana, { platform: 'tiktok', handle: '@ana', url: 'https://tiktok.com/@ana' }, { readChannel: null });
    expect(await addCreatorAccount(db, bob, { platform: 'tiktok', handle: '@ANA', url: 'https://tiktok.com/@ANA' }, { readChannel: null })).toEqual({ ok: false, error: 'Ce compte est déjà relié à Ana.' });
  });

  it('saisit un compte d’un autre réseau à la main', async () => {
    const result = await addCreatorAccount(db, ana, { platform: 'instagram', handle: '@ana', url: 'https://instagram.com/ana', subscribers: '8 500' }, { readChannel: null, now });
    expect(result.ok).toBe(true);
    const [account] = (await accountsByCreator(db)).get(ana)!;
    expect(account).toMatchObject({ platform: 'instagram', subscribers: 8500, subscribersAt: now.toISOString() });
  });

  it('monte d’un niveau avec le contrôle de l’admin ou le badge certifié', async () => {
    const added = await addCreatorAccount(db, ana, { platform: 'youtube', channel: '@ana' }, { readChannel: reader() });
    if (!added.ok) throw new Error('setup');
    await updateCreatorAccount(db, added.data.id, { adminChecked: true }, now);
    let [account] = (await accountsByCreator(db)).get(ana)!;
    expect(account).toMatchObject({ adminCheckedAt: now.toISOString(), level: 'checked' });
    await updateCreatorAccount(db, added.data.id, { adminChecked: false });
    [account] = (await accountsByCreator(db)).get(ana)!;
    expect(account.level).toBe('spotted');
    await updateCreatorAccount(db, added.data.id, { platformVerified: true });
    [account] = (await accountsByCreator(db)).get(ana)!;
    expect(account.level).toBe('checked');
  });

  it('ne laisse pas corriger à la main les abonnés YouTube', async () => {
    const added = await addCreatorAccount(db, ana, { platform: 'youtube', channel: '@ana' }, { readChannel: reader() });
    if (!added.ok) throw new Error('setup');
    expect(await updateCreatorAccount(db, added.data.id, { subscribers: 5 })).toEqual({ ok: false, error: expect.stringContaining('Actualiser') });
    expect(await updateCreatorAccount(db, added.data.id, {})).toEqual({ ok: false, error: 'Rien à changer.' });
  });

  it('actualise les abonnés d’une chaîne, puis retire le compte', async () => {
    const added = await addCreatorAccount(db, ana, { platform: 'youtube', channel: '@ana' }, { readChannel: reader(900) });
    if (!added.ok) throw new Error('setup');
    expect(await refreshCreatorAccount(db, added.data.id, { readChannel: reader(1500), now })).toEqual({ ok: true, data: { id: added.data.id } });
    const [account] = (await accountsByCreator(db)).get(ana)!;
    expect(account.subscribers).toBe(1500);
    expect(await refreshCreatorAccount(db, added.data.id, { readChannel: async () => null })).toEqual({ ok: false, error: 'Cette chaîne n’existe plus sur YouTube.' });
    expect(await deleteCreatorAccount(db, added.data.id)).toBe(true);
    expect((await accountsByCreator(db)).get(ana)).toBeUndefined();
  });

  it('actualise un podcast par son lecteur d’audience, sans effacer une note qui ne se lit plus', async () => {
    const [row] = await db.insert(schema.creatorAccounts).values({ creatorId: ana, platform: 'podcast', externalId: '42', handle: 'Ana parle', url: 'https://podcasts.apple.com/fr/podcast/id42' }).returning();
    const readAudience = { podcast: vi.fn(async () => ({ rating: 4.5, ratingCount: 120, ratingSource: 'Apple Podcasts', episodes: 80 })) };
    expect(await refreshCreatorAccount(db, row.id, { readChannel: null, readAudience, now })).toEqual({ ok: true, data: { id: row.id } });
    expect(readAudience.podcast).toHaveBeenCalledWith({ externalId: '42', url: 'https://podcasts.apple.com/fr/podcast/id42' });
    let [account] = (await accountsByCreator(db)).get(ana)!;
    expect(account).toMatchObject({ metrics: { rating: 4.5, ratingCount: 120, ratingSource: 'Apple Podcasts', episodes: 80 }, metricsAt: now.toISOString() });

    await refreshCreatorAccount(db, row.id, { readChannel: null, readAudience: { podcast: async () => ({ episodes: 82 }) } });
    [account] = (await accountsByCreator(db)).get(ana)!;
    expect(account.metrics).toEqual({ rating: 4.5, ratingCount: 120, ratingSource: 'Apple Podcasts', episodes: 82 });

    expect(await refreshCreatorAccount(db, row.id, { readChannel: null, readAudience: { podcast: async () => null } })).toEqual({ ok: false, error: 'Ce compte est introuvable à sa source.' });
    expect(await refreshCreatorAccount(db, row.id, { readChannel: null, readAudience: { podcast: async () => { throw new Error('503'); } } })).toEqual({ ok: false, error: expect.stringContaining('ne répond pas') });
    expect(await refreshCreatorAccount(db, row.id, { readChannel: null })).toEqual({ ok: false, error: expect.stringContaining('à la main') });
  });

  it('corrige le pays et la langue à la main', async () => {
    const [row] = await db.insert(schema.creatorAccounts).values({ creatorId: ana, platform: 'podcast', externalId: '42', handle: 'Ana parle', url: 'https://podcasts.apple.com/fr/podcast/id42', metrics: { episodes: 5, language: 'en' } }).returning();
    expect(await updateCreatorAccount(db, row.id, { country: 'be', language: 'fr' })).toEqual({ ok: true, data: { id: row.id } });
    let [account] = (await accountsByCreator(db)).get(ana)!;
    expect(account.metrics).toEqual({ episodes: 5, country: 'BE', language: 'fr', localeManual: true });
    expect(await updateCreatorAccount(db, row.id, { country: 'Belgique' })).toEqual({ ok: false, error: expect.stringContaining('deux lettres') });
    await updateCreatorAccount(db, row.id, { country: '', language: '' });
    [account] = (await accountsByCreator(db)).get(ana)!;
    expect(account.metrics).toEqual({ episodes: 5, localeManual: true });
  });

  it('lit le pays et la langue d’une chaîne, ou devine la langue sur sa description', () => {
    expect(channelLocale({ country: 'ca', defaultLanguage: 'fr-CA' })).toEqual({ country: 'CA', language: 'fr' });
    expect(channelLocale({ title: 'Ana', description: 'The channel where we build things and talk about how to grow your business every week.' })).toEqual({ language: 'en' });
    expect(channelLocale(undefined)).toEqual({});
  });

  it('garde les vues et vidéos d’une chaîne lue sur YouTube', async () => {
    const withStats: ChannelReader = async () => ({ externalId: CHANNEL_ID, title: 'Ana', handle: '@ana', url: 'https://www.youtube.com/@ana', subscribers: 2000, metrics: { views: 50_000, videos: 12 } });
    const added = await addCreatorAccount(db, ana, { platform: 'youtube', channel: '@ana' }, { readChannel: withStats, now });
    if (!added.ok) throw new Error('setup');
    const [account] = (await accountsByCreator(db)).get(ana)!;
    expect(account).toMatchObject({ metrics: { views: 50_000, videos: 12 }, metricsAt: now.toISOString() });
  });
});
