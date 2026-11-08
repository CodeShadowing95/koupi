import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { createTool } from './catalog-admin';
import { addCreatorCode, parseCreatorCode } from './creator-codes';

describe('formulaire « Ajouter un code »', () => {
  it('demande un outil, un code ou un lien, et la réduction', () => {
    expect(parseCreatorCode({ toolSlug: 'notion', code: ' vasto20 ', discount: '-20 %', sourceUrl: 'youtu.be/abc' }))
      .toEqual({ ok: true, data: { toolSlug: 'notion', code: 'VASTO20', discount: '-20 %', creatorLink: null, sourceUrl: 'https://youtu.be/abc', expiresOn: null } });
    expect(parseCreatorCode({ code: 'X', discount: '1' }).ok).toBe(false);
    expect(parseCreatorCode({ toolSlug: 'notion', discount: '-20 %' }).ok).toBe(false);
    expect(parseCreatorCode({ toolSlug: 'notion', code: 'VASTO20' }).ok).toBe(false);
    expect(parseCreatorCode({ toolSlug: 'notion', code: 'VASTO20', discount: '-20 %', expiresOn: '2026-02-31' }).ok).toBe(false);
  });
});

describe('code ajouté depuis le Studio', () => {
  let db: Db;
  let creator: { id: string; slug: string };
  beforeEach(async () => {
    db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    await db.insert(schema.categories).values({ slug: 'notes', name: 'Notes' });
    expect((await createTool(db, { name: 'Notion', categorySlug: 'notes', website: 'https://notion.so', description: null, priority: 1 })).ok).toBe(true);
    const [row] = await db.insert(schema.creators).values({ slug: 'vasto', name: 'Vasto' }).returning();
    creator = { id: row.id, slug: row.slug };
  });
  const input = { toolSlug: 'notion', code: 'VASTO20', discount: '-20 %', creatorLink: null, sourceUrl: null, expiresOn: null };

  it('attend la relecture sur une page non vérifiée, puis refuse un doublon', async () => {
    const result = await addCreatorCode(db, creator, input, 'https://merkod.com/creators/vasto');
    expect(result).toMatchObject({ ok: true, data: { status: 'pending' } });
    const [code] = await db.select().from(schema.codes);
    expect(code).toMatchObject({ status: 'pending', origin: 'creator', sourceUrl: 'https://merkod.com/creators/vasto', creatorId: creator.id });
    expect((await addCreatorCode(db, creator, input, 'https://merkod.com/creators/vasto')).ok).toBe(false);
  });
  it('publie tout de suite quand un compte est prouvé', async () => {
    await db.insert(schema.creatorAccounts).values({ creatorId: creator.id, platform: 'youtube', handle: '@vasto', url: 'https://www.youtube.com/@vasto', claimStatus: 'verified' });
    expect(await addCreatorCode(db, creator, input, 'https://merkod.com/creators/vasto')).toMatchObject({ ok: true, data: { status: 'to_test' } });
  });
});
