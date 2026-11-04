import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { createTool } from './catalog-admin';
import { createCode } from './codes-admin';
import { buildDirectory, copiesThisMonth, directoryPodium, offerScore, directoryCounts, directoryOptions, directoryParams, filterDirectory, parseDirectoryFilter, loadCreatorFacts, monthStart } from './creator-directory';
import { searchCreators, type Code, type Tool } from './data';

const base: Code = {
  id: '1', tool: 'NordVPN', toolSlug: 'nordvpn', creator: 'Ana', creatorSlug: 'ana', code: 'ANA', discount: '-10 %', status: 'verified',
  source: 'https://youtu.be/1', sourceTitle: '', votes: 0, success: 0, lastTestedAt: null, paymentTestedAt: null, expiresOn: null, createdAt: '2026-11-01T00:00:00.000Z',
};
const tools: Tool[] = [
  { slug: 'nordvpn', name: 'NordVPN', category: 'VPN', website: 'https://nordvpn.com', description: '', priority: 1, codes: 1, family: 'securite' },
  { slug: 'notion', name: 'Notion', category: 'Productivité', website: '', description: '', priority: 1, codes: 1, family: 'travail' },
];

describe('monthStart', () => {
  it('donne le premier jour du mois en UTC', () => {
    expect(monthStart(new Date('2026-11-03T06:00:00Z'))).toBe('2026-11-01');
    expect(monthStart(new Date('2026-12-31T23:59:00Z'))).toBe('2026-12-01');
  });
});

describe('annuaire', () => {
  const codes: Code[] = [
    base,
    { ...base, id: '2', tool: 'Notion', toolSlug: 'notion', creatorLevel: 'checked', discount: '-50 % + 2 mois offerts', creatorLink: 'https://notion.so/ana' },
    { ...base, id: '3', creator: 'Bob', creatorSlug: 'bob' },
    { ...base, id: '4', creator: 'Caché', creatorSlug: 'cache', status: 'pending' },
  ];
  const facts = {
    ana: { slug: 'ana', bio: 'Tech', platforms: ['youtube' as const], copies: 3 },
    bob: { slug: 'bob', bio: null, platforms: ['tiktok' as const, 'youtube' as const], copies: 12 },
  };

  it('garde les créateurs visibles, le plus copié d’abord', () => {
    const entries = buildDirectory({ codes, tools }, facts);
    expect(entries.map(entry => entry.slug)).toEqual(['bob', 'ana']);
    expect(entries[1]).toMatchObject({ name: 'Ana', level: 'checked', codes: 2, tools: ['Notion', 'NordVPN'], themes: ['Productivité', 'VPN'], bio: 'Tech', copies: 3 });
  });

  it('met en avant la plus forte offre, avec ses logos et ses familles', () => {
    const [bob, ana] = buildDirectory({ codes, tools }, facts);
    expect(ana.top).toMatchObject({ id: '2', code: 'ANA', discount: '-50 % + 2 mois offerts', link: 'https://notion.so/ana' });
    expect(ana.logos).toEqual([{ slug: 'notion', name: 'Notion' }, { slug: 'nordvpn', name: 'NordVPN' }]);
    expect(ana.families).toEqual(['travail', 'securite']);
    // Sans lien du créateur, le code mène au site de l'outil.
    expect(bob.top.link).toBe('https://nordvpn.com');
  });

  it('classe les offres et garde un podium des créateurs copiés', () => {
    expect(offerScore('-88 % + 4 mois offerts')).toBe(108);
    expect(offerScore('3 mois offerts')).toBe(15);
    expect(offerScore('Offre du créateur')).toBe(0);
    const entries = buildDirectory({ codes, tools }, { ...facts, ana: { ...facts.ana, copies: 0 } });
    expect(directoryPodium(entries).map(entry => entry.slug)).toEqual(['bob']);
  });

  it('filtre par réseau et par famille, et ne propose que les choix présents', () => {
    const entries = buildDirectory({ codes, tools }, facts);
    expect(filterDirectory(entries, { platform: 'tiktok' }).map(entry => entry.slug)).toEqual(['bob']);
    expect(filterDirectory(entries, { family: 'travail' }).map(entry => entry.slug)).toEqual(['ana']);
    expect(filterDirectory(entries, { platform: 'instagram' })).toEqual([]);
    expect(filterDirectory(entries, {})).toHaveLength(2);
    expect(directoryOptions(entries)).toEqual({ platforms: ['youtube', 'tiktok'], families: ['securite', 'travail'] });
  });

  it('cherche dans le nom et les outils du créateur', () => {
    const entries = buildDirectory({ codes, tools }, facts);
    expect(filterDirectory(entries, { query: 'BOB' }).map(entry => entry.slug)).toEqual(['bob']);
    expect(filterDirectory(entries, { query: 'notion' }).map(entry => entry.slug)).toEqual(['ana']);
    expect(filterDirectory(entries, { query: 'ana' }).map(entry => entry.slug)).toEqual(['ana']);
  });

  it('trie par copies, par nombre de codes ou par nom', () => {
    const entries = buildDirectory({ codes, tools }, facts);
    expect(filterDirectory(entries, { sort: 'copies' }).map(entry => entry.slug)).toEqual(['bob', 'ana']);
    expect(filterDirectory(entries, { sort: 'codes' }).map(entry => entry.slug)).toEqual(['ana', 'bob']);
    expect(filterDirectory(entries, { sort: 'name' }).map(entry => entry.slug)).toEqual(['ana', 'bob']);
  });

  it('compte chaque réseau et chaque famille sans tenir compte de son propre filtre', () => {
    const entries = buildDirectory({ codes, tools }, facts);
    const counts = directoryCounts(entries, { platform: 'tiktok' });
    expect(counts.platform).toEqual({ youtube: 2, tiktok: 1 });
    expect(counts.family).toEqual({ securite: 1 });
    expect(counts.all).toEqual({ platform: 2, family: 1 });
  });

  it('lit et écrit les filtres de l’adresse', () => {
    const options = { platforms: ['youtube'], families: ['securite'] };
    expect(parseDirectoryFilter({ platform: 'youtube', family: 'autre', q: 'ana', sort: 'name' }, options))
      .toEqual({ platform: 'youtube', family: '', query: 'ana', sort: 'name' });
    expect(parseDirectoryFilter({ family: 'securite' }, options).family).toBe('securite');
    expect(parseDirectoryFilter({ sort: 'x' }, options).sort).toBe('copies');
    expect(directoryParams({ platform: 'youtube', query: ' ana ', sort: 'copies' }).toString()).toBe('q=ana&platform=youtube');
  });
});

describe('copies du mois en base', () => {
  it('additionne les copies des codes de chaque créateur depuis le 1er du mois', async () => {
    const db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    await db.insert(schema.categories).values({ slug: 'vpn', name: 'VPN' });
    await createTool(db, { name: 'NordVPN', categorySlug: 'vpn', website: 'https://nordvpn.com', description: null, priority: 1 });
    const input = { toolSlug: 'nordvpn', discount: '-10 %', sourceUrl: 'https://youtube.com/watch?v=1', sourceTitle: '', creatorLink: null, note: null, status: 'verified' as const };
    const a = await createCode(db, { ...input, creatorName: 'Ana', code: 'ANA1' });
    const b = await createCode(db, { ...input, creatorName: 'Ana', code: 'ANA2' });
    const c = await createCode(db, { ...input, creatorName: 'Bob', code: 'BOB' });
    if (!a.ok || !b.ok || !c.ok) throw new Error('setup');
    await db.insert(schema.dailyCounters).values([
      { day: '2026-11-02', metric: 'copy', key: a.data.id, count: 4 },
      { day: '2026-11-03', metric: 'copy', key: b.data.id, count: 1 },
      { day: '2026-10-31', metric: 'copy', key: a.data.id, count: 50 },
      { day: '2026-11-02', metric: 'open', key: c.data.id, count: 9 },
    ]);
    const now = new Date('2026-11-03T08:00:00Z');
    const [ana] = await db.select().from(schema.creators).where(eq(schema.creators.slug, 'ana'));
    expect(await copiesThisMonth(db, now)).toEqual(new Map([[ana.id, 5]]));
    const facts = await loadCreatorFacts(db, now);
    expect(facts.ana).toMatchObject({ copies: 5, platforms: [], bio: null });
    expect(facts.bob.copies).toBe(0);
  });
});

describe('searchCreators', () => {
  it('trouve un créateur sans accents ni espaces, rien pour une recherche vide', () => {
    const creators = [{ name: 'Léa Créa' }, { name: 'Bob Tech' }];
    expect(searchCreators(creators, 'leacrea')).toEqual([{ name: 'Léa Créa' }]);
    expect(searchCreators(creators, 'TECH')).toEqual([{ name: 'Bob Tech' }]);
    expect(searchCreators(creators, '  ')).toEqual([]);
  });
});
