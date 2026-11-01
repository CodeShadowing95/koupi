import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { audienceStats, bumpCounter, normalizeQuery, recordVote } from './audience';
import { createCode } from './codes-admin';

async function setup() {
  const db = drizzle(new PGlite(), { schema }) as unknown as Db;
  await migrate(db as never, { migrationsFolder: 'db/migrations' });
  await db.insert(schema.categories).values({ slug: 'vpn', name: 'VPN' });
  await db.insert(schema.tools).values({ slug: 'nordvpn', name: 'NordVPN', categorySlug: 'vpn', website: 'https://nordvpn.com' });
  const input = { toolSlug: 'nordvpn', creatorName: 'Ana', discount: '-10 %', sourceUrl: 'https://tiktok.com/@ana/video/1', sourceTitle: '', creatorLink: null, note: null };
  const live = await createCode(db, { ...input, code: 'LIVE', status: 'to_test' });
  const hidden = await createCode(db, { ...input, code: 'HIDDEN', status: 'pending' });
  if (!live.ok || !hidden.ok) throw new Error('setup');
  return { db, live: live.data.id, hidden: hidden.data.id };
}

describe('votes', () => {
  let ctx: Awaited<ReturnType<typeof setup>>;
  beforeEach(async () => { ctx = await setup(); });

  it('compte les votes d’un code public', async () => {
    expect(await recordVote(ctx.db, ctx.live, true)).toEqual({ up: 1, down: 0 });
    expect(await recordVote(ctx.db, ctx.live, false)).toEqual({ up: 1, down: 1 });
  });

  it('refuse un vote sur un code masqué ou inconnu', async () => {
    expect(await recordVote(ctx.db, ctx.hidden, true)).toBeNull();
    expect(await recordVote(ctx.db, '00000000-0000-0000-0000-000000000000', true)).toBeNull();
  });
});

describe('audience anonyme', () => {
  it('normalise une recherche', () => {
    expect(normalizeQuery('  Canva   PRO ')).toBe('canva pro');
    expect(normalizeQuery('x'.repeat(100))).toHaveLength(60);
  });

  it('additionne par jour et classe codes, outils et recherches vides', async () => {
    const { db, live } = await setup();
    const now = new Date('2026-11-04T12:00:00Z');
    const yesterday = new Date('2026-11-03T08:00:00Z');
    await bumpCounter(db, 'copy', live, now);
    await bumpCounter(db, 'copy', live, now);
    await bumpCounter(db, 'copy', live, yesterday);
    await bumpCounter(db, 'open', live, now);
    await bumpCounter(db, 'search_empty', 'canva', now);
    await bumpCounter(db, 'search_empty', 'canva', yesterday);
    await bumpCounter(db, 'copy', live, new Date('2026-09-01T00:00:00Z')); // hors période

    const stats = await audienceStats(db, 7, now);
    expect(stats.totals).toEqual({ copies: 3, opens: 1, emptySearches: 2 });
    expect(stats.daily).toHaveLength(7);
    expect(stats.daily.at(-1)).toEqual({ day: '2026-11-04', copies: 2, opens: 1 });
    expect(stats.daily.at(-2)).toEqual({ day: '2026-11-03', copies: 1, opens: 0 });
    expect(stats.topCodes).toEqual([{ code: 'LIVE', tool: 'NordVPN', copies: 3 }]);
    expect(stats.topTools).toEqual([{ tool: 'NordVPN', opens: 1 }]);
    expect(stats.emptySearches).toEqual([{ query: 'canva', count: 2 }]);
  });
});
