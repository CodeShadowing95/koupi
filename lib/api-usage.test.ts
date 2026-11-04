import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { countedYoutubeFetch, nextQuotaReset, quotaDay, recordApiUsage, serviceUsage, usageLevel, usageRatio, youtubeUnits } from './api-usage';
import { usageGauges, usageSummary } from './api-usage-summary';

describe('quota YouTube', () => {
  it('compte 100 unités pour une recherche, 1 pour une lecture', () => {
    expect(youtubeUnits('https://www.googleapis.com/youtube/v3/search?part=id&q=vpn')).toBe(100);
    expect(youtubeUnits('https://www.googleapis.com/youtube/v3/videos?part=snippet&id=a')).toBe(1);
    expect(youtubeUnits('https://www.googleapis.com/youtube/v3/channels?part=snippet&id=a')).toBe(1);
  });

  it('change de jour à minuit heure du Pacifique, vers 9 h à Paris', () => {
    // 4 novembre 2026, 7 h 59 UTC : encore le 3 novembre à Los Angeles (UTC−8 après le changement d'heure du 1er).
    expect(quotaDay('youtube', new Date('2026-11-04T07:59:00Z'))).toBe('2026-11-03');
    expect(quotaDay('youtube', new Date('2026-11-04T08:00:00Z'))).toBe('2026-11-04');
    expect(nextQuotaReset('youtube', new Date('2026-11-04T07:00:00Z')).toISOString()).toBe('2026-11-04T08:00:00.000Z');
    // En été (UTC−7), la remise à zéro tombe à 7 h UTC.
    expect(nextQuotaReset('youtube', new Date('2026-07-10T12:00:00Z')).toISOString()).toBe('2026-07-11T07:00:00.000Z');
  });

  it('note chaque appel, même refusé, sans jamais casser l’appel', async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    const fetchFn = vi.fn().mockResolvedValue(new Response('{}', { status: 403 }));
    const counted = countedYoutubeFetch(record, fetchFn);
    expect((await counted('https://www.googleapis.com/youtube/v3/search?q=a')).status).toBe(403);
    expect(record).toHaveBeenCalledWith('youtube', 100);
    const failing = countedYoutubeFetch(vi.fn().mockRejectedValue(new Error('base')), vi.fn().mockResolvedValue(new Response('{}')));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await failing('https://www.googleapis.com/youtube/v3/videos?id=a')).ok).toBe(true);
  });

  it('classe la jauge : ok, attention à 70 %, critique à 90 %', () => {
    expect(usageRatio(500, 10_000)).toBe(0.05);
    expect(usageRatio(20_000, 10_000)).toBe(1);
    expect([usageLevel(0.5), usageLevel(0.7), usageLevel(0.95)]).toEqual(['ok', 'warn', 'bad']);
  });
});

describe('consommation en base', () => {
  let db: Db;
  beforeEach(async () => {
    const pglite = drizzle(new PGlite(), { schema });
    await migrate(pglite, { migrationsFolder: 'db/migrations' });
    db = pglite as unknown as Db;
  });

  it('additionne les unités du jour et garde 30 jours', async () => {
    const now = new Date('2026-11-04T12:00:00Z');
    await recordApiUsage(db, 'youtube', 100, now);
    await recordApiUsage(db, 'youtube', 1, now);
    await recordApiUsage(db, 'youtube', 1, new Date('2026-11-02T12:00:00Z'));
    const [youtube] = await serviceUsage(db, now);
    expect(youtube).toMatchObject({ service: 'youtube', today: 101, calls: 2, dailyLimit: 10_000 });
    expect(youtube.days).toHaveLength(30);
    expect(youtube.days.at(-1)).toEqual({ day: '2026-11-04', units: 101 });
    expect(youtube.days.at(-3)).toEqual({ day: '2026-11-02', units: 1 });
  });

  it('relit la dépense IA du mois, jour par jour, et en fait les jauges du menu', async () => {
    await db.insert(schema.aiUsage).values([
      { purpose: 'podcast_notes', model: 'm', costUsdMicros: 600_000, createdAt: new Date('2026-11-02T10:00:00Z') },
      { purpose: 'podcast_notes', model: 'm', costUsdMicros: 400_000, createdAt: new Date('2026-10-30T10:00:00Z') },
    ]);
    await recordApiUsage(db, 'youtube', 7_500, new Date('2026-11-04T12:00:00Z'));
    const summary = await usageSummary(db, { ANTHROPIC_API_KEY: 'k', AI_MONTHLY_BUDGET_EUR: '10', AI_USD_PER_EUR: '1.2' }, new Date('2026-11-04T12:00:00Z'));
    expect(summary.ai).toMatchObject({ active: true, spentUsdMicros: 600_000, budgetUsdMicros: 12_000_000 });
    expect(summary.ai.days).toHaveLength(30);
    expect([summary.ai.days[0].day, summary.ai.days.at(-1)?.day]).toEqual(['2026-11-01', '2026-11-30']);
    expect(summary.ai.days[1].usdMicros).toBe(600_000);
    expect(usageGauges(summary).map(gauge => [gauge.key, gauge.level])).toEqual([['youtube', 'warn'], ['ai', 'ok']]);
  });
});
