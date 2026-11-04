import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { creatorsWithoutImage, fetchImage, loadAvatarMap, loadCreatorImage, refreshCreatorAvatars, YOUTUBE_IMAGE_HOSTS } from './stored-images';

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
    const report = await refreshCreatorAvatars(db, youtube, { missingOnly: true, fetchFn: vi.fn().mockResolvedValue(jpeg()), now: new Date('2026-11-04T08:00:00Z') });
    expect(report).toEqual({ updated: ['Ana'], failed: [] });
    expect(await creatorsWithoutImage(db)).toBe(0);
    const image = await loadCreatorImage(db, 'ana');
    expect(image?.mime).toBe('image/jpeg');
    expect(image?.body.length).toBe(20);
    expect(await loadCreatorImage(db, 'bob')).toBeNull();
    const map = await loadAvatarMap(db);
    expect(map.ana).toMatch(/^\/media\/avatars\/ana\.jpg\?v=/);
    // Déjà là : « missingOnly » ne la reprend pas, l'actualisation d'un créateur la remplace.
    expect((await refreshCreatorAvatars(db, youtube, { missingOnly: true, fetchFn: vi.fn() })).updated).toEqual([]);
    const again = await refreshCreatorAvatars(db, youtube, { onlyCreatorId: ana, fetchFn: vi.fn().mockResolvedValue(jpeg(30)), now: new Date('2026-11-05T08:00:00Z') });
    expect(again.updated).toEqual(['Ana']);
    expect((await loadCreatorImage(db, 'ana'))?.body.length).toBe(30);
    expect((await loadAvatarMap(db)).ana).not.toBe(map.ana);
  });

  it('signale une chaîne sans photo lisible', async () => {
    const noPhoto = { channels: vi.fn(async () => new Map()) };
    expect((await refreshCreatorAvatars(db, noPhoto)).failed).toEqual([{ creator: 'Ana', reason: 'Sa chaîne n’a pas de photo lisible.' }]);
  });
});
