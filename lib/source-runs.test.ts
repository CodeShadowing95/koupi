import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { listRuns, recordRun, sourceActivity, sourceInventory, yieldByOrigin } from './source-runs';

const now = new Date('2026-11-05T12:00:00Z');
const summary = (failed: string[] = [], attempted = 2) => ({ items: 4, codes: 1, suggested: 2, units: 3, failed, attempted });

describe('journal des passages', () => {
  let db: Db;
  beforeEach(async () => {
    db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
  });

  it('note un passage réussi, partiel, raté, et rien quand rien n’a été lu', async () => {
    expect(await recordRun(db, { source: 'podcast', trigger: 'cron', scope: 'Tous' }, async () => 'ok', () => summary())).toBe('ok');
    await recordRun(db, { source: 'youtube_channel', trigger: 'manual', scope: '' }, async () => 1, () => summary(['@geek']));
    await recordRun(db, { source: 'youtube_search', trigger: 'manual', scope: 'Catégorie vpn' }, async () => 1, () => ({ ...summary(), scope: 'Catégorie VPN' }));
    await recordRun(db, { source: 'youtube_search', trigger: 'manual', scope: 'Outil' }, async () => 1, () => null);
    await expect(recordRun(db, { source: 'podcast', trigger: 'manual', scope: 'Un podcast' }, async () => { throw new Error('flux cassé'); }, () => summary())).rejects.toThrow('flux cassé');

    const runs = await listRuns(db);
    expect(runs).toHaveLength(4);
    const by = (scope: string) => runs.find(run => run.scope === scope)!;
    expect(by('Tous')).toMatchObject({ source: 'podcast', trigger: 'cron', status: 'ok', items: 4, codes: 1, suggested: 2, units: 3, error: null });
    expect(by('')).toMatchObject({ status: 'partial', error: 'Pas de réponse pour : @geek' });
    expect(by('Catégorie VPN').status).toBe('ok');
    expect(by('Un podcast')).toMatchObject({ status: 'failed', error: 'flux cassé', items: 0 });
  });

  it('résume l’activité du mois de chaque source', async () => {
    await db.insert(schema.sourceRuns).values([
      { source: 'youtube_search', trigger: 'manual', status: 'ok', units: 400, startedAt: new Date('2026-11-02T10:00:00Z') },
      { source: 'youtube_search', trigger: 'manual', status: 'ok', units: 200, startedAt: new Date('2026-11-04T10:00:00Z') },
      { source: 'youtube_search', trigger: 'manual', status: 'ok', units: 900, startedAt: new Date('2026-10-20T10:00:00Z') },
    ]);
    await db.insert(schema.aiUsage).values({ purpose: 'category_search', model: 'm', costUsdMicros: 250_000 });
    const activity = await sourceActivity(db, now);
    expect(activity.youtube_search).toMatchObject({ runsThisMonth: 2, unitsThisMonth: 600 });
    expect(activity.youtube_search.lastRun?.startedAt).toBe('2026-11-04T10:00:00.000Z');
    expect(activity.podcast).toEqual({ lastRun: null, runsThisMonth: 0, unitsThisMonth: 0, aiUsdThisMonth: 0 });
  });

  it('compte le rendement de chaque origine et ce qui est suivi', async () => {
    await db.insert(schema.categories).values({ slug: 'vpn', name: 'VPN' });
    const [tool] = await db.insert(schema.tools).values({ slug: 'nordvpn', name: 'NordVPN', categorySlug: 'vpn', website: 'https://nordvpn.com' }).returning();
    const [creator] = await db.insert(schema.creators).values({ slug: 'geek', name: 'Geek' }).returning();
    const base = { toolId: tool.id, creatorId: creator.id, discount: '-10 %', sourceUrl: 'https://youtube.com/watch?v=x', sourceTitle: '', origin: 'youtube_channel' as const };
    const [published] = await db.insert(schema.codes).values([
      { ...base, code: 'A', status: 'verified' as const },
      { ...base, code: 'B', status: 'rejected' as const },
      { ...base, code: 'C', status: 'pending' as const },
      { ...base, code: 'D', status: 'verified' as const, archivedAt: now },
      { ...base, code: 'E', status: 'pending' as const, origin: 'podcast' as const },
    ]).returning();
    await db.insert(schema.dailyCounters).values([
      { day: '2026-11-03', metric: 'copy', key: published.id, count: 5 },
      { day: '2026-10-30', metric: 'copy', key: published.id, count: 9 },
    ]);
    const yields = await yieldByOrigin(db, now);
    expect(yields.youtube_channel).toMatchObject({ found: 3, published: 1, rejected: 1, waiting: 1, copies: 5 });
    expect(yields.podcast).toMatchObject({ found: 1, waiting: 1, copies: 0 });
    expect(yields.ai_web.found).toBe(0);

    await db.insert(schema.watchedSources).values([
      { platform: 'youtube', externalId: 'UC1', title: 'A' },
      { platform: 'youtube', externalId: 'UC2', title: 'B', active: false },
      { platform: 'podcast', externalId: '42', title: 'P' },
    ]);
    expect(await sourceInventory(db)).toEqual({ channels: { active: 1, paused: 1 }, podcasts: { active: 1, paused: 0 }, submissionsNew: 0 });
  });
});
