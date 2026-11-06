import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { accountLevelOf, bestLevel, creatorLevelFor, creatorLevelFromAccounts } from './creator-level';

const base = { claimStatus: 'none' as const, platformVerified: false, adminCheckedAt: null, subscribers: null };
const checkedAt = new Date('2026-11-02T10:00:00Z');

describe('niveau d’un compte', () => {
  it('reste repéré sans contrôle', () => {
    expect(accountLevelOf({ ...base, subscribers: 50_000 })).toBe('spotted');
  });
  it('passe contrôlé avec le contrôle de l’admin et au moins 1000 abonnés', () => {
    expect(accountLevelOf({ ...base, adminCheckedAt: checkedAt, subscribers: 1000 })).toBe('checked');
    expect(accountLevelOf({ ...base, adminCheckedAt: checkedAt, subscribers: null, metrics: { rating: 4.5, ratingCount: 50 } })).toBe('checked');
    expect(accountLevelOf({ ...base, adminCheckedAt: checkedAt, subscribers: null, metrics: { rating: 4.5, ratingCount: 12 } })).toBe('spotted');
    expect(accountLevelOf({ ...base, adminCheckedAt: checkedAt, subscribers: 999 })).toBe('spotted');
  });
  it('passe contrôlé avec le badge certifié du réseau', () => {
    expect(accountLevelOf({ ...base, platformVerified: true })).toBe('checked');
  });
  it('passe vérifié quand le créateur a prouvé que le compte est à lui', () => {
    expect(accountLevelOf({ ...base, claimStatus: 'verified', adminCheckedAt: checkedAt, subscribers: 1000 })).toBe('verified');
    expect(accountLevelOf({ ...base, claimStatus: 'revoked', adminCheckedAt: checkedAt, subscribers: 1000 })).toBe('checked');
  });
  it('reste repéré quand la preuve porte sur un compte sous le seuil', () => {
    expect(accountLevelOf({ ...base, claimStatus: 'verified' })).toBe('spotted');
    expect(accountLevelOf({ ...base, claimStatus: 'verified', adminCheckedAt: checkedAt, subscribers: 200 })).toBe('spotted');
  });
});

describe('niveau d’un créateur', () => {
  it('garde le meilleur compte', () => {
    expect(creatorLevelFromAccounts([])).toBe('spotted');
    expect(creatorLevelFromAccounts([base, { ...base, platformVerified: true }])).toBe('checked');
  });
  it('bestLevel prend le plus haut niveau', () => {
    expect(bestLevel([])).toBe('spotted');
    expect(bestLevel(['checked', 'verified', 'spotted'])).toBe('verified');
  });
  it('ne mélange pas les comptes : le seuil vaut pour le compte contrôlé', () => {
    expect(creatorLevelFromAccounts([{ ...base, adminCheckedAt: checkedAt, subscribers: 200 }, { ...base, subscribers: 90_000 }])).toBe('spotted');
  });

  it('lit les comptes en base', async () => {
    const db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    const [creator] = await db.insert(schema.creators).values({ slug: 'ana', name: 'Ana' }).returning();
    expect(await creatorLevelFor(db, creator.id)).toBe('spotted');
    await db.insert(schema.creatorAccounts).values({
      creatorId: creator.id, platform: 'youtube', externalId: 'UC123', handle: '@ana', url: 'https://youtube.com/@ana',
      subscribers: 12_000, adminCheckedAt: checkedAt,
    });
    expect(await creatorLevelFor(db, creator.id)).toBe('checked');
  });

  it('refuse un même compte pour deux créateurs', async () => {
    const db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    const [a, b] = await db.insert(schema.creators).values([{ slug: 'ana', name: 'Ana' }, { slug: 'bob', name: 'Bob' }]).returning();
    const account = { platform: 'youtube' as const, externalId: 'UC123', handle: '@ana', url: 'https://youtube.com/@ana' };
    await db.insert(schema.creatorAccounts).values({ ...account, creatorId: a.id });
    await expect(db.insert(schema.creatorAccounts).values({ ...account, creatorId: b.id })).rejects.toThrow();
    await expect(db.insert(schema.creatorAccounts).values({ ...account, externalId: 'UC999', handle: '@ANA', creatorId: b.id })).rejects.toThrow();
  });
});
