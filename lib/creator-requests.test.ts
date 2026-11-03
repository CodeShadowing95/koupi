import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { countOpenCreatorRequests, createCreatorRequest, listCreatorRequests, parseCreatorRequest, updateCreatorRequest } from './creator-requests';

describe('parseCreatorRequest', () => {
  it('exige e-mail et lien pour une revendication, un message pour un signalement', () => {
    expect(parseCreatorRequest({ kind: 'claim', slug: 'ana', email: ' a@b.fr ', accountUrl: 'https://tiktok.com/@ana' }))
      .toEqual({ ok: true, data: { kind: 'claim', slug: 'ana', email: 'a@b.fr', accountUrl: 'https://tiktok.com/@ana', message: null } });
    expect(parseCreatorRequest({ kind: 'claim', slug: 'ana', email: 'a@b.fr' })).toMatchObject({ ok: false });
    expect(parseCreatorRequest({ kind: 'claim', slug: 'ana', email: 'pas-un-email', accountUrl: 'x.com/ana' })).toMatchObject({ ok: false });
    expect(parseCreatorRequest({ kind: 'claim', slug: 'ana', email: 'a@b.fr', accountUrl: 'javascript:alert(1)' })).toMatchObject({ ok: false });
    expect(parseCreatorRequest({ kind: 'report', slug: 'ana', message: '  ' })).toMatchObject({ ok: false });
    expect(parseCreatorRequest({ kind: 'report', slug: 'ana', message: 'Mauvais nom' })).toMatchObject({ ok: true, data: { email: null, accountUrl: null } });
    expect(parseCreatorRequest({ kind: 'report', slug: '../admin', message: 'x' })).toMatchObject({ ok: false });
  });
});

describe('demandes en base', () => {
  it('liste, compte et traite les demandes', async () => {
    const db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    await db.insert(schema.creators).values({ slug: 'ana', name: 'Ana' });
    const created = await createCreatorRequest(db, { slug: 'ana', kind: 'report', email: null, accountUrl: null, message: 'Mauvais lien' }, 'hash');
    expect(created.ok).toBe(true);
    expect(await createCreatorRequest(db, { slug: 'bob', kind: 'report', email: null, accountUrl: null, message: 'x' }, 'hash')).toMatchObject({ ok: false });
    expect(await countOpenCreatorRequests(db)).toBe(1);
    const [request] = await listCreatorRequests(db);
    expect(request).toMatchObject({ kind: 'report', status: 'new', creator: { slug: 'ana', name: 'Ana' }, handledAt: null });
    expect(request).not.toHaveProperty('ipHash');

    const now = new Date('2026-11-03T10:00:00Z');
    expect(await updateCreatorRequest(db, request.id, { status: 'done', adminNote: ' Lien corrigé ' }, now)).toMatchObject({ ok: true });
    expect((await listCreatorRequests(db))[0]).toMatchObject({ status: 'done', adminNote: 'Lien corrigé', handledAt: now.toISOString() });
    expect(await countOpenCreatorRequests(db)).toBe(0);
    expect(await updateCreatorRequest(db, request.id, { status: 'new' })).toMatchObject({ ok: true });
    expect((await listCreatorRequests(db))[0]).toMatchObject({ status: 'new', adminNote: 'Lien corrigé', handledAt: null });
    expect(await updateCreatorRequest(db, request.id, { status: 'supprimé' })).toMatchObject({ ok: false });
    expect(await updateCreatorRequest(db, '00000000-0000-4000-8000-000000000000', { status: 'done' })).toEqual({ ok: false, error: 'Demande introuvable.' });
  });

  it('refuse en base une revendication sans contact', async () => {
    const db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    const [ana] = await db.insert(schema.creators).values({ slug: 'ana', name: 'Ana' }).returning();
    await expect(db.insert(schema.creatorRequests).values({ creatorId: ana.id, kind: 'claim', ipHash: 'h' })).rejects.toThrow();
  });
});
