import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { createCode } from './codes-admin';
import { mergeTool } from './tool-merge';

describe('mergeTool', () => {
  let db: Db;
  const toolId = async (slug: string) => (await db.select().from(schema.tools).where(eq(schema.tools.slug, slug)))[0].id;
  const add = async (toolSlug: string, code: string, creatorName = 'Ana') => {
    const result = await createCode(db, { toolSlug, creatorName, code, discount: '-49 %', sourceUrl: `https://www.youtube.com/watch?v=${code.padEnd(11, 'x').slice(0, 11)}`, sourceTitle: '', creatorLink: null, note: null, status: 'verified' });
    if (!result.ok) throw new Error(result.error);
  };

  beforeEach(async () => {
    db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    await db.insert(schema.categories).values({ slug: 'vpn', name: 'VPN' });
    await db.insert(schema.tools).values([
      { slug: 'expressvpn', name: 'ExpressVPN', categorySlug: 'vpn', website: 'https://www.expressvpn.com' },
      { slug: 'coupon', name: 'Coupon', categorySlug: 'vpn', website: 'https://www.expressvpn.com/coupon' },
    ]);
  });

  it('passe les codes sur le bon outil, archive les doublons et l’outil en double', async () => {
    await add('expressvpn', 'ANA49');
    await add('coupon', 'ana49', 'Bruno');
    await add('coupon', 'BRUNO', 'Bruno');
    const [from, into] = [await toolId('coupon'), await toolId('expressvpn')];
    await db.insert(schema.toolSuggestions).values({ name: 'Coupon', code: 'X1', discount: '-10 %', evidence: 'e', sourceUrl: 'https://example.com/e', toolId: from });

    expect(await mergeTool(db, from, into)).toEqual({ ok: true, data: { into: 'ExpressVPN', moved: 1, duplicates: 1 } });

    const rows = await db.select().from(schema.codes);
    expect(rows.filter(row => row.toolId === into && !row.archivedAt).map(row => row.code).sort()).toEqual(['ANA49', 'BRUNO']);
    const duplicate = rows.find(row => row.toolId === from)!;
    expect(duplicate.archivedAt).not.toBeNull();
    const [tool] = await db.select().from(schema.tools).where(eq(schema.tools.id, from));
    expect(tool.archivedAt).not.toBeNull();
    const [suggestion] = await db.select().from(schema.toolSuggestions);
    expect(suggestion.toolId).toBe(into);
    const notes = (await db.select().from(schema.codeLogs)).map(log => log.note);
    expect(notes).toContain('Rattaché par fusion d’outils : Coupon → ExpressVPN.');
    expect(notes).toContain('Fusion de Coupon dans ExpressVPN : ce code y était déjà.');
  });

  it('refuse le même outil, un outil inconnu ou archivé', async () => {
    const [from, into] = [await toolId('coupon'), await toolId('expressvpn')];
    expect(await mergeTool(db, from, from)).toEqual({ ok: false, error: 'Choisis un autre outil que celui-ci.' });
    expect(await mergeTool(db, from, '00000000-0000-4000-8000-000000000000')).toEqual({ ok: false, error: 'Choisis un outil du catalogue.' });
    await db.update(schema.tools).set({ archivedAt: new Date() }).where(eq(schema.tools.id, into));
    expect(await mergeTool(db, from, into)).toEqual({ ok: false, error: 'ExpressVPN est archivé : restaure-le d’abord.' });
  });
});
