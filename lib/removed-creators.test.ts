import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { createTool } from './catalog-admin';
import { createCode, resolveCreator } from './codes-admin';
import { deleteCreator } from './creator-delete';
import { creditedCreator } from './compilation-creator';
import { isRemovedCreator, liftRemovalForAccount, listRemovedCreators, REMOVED_CREATOR_ERROR, unremoveCreator } from './removed-creators';

describe('créateurs retirés à leur demande', () => {
  let db: Db;
  let flo: string;

  beforeEach(async () => {
    db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    await db.insert(schema.categories).values({ slug: 'compta', name: 'Compta' });
    expect((await createTool(db, { name: 'Indy', categorySlug: 'compta', website: 'https://indy.fr', description: null, priority: 1 })).ok).toBe(true);
    const [{ id: toolId }] = await db.select({ id: schema.tools.id }).from(schema.tools);
    [{ id: flo }] = await db.insert(schema.creators).values({ slug: 'la-micro-by-flo', name: 'La Micro by Flo' }).returning();
    await db.insert(schema.creatorAccounts).values({ creatorId: flo, platform: 'youtube', externalId: 'UCflo', handle: '@lamicrobyflo', url: 'https://youtube.com/@lamicrobyflo' });
    await db.insert(schema.codes).values({ toolId, creatorId: flo, code: 'LAMICROBYFLO', discount: 'Offre', sourceUrl: 'https://youtube.com/watch?v=a', importKey: 'indy-lamicrobyflo' });
    expect((await deleteCreator(db, flo, 'La Micro by Flo')).ok).toBe(true);
  });

  it('la suppression l’ajoute à la liste, avec sa chaîne et ses codes importés', async () => {
    const [row] = await db.select().from(schema.removedCreators);
    expect(row).toMatchObject({ name: 'La Micro by Flo', slug: 'la-micro-by-flo', channelIds: ['UCflo'], importKeys: ['indy-lamicrobyflo'] });
    expect(await listRemovedCreators(db)).toEqual([expect.objectContaining({ name: 'La Micro by Flo', channels: 1 })]);
  });

  it('le reconnaît par son nom écrit autrement ou par sa chaîne', async () => {
    expect(await isRemovedCreator(db, { name: 'la micro by flo' })).toBe(true);
    expect(await isRemovedCreator(db, { name: 'LaMicroByFlo' })).toBe(true);
    expect(await isRemovedCreator(db, { name: 'Autre nom', channelId: 'UCflo' })).toBe(true);
    expect(await isRemovedCreator(db, { name: 'Micode', channelId: 'UCmicode' })).toBe(false);
  });

  it('aucune source ne recrée sa page', async () => {
    expect(await resolveCreator(db, 'La Micro by Flo')).toBeNull();
    expect(await resolveCreator(db, 'Flo officiel', 'UCflo')).toBeNull();
    expect(await resolveCreator(db, 'Micode')).toEqual(expect.any(String));
    const credited = await creditedCreator(db, null, 'La Micro by Flo', 'Une autre chaîne', new Map());
    expect(credited?.creatorId).toBeNull();
    expect(await createCode(db, { toolSlug: 'indy', code: 'FLO10', discount: '-10 %', creatorName: 'La Micro by Flo', sourceUrl: 'https://youtube.com/watch?v=b', sourceTitle: '', creatorLink: null, status: 'pending', note: null }))
      .toEqual({ ok: false, error: REMOVED_CREATOR_ERROR });
    expect((await db.select().from(schema.creators)).map(row => row.slug)).toEqual(['micode']);
  });

  it('il sort de la liste quand il prouve sa chaîne, ou quand l’admin l’en sort', async () => {
    const [page] = await db.insert(schema.creators).values({ slug: 'flo', name: 'Flo' }).returning();
    expect(await liftRemovalForAccount(db, { creatorId: page.id, platform: 'youtube', externalId: 'UCflo' })).toBe(1);
    expect(await isRemovedCreator(db, { name: 'La Micro by Flo' })).toBe(false);

    await db.insert(schema.removedCreators).values({ name: 'Zoé', slug: 'zoe' });
    const [zoe] = await db.select().from(schema.removedCreators);
    expect(await unremoveCreator(db, zoe.id)).toBe(true);
    expect(await db.select().from(schema.removedCreators)).toHaveLength(0);
    const log = await db.select().from(schema.adminAuditLog);
    expect(log.map(entry => entry.action)).toContain('creator_unremove');
  });
});
