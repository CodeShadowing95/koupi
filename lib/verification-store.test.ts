import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { createCode } from './codes-admin';
import { aiSpendSince, latestCheckForCode, recordVerificationCheck, startOfMonthUtc } from './verification-store';

async function setup() {
  const db = drizzle(new PGlite(), { schema }) as unknown as Db;
  await migrate(db as never, { migrationsFolder: 'db/migrations' });
  await db.insert(schema.categories).values({ slug: 'vpn', name: 'VPN' });
  await db.insert(schema.tools).values({ slug: 'nordvpn', name: 'NordVPN', categorySlug: 'vpn', website: 'https://nordvpn.com' });
  const created = await createCode(db, {
    toolSlug: 'nordvpn', creatorName: 'Ana', code: 'ANA10', discount: '-10 %', sourceUrl: 'https://youtube.com/watch?v=1',
    sourceTitle: '', creatorLink: null, note: null, status: 'pending',
  });
  if (!created.ok) throw new Error('setup');
  return { db, codeId: created.data.id };
}

describe('analyses de vérification', () => {
  let ctx: Awaited<ReturnType<typeof setup>>;
  beforeEach(async () => { ctx = await setup(); });

  it('enregistre une analyse sans IA et la relit', async () => {
    await recordVerificationCheck(ctx.db, { codeId: ctx.codeId, score: 40, reasons: [{ points: 10, label: 'La source est en ligne.' }] });
    const latest = await latestCheckForCode(ctx.db, ctx.codeId);
    expect(latest).toMatchObject({ score: 40, model: null, costUsdMicros: 0, extracted: null });
    expect(latest?.reasons).toEqual([{ points: 10, label: 'La source est en ligne.' }]);
  });

  it('borne le score et le coût', async () => {
    const row = await recordVerificationCheck(ctx.db, { codeId: ctx.codeId, score: 140, reasons: [], costUsdMicros: -5 });
    expect(row.score).toBe(100);
    expect(row.costUsdMicros).toBe(0);
  });

  it('refuse une analyse sans code ni proposition', async () => {
    await expect(recordVerificationCheck(ctx.db, { score: 10, reasons: [] })).rejects.toThrow();
  });

  it('additionne la dépense IA du mois', async () => {
    await recordVerificationCheck(ctx.db, { codeId: ctx.codeId, score: 50, reasons: [], model: 'm', costUsdMicros: 1200 });
    await recordVerificationCheck(ctx.db, { codeId: ctx.codeId, score: 50, reasons: [], model: 'm', costUsdMicros: 800 });
    expect(await aiSpendSince(ctx.db, startOfMonthUtc())).toBe(2000);
    await ctx.db.insert(schema.toolSuggestions).values({ name: 'Gradium', domain: 'gradium.ai', code: 'GDIY', discount: '-10 %', sourceUrl: 'https://podcasts.apple.com/podcast/id1?i=2', analysisCostUsdMicros: 300, analyzedAt: new Date() });
    expect(await aiSpendSince(ctx.db, startOfMonthUtc())).toBe(2300);
    expect(await aiSpendSince(ctx.db, new Date(Date.now() + 60_000))).toBe(0);
  });

  it('accepte la date et l’action « testé au paiement »', async () => {
    const at = new Date();
    await ctx.db.update(schema.codes).set({ paymentTestedAt: at }).where(eq(schema.codes.id, ctx.codeId));
    await ctx.db.insert(schema.codeLogs).values({ codeId: ctx.codeId, action: 'payment_test', previousStatus: 'pending', nextStatus: 'verified' });
    const [code] = await ctx.db.select().from(schema.codes).where(eq(schema.codes.id, ctx.codeId));
    expect(code.paymentTestedAt?.getTime()).toBe(at.getTime());
  });

  it('suit une chaîne ou un podcast une seule fois par plateforme', async () => {
    await ctx.db.insert(schema.watchedSources).values({ platform: 'podcast', externalId: '920666', title: 'GDIY' });
    await expect(ctx.db.insert(schema.watchedSources).values({ platform: 'podcast', externalId: '920666', title: 'GDIY' })).rejects.toThrow();
    await expect(ctx.db.insert(schema.watchedSources).values({ platform: 'tiktok' as never, externalId: 'x', title: 'x' })).rejects.toThrow();
  });
});

describe('startOfMonthUtc', () => {
  it('rend le 1er du mois à minuit UTC', () => {
    expect(startOfMonthUtc(new Date('2026-11-17T15:00:00Z')).toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });
});
