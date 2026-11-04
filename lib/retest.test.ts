import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { createCode, type CodeInput } from './codes-admin';
import { retestCandidates, runRetests } from './retest';
import { recordVerificationCheck } from './verification-store';

const now = new Date('2026-11-02T03:00:00Z');
const old = new Date('2026-09-01T00:00:00Z');
const base: CodeInput = {
  toolSlug: 'nordvpn', creatorName: 'Ana', code: 'ANA10', discount: '-10 %', sourceUrl: 'https://www.youtube.com/watch?v=abc123XYZ',
  sourceTitle: '', creatorLink: null, note: null, status: 'verified',
};

async function freshDb() {
  const db = drizzle(new PGlite(), { schema }) as unknown as Db;
  await migrate(db as never, { migrationsFolder: 'db/migrations' });
  await db.insert(schema.categories).values({ slug: 'vpn', name: 'VPN' });
  await db.insert(schema.tools).values({ slug: 'nordvpn', name: 'NordVPN', categorySlug: 'vpn', website: 'https://nordvpn.com' });
  return db;
}

async function add(db: Db, input: Partial<CodeInput>, testedAt: Date | null) {
  const created = await createCode(db, { ...base, ...input });
  if (!created.ok) throw new Error(created.error);
  await db.update(schema.codes).set({ lastTestedAt: testedAt }).where(eq(schema.codes.id, created.data.id));
  return created.data.id;
}

describe('retestCandidates', () => {
  it('garde les codes vérifiés anciens, lisibles et pas analysés récemment, les plus anciens d’abord', async () => {
    const db = await freshDb();
    const stale = await add(db, { code: 'A1' }, old);
    const never = await add(db, { code: 'A2' }, null);
    await add(db, { code: 'A3' }, new Date('2026-10-20T00:00:00Z'));
    await add(db, { code: 'A4', status: 'to_test' }, old);
    await add(db, { code: 'A5', sourceUrl: 'https://instagram.com/p/x' }, old);
    const analysed = await add(db, { code: 'A6' }, old);
    await db.insert(schema.verificationChecks).values({ codeId: analysed, score: 90, createdAt: new Date('2026-10-25T00:00:00Z') });
    expect(await retestCandidates(db, now)).toEqual([never, stale]);
    expect(await retestCandidates(db, now, 1)).toEqual([never]);
  });
});

describe('runRetests', () => {
  it('relit chaque code sans changer son statut', async () => {
    const db = await freshDb();
    const id = await add(db, {}, old);
    const report = await runRetests(db, { readSource: async () => ({ online: false, title: '', description: '' }) }, now);
    expect(report).toEqual({ checked: 1, failed: 0 });
    const [row] = await db.select().from(schema.codes).where(eq(schema.codes.id, id));
    expect(row.status).toBe('verified');
    expect((await db.select().from(schema.verificationChecks)).length).toBe(1);
  });
  it('continue quand une source ne répond pas', async () => {
    const db = await freshDb();
    await add(db, { code: 'B1' }, old);
    await add(db, { code: 'B2' }, old);
    await recordVerificationCheck(db, { codeId: await add(db, { code: 'B3' }, new Date('2026-10-30')), score: 50, reasons: [] });
    const report = await runRetests(db, { readSource: async () => { throw new Error('boom'); } }, now);
    expect(report.checked).toBe(2);
  });
});
