import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { loadCreatorAccount } from './creator-auth';
import { parseOwnName, startOwnPage, takenBy } from './creator-start';

describe('nom de créateur', () => {
  it('resserre les espaces et refuse trop court, trop long ou sans lettre', () => {
    expect(parseOwnName('  Vasto   Lorde ')).toEqual({ ok: true, data: { name: 'Vasto Lorde', slug: 'vasto-lorde' } });
    expect(parseOwnName('a').ok).toBe(false);
    expect(parseOwnName('x'.repeat(61)).ok).toBe(false);
    expect(parseOwnName('!!!').ok).toBe(false);
    expect(parseOwnName(42).ok).toBe(false);
  });
  it('repère une page existante par son nom, son adresse ou un @', () => {
    const pages = [{ slug: 'nchang', name: 'Nchang', codes: 0, accounts: [{ platform: 'tiktok' as const, handle: '@nchang.belinga' }] }];
    expect(takenBy(pages, 'NCHANG', 'nchang')?.slug).toBe('nchang');
    expect(takenBy(pages, 'Nchang Belinga', 'nchang-belinga')?.slug).toBe('nchang');
    expect(takenBy(pages, 'Nchang B', 'nchang-b')).toBeNull();
  });
});

describe('ouvrir son studio sans revendiquer', () => {
  let db: Db;
  let userId: string;
  beforeEach(async () => {
    db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    [{ id: userId }] = await db.insert(schema.creatorUsers).values({ email: 'vasto@exemple.fr' }).returning();
    await db.insert(schema.creators).values({ slug: 'mrbeast', name: 'MrBeast' });
  });

  it('crée la page et relie le compte', async () => {
    const now = new Date('2026-11-08T15:00:00Z');
    expect(await startOwnPage(db, { id: userId, creator: null }, 'Vastolorde', now)).toEqual({ ok: true, data: { slug: 'vastolorde', name: 'Vastolorde' } });
    const account = await loadCreatorAccount(db, userId);
    expect(account?.creator).toMatchObject({ slug: 'vastolorde', name: 'Vastolorde' });
    const [user] = await db.select().from(schema.creatorUsers);
    expect(user.accessGrantedAt).toEqual(now);
  });
  it('refuse le nom d’une page existante et propose de la revendiquer', async () => {
    const result = await startOwnPage(db, { id: userId, creator: null }, 'Mr Beast');
    expect(result).toMatchObject({ ok: false, match: { slug: 'mrbeast', name: 'MrBeast' } });
    expect(await db.select().from(schema.creators)).toHaveLength(1);
  });
  it('refuse un second studio', async () => {
    expect(await startOwnPage(db, { id: userId, creator: { id: 'x' } }, 'Autre nom')).toMatchObject({ ok: false });
  });
});
