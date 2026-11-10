import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { createTool } from './catalog-admin';
import { confirmsCreatorName, CREATOR_DELETE_ACTION, deleteCreator } from './creator-delete';

const now = new Date('2026-11-10T12:00:00Z');

describe('confirmation par le nom', () => {
  it('accepte le nom exact, sans tenir compte des majuscules ni des espaces', () => {
    expect(confirmsCreatorName('  la micro  by flo ', 'La Micro by Flo')).toBe(true);
    expect(confirmsCreatorName('La Micro', 'La Micro by Flo')).toBe(false);
    expect(confirmsCreatorName('', '')).toBe(false);
    expect(confirmsCreatorName(undefined, 'Ana')).toBe(false);
  });
});

describe('suppression d’un créateur', () => {
  let db: Db;
  let ana: string;
  let other: string;
  let toolId: string;

  beforeEach(async () => {
    db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    await db.insert(schema.categories).values({ slug: 'notes', name: 'Notes' });
    expect((await createTool(db, { name: 'Notion', categorySlug: 'notes', website: 'https://notion.so', description: null, priority: 1 })).ok).toBe(true);
    [{ id: toolId }] = await db.select({ id: schema.tools.id }).from(schema.tools);
    [{ id: ana }, { id: other }] = await db.insert(schema.creators).values([
      { slug: 'ana', name: 'Ana Tech' },
      { slug: 'zoe', name: 'Zoé' },
    ]).returning();
    await db.insert(schema.creatorAccounts).values({ creatorId: ana, platform: 'youtube', externalId: 'UCana', handle: '@anatech', url: 'https://youtube.com/@anatech' });
    const [submission] = await db.insert(schema.submissions).values({
      toolName: 'Notion', creatorName: 'Ana Tech', code: 'ANA20', discountLabel: '-20 %', sourceUrl: 'https://youtube.com/watch?v=a', ipHash: 'x', fingerprint: 'y',
    }).returning();
    const [code] = await db.insert(schema.codes).values({
      toolId, creatorId: ana, code: 'ANA20', discount: '-20 %', creatorLink: 'https://notion.so/?ref=ana', sourceUrl: 'https://youtube.com/watch?v=a', submissionId: submission.id,
    }).returning();
    await db.update(schema.submissions).set({ createdCodeId: code.id });
    await db.insert(schema.codes).values({ toolId, creatorId: other, code: 'ZOE10', discount: '-10 %', sourceUrl: 'https://youtube.com/watch?v=z' });
    await db.insert(schema.codeLogs).values({ codeId: code.id, action: 'create', nextStatus: 'pending' });
    await db.insert(schema.verificationChecks).values([{ codeId: code.id, score: 80 }, { submissionId: submission.id, score: 70 }]);
    await db.insert(schema.toolSuggestions).values({ name: 'Gradium', code: 'ANA', discount: '-10 %', sourceUrl: 'https://youtube.com/watch?v=a', creatorId: ana });
    await db.insert(schema.watchedSources).values({ platform: 'youtube', externalId: 'UCana', title: 'Ana Tech', creatorId: ana });
    await db.insert(schema.storedImages).values({ creatorId: ana, mime: 'image/png', data: 'aGk=', bytes: 2, sourceUrl: 'https://yt.com/a.png' });
    await db.insert(schema.creatorUsers).values({ email: 'ana@exemple.fr', creatorId: ana, accessGrantedAt: now });
    await db.insert(schema.creatorSignInTokens).values({ email: 'ana@exemple.fr', tokenHash: 'a'.repeat(64), ipHash: 'x', expiresAt: now });
  });

  it('refuse sans le nom exact et ne touche à rien', async () => {
    expect(await deleteCreator(db, ana, 'Ana')).toMatchObject({ ok: false });
    expect(await db.select().from(schema.creators)).toHaveLength(2);
    expect(await db.select().from(schema.codes)).toHaveLength(2);
  });

  it('efface la page et tout ce qui la concerne, garde l’outil et les autres créateurs', async () => {
    expect(await deleteCreator(db, ana, 'ana tech')).toEqual({ ok: true, data: { name: 'Ana Tech', codes: 1 } });
    expect((await db.select().from(schema.creators)).map(row => row.slug)).toEqual(['zoe']);
    expect((await db.select().from(schema.codes)).map(row => row.code)).toEqual(['ZOE10']);
    expect(await db.select().from(schema.tools)).toHaveLength(1);
    for (const table of [schema.codeLogs, schema.verificationChecks, schema.submissions, schema.toolSuggestions, schema.watchedSources,
      schema.storedImages, schema.creatorAccounts, schema.creatorUsers, schema.creatorSignInTokens]) {
      expect(await db.select().from(table)).toHaveLength(0);
    }
    const log = await db.select().from(schema.adminAuditLog);
    expect(log).toEqual([expect.objectContaining({ action: CREATOR_DELETE_ACTION, target: 'Ana Tech' })]);
  });

  it('répond « introuvable » pour un créateur déjà supprimé', async () => {
    await deleteCreator(db, ana, 'Ana Tech');
    expect(await deleteCreator(db, ana, 'Ana Tech')).toEqual({ ok: false, error: 'Créateur introuvable.' });
  });
});
