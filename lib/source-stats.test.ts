import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { groupBySource, sourceLesson, sourceStats } from './source-stats';

const now = new Date('2026-11-05T12:00:00Z');
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);

describe('groupBySource', () => {
  it('regroupe la saisie, l’import et l’inconnu, et cache les sources à venir sans chiffre', () => {
    const groups = groupBySource([
      { origin: 'manual', found: 1, published: 1, copies: 2 },
      { origin: 'import', found: 2, published: 0, copies: 3 },
      { origin: 'podcast', found: 4, published: 1, copies: 0 },
    ]);
    expect(groups.map(group => group.key)).toEqual(['youtube_search', 'youtube_channel', 'podcast', 'submission', 'manual']);
    expect(groups.find(group => group.key === 'manual')).toMatchObject({ found: 3, published: 1, copies: 5 });
  });
});

describe('sourceStats', () => {
  it('compte sur 30 jours par source, puis les copies par outil et par catégorie', async () => {
    const db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    await db.insert(schema.categories).values([{ slug: 'vpn', name: 'VPN' }, { slug: 'banque', name: 'Banque' }]);
    const [nord, revolut] = await db.insert(schema.tools).values([
      { slug: 'nordvpn', name: 'NordVPN', categorySlug: 'vpn', website: 'https://nordvpn.com' },
      { slug: 'revolut', name: 'Revolut', categorySlug: 'banque', website: 'https://revolut.com' },
    ]).returning();
    const [creator] = await db.insert(schema.creators).values({ slug: 'geek', name: 'Geek' }).returning();
    const base = { creatorId: creator.id, discount: '-10 %', sourceUrl: 'https://youtube.com/watch?v=x', sourceTitle: '' };
    const [a, b, , d] = await db.insert(schema.codes).values([
      { ...base, toolId: nord.id, code: 'A', origin: 'podcast' as const, status: 'verified' as const, createdAt: daysAgo(3) },
      { ...base, toolId: nord.id, code: 'B', origin: 'podcast' as const, status: 'pending' as const, createdAt: daysAgo(10) },
      { ...base, toolId: nord.id, code: 'VIEUX', origin: 'podcast' as const, status: 'verified' as const, createdAt: daysAgo(90) },
      { ...base, toolId: revolut.id, code: 'D', origin: 'youtube_channel' as const, status: 'to_test' as const, createdAt: daysAgo(90) },
    ]).returning();
    await db.insert(schema.dailyCounters).values([
      { day: '2026-11-01', metric: 'copy', key: a.id, count: 4 },
      { day: '2026-11-02', metric: 'copy', key: d.id, count: 6 },
      { day: '2026-11-03', metric: 'copy', key: b.id, count: 1 },
      { day: '2026-09-01', metric: 'copy', key: a.id, count: 50 },
      { day: '2026-11-03', metric: 'open', key: a.id, count: 9 },
    ]);
    const stats = await sourceStats(db, now);
    expect(stats.since).toBe('2026-10-06');
    expect(stats.sources.find(item => item.key === 'podcast')).toMatchObject({ found: 2, published: 1, copies: 5 });
    expect(stats.sources.find(item => item.key === 'youtube_channel')).toMatchObject({ found: 0, published: 0, copies: 6 });
    expect(stats.tools).toEqual([{ name: 'Revolut', slug: 'revolut', copies: 6 }, { name: 'NordVPN', slug: 'nordvpn', copies: 5 }]);
    expect(stats.categories).toEqual([{ name: 'Banque', slug: 'banque', copies: 6 }, { name: 'VPN', slug: 'vpn', copies: 5 }]);
    expect(stats.totalCopies).toBe(11);
  });
});

describe('sourceLesson', () => {
  const row = (label: string, found: number, published: number, copies: number) => ({ key: label, label, found, published, copies });
  it('dit d’attendre quand il n’y a pas de chiffres', () => {
    expect(sourceLesson([row('Propositions', 0, 0, 0)])).toMatch(/Pas encore/);
  });
  it('nomme la source qui fait le plus copier', () => {
    expect(sourceLesson([row('Propositions', 2, 2, 3), row('Chaînes suivies', 3, 3, 40)])).toMatch(/« Chaînes suivies » fait le plus copier \(40 copies\)/);
  });
  it('signale une source qui trouve beaucoup mais publie peu', () => {
    const text = sourceLesson([row('Recherche YouTube', 12, 2, 0)]);
    expect(text).toMatch(/« Recherche YouTube » trouve beaucoup \(12 codes\)/);
    expect(text).toMatch(/que 2/);
  });
});
