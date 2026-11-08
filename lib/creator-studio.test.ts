import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { createTool } from './catalog-admin';
import { createCode } from './codes-admin';
import { copiesPerDay, fillDays, greeting, rosetteGoal, weekTrend, loadFindablePages, matchCreatorPages } from './creator-studio';

const now = new Date('2026-11-08T10:00:00Z');

describe('Merkod Studio', () => {
  it('remplit les 30 jours, du plus ancien au plus récent', () => {
    const series = fillDays([{ day: '2026-11-08', count: 4 }, { day: '2026-10-10', count: 9 }, { day: '2026-11-01', count: 2 }], now);
    expect(series).toHaveLength(30);
    expect(series[0]).toEqual({ day: '2026-10-10', count: 9 });
    expect(series[29]).toEqual({ day: '2026-11-08', count: 4 });
    expect(series.find(item => item.day === '2026-11-01')?.count).toBe(2);
    expect(series.find(item => item.day === '2026-11-02')?.count).toBe(0);
  });

  it('compare la dernière semaine à la précédente, sans inventer de pourcentage', () => {
    const days = (counts: number[]) => counts.map(count => ({ count }));
    expect(weekTrend(days([...Array(7).fill(1), ...Array(7).fill(2)]))).toEqual({ last: 14, previous: 7, change: 100 });
    expect(weekTrend(days([...Array(7).fill(0), ...Array(7).fill(3)]))).toEqual({ last: 21, previous: 0, change: null });
  });

  it('salue selon l’heure de Paris', () => {
    expect(greeting(new Date('2026-11-08T07:00:00Z'))).toBe('Bonjour');
    expect(greeting(new Date('2026-11-08T13:00:00Z'))).toBe('Bon après-midi');
    expect(greeting(new Date('2026-11-08T19:30:00Z'))).toBe('Bonsoir');
  });

  it('montre le compte le plus proche de la rosette', () => {
    const base = { claimStatus: 'none' as const, platformVerified: false, adminCheckedAt: now };
    const goal = rosetteGoal([
      { ...base, platform: 'tiktok', handle: '@a.tt', subscribers: 900 },
      { ...base, platform: 'youtube', handle: '@a', subscribers: 760, claimStatus: 'verified' },
      { ...base, platform: 'instagram', handle: '@a.ig', subscribers: null },
    ]);
    expect(goal).toEqual({ reached: false, best: { platform: 'youtube', label: 'YouTube', handle: '@a', value: 760, target: 1000, unit: 'abonnés', proven: true }, remaining: 240, percent: 76 });
    const podcast = rosetteGoal([{ ...base, platform: 'podcast', handle: 'Pod', subscribers: null, metrics: { rating: 4.8, ratingCount: 20 } }]);
    expect(podcast).toMatchObject({ best: { unit: 'notes', value: 20, target: 50 }, remaining: 30, percent: 40 });
    expect(rosetteGoal([{ ...base, platform: 'youtube', handle: '@a', subscribers: 4000, claimStatus: 'verified' }])).toMatchObject({ reached: true, remaining: 0, percent: 100 });
    expect(rosetteGoal([])).toEqual({ reached: false, best: null, remaining: 0, percent: 0 });
  });

  it('compte les copies de ses codes jour par jour', async () => {
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
      { day: '2026-11-08', metric: 'copy', key: a.data.id, count: 3 },
      { day: '2026-11-08', metric: 'copy', key: b.data.id, count: 2 },
      { day: '2026-11-01', metric: 'copy', key: a.data.id, count: 1 },
      { day: '2026-09-01', metric: 'copy', key: a.data.id, count: 50 },
      { day: '2026-11-08', metric: 'copy', key: c.data.id, count: 7 },
      { day: '2026-11-08', metric: 'open', key: a.data.id, count: 9 },
    ]);
    const [ana] = (await db.select().from(schema.creators)).filter(row => row.slug === 'ana');
    const series = await copiesPerDay(db, ana.id, now);
    expect(series.at(-1)).toEqual({ day: '2026-11-08', count: 5 });
    expect(series.find(item => item.day === '2026-11-01')?.count).toBe(1);
    expect(series.reduce((sum, item) => sum + item.count, 0)).toBe(6);
  });
});

describe('trouver ma page dans le Studio', () => {
  const pages = [
    { slug: 'vastolorde', name: 'Vastolorde', codes: 2, accounts: [{ platform: 'youtube' as const, handle: '@vastolorde' }] },
    { slug: 'le-vasto-show', name: 'Le Vasto Show', codes: 5, accounts: [] },
    { slug: 'nchang', name: 'Nchang', codes: 0, accounts: [{ platform: 'tiktok' as const, handle: '@nchang.belinga' }] },
  ];
  it('ignore le @, les accents, espaces et points, et cherche aussi dans les comptes', () => {
    expect(matchCreatorPages(pages, '@vastolorde').map(page => page.slug)).toEqual(['vastolorde']);
    expect(matchCreatorPages(pages, 'vasto').map(page => page.slug)).toEqual(['vastolorde', 'le-vasto-show']);
    expect(matchCreatorPages(pages, 'Nchang Belinga').map(page => page.slug)).toEqual(['nchang']);
    expect(matchCreatorPages(pages, '@nchang.belinga').map(page => page.slug)).toEqual(['nchang']);
    expect(matchCreatorPages(pages, '@')).toEqual([]);
  });
  it('lit les pages, leurs comptes et leurs codes publiés en base', async () => {
    const db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    const [{ id }] = await db.insert(schema.creators).values({ slug: 'nchang', name: 'Nchang' }).returning();
    await db.insert(schema.creatorAccounts).values({ creatorId: id, platform: 'tiktok', handle: '@nchang.belinga', url: 'https://www.tiktok.com/@nchang.belinga' });
    expect(await loadFindablePages(db)).toEqual([{ slug: 'nchang', name: 'Nchang', codes: 0, accounts: [{ platform: 'tiktok', handle: '@nchang.belinga' }] }]);
  });
});
