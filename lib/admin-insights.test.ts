import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { adminInsights, median, weekStart, weeklyBuckets } from './admin-insights';
import { createSubmission, listSubmissions, moderateSubmission } from './submissions';

describe('calculs', () => {
  it('prend la médiane', () => {
    expect(median([])).toBeNull();
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it('ramène une date au lundi de sa semaine', () => {
    expect(weekStart(new Date('2026-11-01T09:00:00Z')).toISOString()).toBe('2026-10-26T00:00:00.000Z'); // dimanche
    expect(weekStart(new Date('2026-10-26T00:00:00Z')).toISOString()).toBe('2026-10-26T00:00:00.000Z'); // lundi
  });

  it('range les propositions par semaine, semaines vides comprises', () => {
    const now = new Date('2026-11-04T12:00:00Z');
    const buckets = weeklyBuckets([
      { createdAt: new Date('2026-11-03T10:00:00Z'), status: 'approved' },
      { createdAt: new Date('2026-11-02T10:00:00Z'), status: 'new' },
      { createdAt: new Date('2026-10-20T10:00:00Z'), status: 'rejected' },
      { createdAt: new Date('2026-10-21T10:00:00Z'), status: 'duplicate' },
      { createdAt: new Date('2025-01-01T10:00:00Z'), status: 'approved' },
    ], 3, now);
    expect(buckets).toEqual([
      { start: '2026-10-19', approved: 0, closed: 2, pending: 0 },
      { start: '2026-10-26', approved: 0, closed: 0, pending: 0 },
      { start: '2026-11-02', approved: 1, closed: 0, pending: 1 },
    ]);
  });
});

describe('indicateurs depuis la base', () => {
  let db: Db;
  beforeAll(async () => {
    const pglite = drizzle(new PGlite(), { schema });
    await migrate(pglite, { migrationsFolder: 'db/migrations' });
    db = pglite as unknown as Db;
    const base = { creatorName: 'Lucas', discountLabel: '-20 %', sourceUrl: 'https://youtube.com/watch?v=x' };
    await createSubmission(db, { ...base, toolName: 'Hostinger', code: 'LUCAS20' }, 'h');
    await createSubmission(db, { ...base, toolName: 'Brevo', code: 'BREVO10' }, 'h');
    await createSubmission(db, { ...base, toolName: 'Canva', code: 'CANVA5' }, 'h');
    const rows = await listSubmissions(db, { status: 'all' });
    await moderateSubmission(db, rows.find(row => row.code === 'LUCAS20')!.id, 'approve', null);
    await moderateSubmission(db, rows.find(row => row.code === 'BREVO10')!.id, 'reject', null);
  });

  it('compte la file, les propositions reçues et le journal récent', async () => {
    const insights = await adminInsights(db, 30);
    expect(insights.pending).toBe(1);
    expect(insights.received).toBe(3);
    expect(insights.medianDelayHours).not.toBeNull();
    expect(insights.medianDelayHours!).toBeLessThan(1);
    expect(insights.weekly).toHaveLength(5);
    expect(insights.weekly.at(-1)).toEqual(expect.objectContaining({ approved: 1, closed: 1, pending: 1 }));
    expect(insights.recent.map(item => [item.code, item.nextStatus])).toEqual([['BREVO10', 'rejected'], ['LUCAS20', 'approved']]);
  });
});
