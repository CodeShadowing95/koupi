import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { DISABLED, consumeSignInToken, createSignInLink, loadCreatorAccount } from './creator-auth';
import { applyCreatorUserAction, listCreatorUsers, maskEmail, parseCreatorUserAction } from './creator-users-admin';
import { listAuditLog } from './site-settings';

const now = new Date('2026-11-03T12:00:00Z');
const later = new Date('2026-11-03T12:05:00Z');
const TOKEN = 'T'.repeat(43);
const context = { ipHash: 'ip', appUrl: 'https://koupi.test', now, newToken: () => TOKEN };

describe('validation', () => {
  it('accepte seulement un id et une action connue', () => {
    const id = '0f8fad5b-d9cb-469f-a165-70867728950e';
    expect(parseCreatorUserAction({ id, action: 'disable' })).toEqual({ ok: true, data: { id, action: 'disable' } });
    expect(parseCreatorUserAction({ id: 'x', action: 'disable' })).toEqual({ ok: false, error: 'Compte inconnu.' });
    expect(parseCreatorUserAction({ id, action: 'drop' })).toEqual({ ok: false, error: 'Action inconnue.' });
  });
  it('masque un e-mail', () => {
    expect(maskEmail('ana@exemple.fr')).toBe('a•••@exemple.fr');
    expect(maskEmail('bad')).toBe('•••');
  });
});

describe('comptes créateurs', () => {
  let db: Db;
  let ana: string;
  let userId: string;

  beforeEach(async () => {
    db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    [{ id: ana }] = await db.insert(schema.creators).values({ slug: 'ana', name: 'Ana' }).returning();
    [{ id: userId }] = await db.insert(schema.creatorUsers)
      .values({ email: 'ana@exemple.fr', creatorId: ana, accessGrantedAt: now, lastSignInAt: now, createdAt: now }).returning();
  });

  it('liste les comptes avec leur page', async () => {
    expect(await listCreatorUsers(db)).toEqual([{
      id: userId, email: 'ana@exemple.fr', creator: { slug: 'ana', name: 'Ana' },
      lastSignInAt: now.toISOString(), disabledAt: null, createdAt: now.toISOString(),
    }]);
  });

  it('désactive : connexion refusée, session coupée, liens envoyés effacés ; puis réactive', async () => {
    await createSignInLink(db, { email: 'ana@exemple.fr', slug: null }, context);
    expect(await applyCreatorUserAction(db, userId, 'disable', now)).toEqual({ ok: true, data: { action: 'disable' } });
    expect(await loadCreatorAccount(db, userId)).toBeNull();
    expect(await db.select().from(schema.creatorSignInTokens)).toHaveLength(0);

    await createSignInLink(db, { email: 'ana@exemple.fr', slug: null }, context);
    expect(await consumeSignInToken(db, TOKEN, later)).toEqual({ ok: false, error: DISABLED });
    expect(await applyCreatorUserAction(db, userId, 'disable')).toEqual({ ok: false, error: expect.stringContaining('déjà') });

    expect(await applyCreatorUserAction(db, userId, 'enable')).toMatchObject({ ok: true });
    expect(await loadCreatorAccount(db, userId)).toMatchObject({ email: 'ana@exemple.fr', creator: { slug: 'ana' } });
    expect((await listAuditLog(db)).map(entry => entry.action).sort()).toEqual(['creator_disabled', 'creator_enabled']);
  });

  it('retire l’accès à la page en gardant le compte', async () => {
    expect(await applyCreatorUserAction(db, userId, 'remove-access')).toMatchObject({ ok: true });
    expect(await loadCreatorAccount(db, userId)).toMatchObject({ email: 'ana@exemple.fr', creator: null });
    expect(await applyCreatorUserAction(db, userId, 'remove-access')).toEqual({ ok: false, error: expect.stringContaining('aucune page') });
    expect((await listAuditLog(db))[0]).toMatchObject({ action: 'creator_access_removed', target: 'ana@exemple.fr · Ana' });
  });

  it('supprime : efface l’e-mail partout, garde la page publique', async () => {
    await createSignInLink(db, { email: 'ana@exemple.fr', slug: 'ana' }, context);
    await db.insert(schema.creatorRequests).values({ creatorId: ana, kind: 'report', email: 'ana@exemple.fr', message: 'Code mort', ipHash: 'ip' });
    await applyCreatorUserAction(db, userId, 'disable', now);
    await applyCreatorUserAction(db, userId, 'enable', now);
    await applyCreatorUserAction(db, userId, 'remove-access', now);

    expect(await applyCreatorUserAction(db, userId, 'delete', later)).toMatchObject({ ok: true });
    expect(await db.select().from(schema.creatorUsers)).toHaveLength(0);
    expect(await db.select().from(schema.creatorSignInTokens)).toHaveLength(0);
    const requests = await db.select().from(schema.creatorRequests);
    expect(requests).toEqual([expect.objectContaining({ kind: 'report', email: null })]);
    expect(await db.select().from(schema.creators)).toHaveLength(1);
    const journal = await listAuditLog(db);
    expect(JSON.stringify(journal)).not.toContain('ana@exemple.fr');
    expect(journal.map(entry => entry.target)).toEqual(expect.arrayContaining(['a•••@exemple.fr', 'a•••@exemple.fr · Ana']));
    expect(await applyCreatorUserAction(db, userId, 'delete')).toEqual({ ok: false, error: 'Ce compte n’existe plus.' });
  });
});
