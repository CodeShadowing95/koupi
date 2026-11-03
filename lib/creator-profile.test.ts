import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { creatorCategories, loadCreatorProfile, publicAccounts } from './creator-profile';

describe('publicAccounts', () => {
  it('range YouTube d’abord, puis le compte le plus suivi', () => {
    const accounts = publicAccounts([
      { platform: 'instagram', handle: '@ana', url: 'https://instagram.com/ana', subscribers: 50 },
      { platform: 'youtube', handle: '@ana-tech', url: 'https://youtube.com/@ana-tech', subscribers: null },
      { platform: 'youtube', handle: '@ana', url: 'https://youtube.com/@ana', subscribers: 12_400 },
    ]);
    expect(accounts.map(account => account.handle)).toEqual(['@ana', '@ana-tech', '@ana']);
    expect(accounts[0]).toMatchObject({ label: 'YouTube', subscribers: '12 400 abonnés' });
    expect(accounts[1].subscribers).toBeNull();
    expect(accounts[2].label).toBe('Instagram');
  });
});

describe('creatorCategories', () => {
  it('déduit les thèmes des outils, le plus fréquent d’abord', () => {
    const tools = [{ slug: 'nord', category: 'VPN' }, { slug: 'notion', category: 'Productivité' }, { slug: 'surf', category: 'VPN' }];
    expect(creatorCategories([{ toolSlug: 'notion' }, { toolSlug: 'nord' }, { toolSlug: 'surf' }, { toolSlug: 'inconnu' }], tools)).toEqual(['VPN', 'Productivité']);
    expect(creatorCategories([], tools)).toEqual([]);
  });
});

describe('loadCreatorProfile', () => {
  it('lit la présentation et les comptes, null pour une adresse inconnue', async () => {
    const db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    const [ana] = await db.insert(schema.creators).values({ slug: 'ana', name: 'Ana', bio: 'Je teste des outils IA.' }).returning();
    await db.insert(schema.creatorAccounts).values({ creatorId: ana.id, platform: 'tiktok', handle: '@ana', url: 'https://tiktok.com/@ana', subscribers: 1 });
    expect(await loadCreatorProfile(db, 'ana')).toEqual({
      bio: 'Je teste des outils IA.',
      accounts: [{ platform: 'tiktok', label: 'TikTok', handle: '@ana', url: 'https://tiktok.com/@ana', subscribers: '1 abonné' }],
    });
    expect(await loadCreatorProfile(db, 'personne')).toBeNull();
  });

  it('refuse une présentation vide ou trop longue en base', async () => {
    const db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    await expect(db.insert(schema.creators).values({ slug: 'a', name: 'A', bio: '' })).rejects.toThrow();
    await expect(db.insert(schema.creators).values({ slug: 'b', name: 'B', bio: 'x'.repeat(401) })).rejects.toThrow();
  });
});
