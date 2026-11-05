import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import {
  creatorsWithoutImage, fetchImage, fetchToolLogo, loadAvatarMap, loadCreatorImage, loadLogoMap, loadToolImage,
  refreshCreatorAvatars, refreshToolLogos, toolDomain, toolsWithoutImage, YOUTUBE_IMAGE_HOSTS,
} from './stored-images';

const PHOTO = 'https://yt3.ggpht.com/photo=s240';
const jpeg = (bytes = 20) => new Response(new Uint8Array(bytes).fill(7), { headers: { 'content-type': 'image/jpeg' } });

describe('téléchargement d’une image', () => {
  it('n’accepte que les domaines prévus, en https, une image de taille raisonnable', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jpeg());
    expect(await fetchImage('https://evil.example/a.jpg', YOUTUBE_IMAGE_HOSTS, fetchFn)).toBeNull();
    expect(await fetchImage('http://yt3.ggpht.com/a', YOUTUBE_IMAGE_HOSTS, fetchFn)).toBeNull();
    expect(await fetchImage('https://ggpht.com.evil.example/a', YOUTUBE_IMAGE_HOSTS, fetchFn)).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
    expect(await fetchImage(PHOTO, YOUTUBE_IMAGE_HOSTS, fetchFn)).toMatchObject({ mime: 'image/jpeg', bytes: 20, sourceUrl: PHOTO });
  });

  it('refuse ce qui n’est pas une image ou qui est trop lourd', async () => {
    const html = vi.fn().mockResolvedValue(new Response('<html>', { headers: { 'content-type': 'text/html' } }));
    expect(await fetchImage(PHOTO, YOUTUBE_IMAGE_HOSTS, html)).toBeNull();
    const big = vi.fn().mockResolvedValue(jpeg(200 * 1024));
    expect(await fetchImage(PHOTO, YOUTUBE_IMAGE_HOSTS, big)).toBeNull();
  });
});

describe('photos des créateurs en base', () => {
  let db: Db;
  let ana: string;
  beforeEach(async () => {
    const pglite = drizzle(new PGlite(), { schema });
    await migrate(pglite, { migrationsFolder: 'db/migrations' });
    db = pglite as unknown as Db;
    const [row] = await db.insert(schema.creators).values([{ slug: 'ana', name: 'Ana' }, { slug: 'bob', name: 'Bob' }]).returning({ id: schema.creators.id });
    ana = row.id;
    await db.insert(schema.creatorAccounts).values({ creatorId: ana, platform: 'youtube', externalId: 'UC1', handle: '@ana', url: 'https://youtube.com/@ana' });
  });

  const youtube = { channels: vi.fn(async (ids: string[]) => new Map(ids.map(id => [id, { id, handle: '@ana', url: '', subscribers: null, thumbnail: PHOTO }]))) };

  it('récupère la photo de la chaîne reliée, la sert et la liste par nom', async () => {
    expect(await creatorsWithoutImage(db)).toBe(1);
    const report = await refreshCreatorAvatars(db, { youtube }, { missingOnly: true, fetchFn: vi.fn().mockResolvedValue(jpeg()), now: new Date('2026-11-04T08:00:00Z') });
    expect(report).toEqual({ updated: ['Ana'], failed: [] });
    expect(await creatorsWithoutImage(db)).toBe(0);
    const image = await loadCreatorImage(db, 'ana');
    expect(image?.mime).toBe('image/jpeg');
    expect(image?.body.length).toBe(20);
    expect(await loadCreatorImage(db, 'bob')).toBeNull();
    const map = await loadAvatarMap(db);
    expect(map.ana).toMatch(/^\/media\/avatars\/ana\.jpg\?v=/);
    // Déjà là : « missingOnly » ne la reprend pas, l'actualisation d'un créateur la remplace.
    expect((await refreshCreatorAvatars(db, { youtube }, { missingOnly: true, fetchFn: vi.fn() })).updated).toEqual([]);
    const again = await refreshCreatorAvatars(db, { youtube }, { onlyCreatorId: ana, fetchFn: vi.fn().mockResolvedValue(jpeg(30)), now: new Date('2026-11-05T08:00:00Z') });
    expect(again.updated).toEqual(['Ana']);
    expect((await loadCreatorImage(db, 'ana'))?.body.length).toBe(30);
    expect((await loadAvatarMap(db)).ana).not.toBe(map.ana);
  });

  it('signale une chaîne sans photo lisible', async () => {
    const noPhoto = { channels: vi.fn(async () => new Map()) };
    expect((await refreshCreatorAvatars(db, { youtube: noPhoto })).failed).toEqual([{ creator: 'Ana', reason: 'Sa chaîne n’a pas de photo lisible.' }]);
  });

  it('prend la pochette du podcast pour un créateur sans chaîne, en petite taille', async () => {
    const [bob] = await db.select().from(schema.creators).where(eq(schema.creators.slug, 'bob'));
    await db.insert(schema.creatorAccounts).values({ creatorId: bob.id, platform: 'podcast', externalId: '42', handle: 'Bob parle', url: 'https://podcasts.apple.com/fr/podcast/id42' });
    expect(await creatorsWithoutImage(db)).toBe(2);
    const art = 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts/v4/aa/bob.jpg/600x600bb.jpg';
    const podcasts = { podcasts: vi.fn(async (ids: number[]) => ids.map(id => ({ id, title: 'Bob parle', author: '', feedUrl: '', link: '', image: art, episodeCount: 3, genre: '' }))) };
    const fetchFn = vi.fn().mockResolvedValue(jpeg(25));
    const report = await refreshCreatorAvatars(db, { podcasts }, { missingOnly: true, fetchFn });
    expect(report).toEqual({ updated: ['Bob'], failed: [{ creator: 'Ana', reason: 'La clé YouTube manque : sa chaîne ne peut pas être lue.' }] });
    expect(podcasts.podcasts).toHaveBeenCalledWith([42]);
    expect(fetchFn.mock.calls[0][0]).toBe('https://is1-ssl.mzstatic.com/image/thumb/Podcasts/v4/aa/bob.jpg/240x240bb.jpg');
    expect((await loadCreatorImage(db, 'bob'))?.body.length).toBe(25);
  });

  it('préfère la chaîne YouTube au podcast quand le créateur a les deux', async () => {
    await db.insert(schema.creatorAccounts).values({ creatorId: ana, platform: 'podcast', externalId: '7', handle: 'Ana parle', url: 'https://podcasts.apple.com/fr/podcast/id7' });
    const podcasts = { podcasts: vi.fn(async () => []) };
    const report = await refreshCreatorAvatars(db, { youtube, podcasts }, { onlyCreatorId: ana, fetchFn: vi.fn().mockResolvedValue(jpeg()) });
    expect(report.updated).toEqual(['Ana']);
    expect(podcasts.podcasts).not.toHaveBeenCalled();
  });
});

const png = () => new Response(new Uint8Array(30).fill(9), { headers: { 'content-type': 'image/png' } });
const notFound = () => new Response('', { status: 404 });

describe('logos des outils', () => {
  it('lit le domaine du site, sans www', () => {
    expect(toolDomain('https://www.NordVPN.com/fr/')).toBe('nordvpn.com');
    expect(toolDomain('ftp://nordvpn.com')).toBeNull();
    expect(toolDomain('pas une adresse')).toBeNull();
  });

  it('prend Logo.dev sans jamais garder la clé, sinon l’icône du site', async () => {
    const logoDev = vi.fn().mockImplementation(async () => png());
    const image = await fetchToolLogo('https://www.notion.so', { logoDevToken: 'pk_secret', fetchFn: logoDev });
    expect(String(logoDev.mock.calls[0][0])).toContain('img.logo.dev/notion.so?token=pk_secret');
    expect(image?.sourceUrl).toBe('https://img.logo.dev/notion.so');

    const site = vi.fn().mockImplementation(async (url: string) => (url.startsWith('https://img.logo.dev/') || url.startsWith('https://notion.so/') ? notFound() : png()));
    expect((await fetchToolLogo('https://notion.so', { logoDevToken: 'pk', fetchFn: site }))?.sourceUrl).toBe('https://www.notion.so/apple-touch-icon.png');
    expect(await fetchToolLogo('https://notion.so', { fetchFn: vi.fn().mockImplementation(async () => notFound()) })).toBeNull();
  });

  describe('en base', () => {
    let db: Db;
    beforeEach(async () => {
      const pglite = drizzle(new PGlite(), { schema });
      await migrate(pglite, { migrationsFolder: 'db/migrations' });
      db = pglite as unknown as Db;
      await db.insert(schema.categories).values({ slug: 'vpn', name: 'VPN' });
      await db.insert(schema.tools).values([
        { slug: 'nordvpn', name: 'NordVPN', categorySlug: 'vpn', website: 'https://nordvpn.com', priority: 1 },
        { slug: 'brokenvpn', name: 'BrokenVPN', categorySlug: 'vpn', website: 'https://broken.example', priority: 2 },
        { slug: 'surfshark', name: 'Surfshark', categorySlug: 'vpn', website: 'https://surfshark.com', priority: 3 },
      ]);
    });
    const fetchFn = vi.fn().mockImplementation(async (url: string) => (url.includes('broken') ? notFound() : png()));

    it('récupère les logos manquants par lots, passe les échecs déjà vus et les sert par slug', async () => {
      expect(await toolsWithoutImage(db)).toBe(3);
      const first = await refreshToolLogos(db, { missingOnly: true, limit: 2, logoDevToken: 'pk', fetchFn });
      expect(first).toEqual({ updated: ['NordVPN'], failed: [{ tool: 'BrokenVPN', reason: expect.any(String) }], remaining: 1 });
      const second = await refreshToolLogos(db, { missingOnly: true, limit: 2, skip: first.failed.length, logoDevToken: 'pk', fetchFn });
      expect(second).toEqual({ updated: ['Surfshark'], failed: [], remaining: 0 });
      expect(await toolsWithoutImage(db)).toBe(1);

      const map = await loadLogoMap(db);
      expect(map.logoDev).toBe(true);
      expect(map.logos.nordvpn).toMatch(/^\/media\/logos\/nordvpn\.png\?v=/);
      expect((await loadToolImage(db, 'nordvpn'))?.mime).toBe('image/png');
      expect(await loadToolImage(db, 'brokenvpn')).toBeNull();
    });

    it('actualise un seul outil et remplace son logo', async () => {
      const [nord] = await db.select({ id: schema.tools.id }).from(schema.tools).where(eq(schema.tools.slug, 'nordvpn'));
      await refreshToolLogos(db, { onlyToolId: nord.id, fetchFn, now: new Date('2026-01-01') });
      await refreshToolLogos(db, { onlyToolId: nord.id, fetchFn, now: new Date('2026-02-01') });
      const rows = await db.select().from(schema.storedImages);
      expect(rows).toHaveLength(1);
      expect(rows[0].fetchedAt.toISOString()).toBe('2026-02-01T00:00:00.000Z');
      expect((await loadLogoMap(db)).logoDev).toBe(false);
    });
  });
});
