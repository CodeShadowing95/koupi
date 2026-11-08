import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { creditedCreator, creatorFinder, sameCreator, type CreatorFinder, type CreditedCreator } from './compilation-creator';
import { compilationNote, isCompilationNote } from './compilation-note';

describe('sameCreator', () => {
  it('reconnaît la chaîne elle-même, avec ou sans accents ni titre', () => {
    expect(sameCreator('Backed', 'Backed')).toBe(true);
    expect(sameCreator('Nozman', 'Dr Nozman')).toBe(true);
    expect(sameCreator('Astronogéek', 'ASTRONOGEEK')).toBe(true);
    expect(sameCreator('Baptiste Pitois', 'Backed')).toBe(false);
    expect(sameCreator('Dr', 'Dr Nozman')).toBe(false);
  });
});

describe('compilationNote', () => {
  it('se reconnaît à son début', () => {
    const note = compilationNote('Backed', 'Dr Nozman', 'Saily — code NOZMAN (Dr Nozman)');
    expect(note).toContain('Backed');
    expect(isCompilationNote(note)).toBe(true);
    expect(isCompilationNote('Trouvé par la recherche « x »')).toBe(false);
    expect(isCompilationNote(null)).toBe(false);
  });
});

describe('creatorFinder', () => {
  it('cherche des chaînes par nom', async () => {
    const fetchFn = vi.fn(async (_url: string) => new Response(JSON.stringify({ items: [{ id: { channelId: 'UC1' }, snippet: { channelTitle: 'Dr Nozman' } }, { id: {} }] })));
    const finder = creatorFinder('KEY', fetchFn as unknown as typeof fetch)!;
    expect(await finder.searchChannels('Dr Nozman')).toEqual([{ id: 'UC1', title: 'Dr Nozman' }]);
    expect(Object.fromEntries(new URL(fetchFn.mock.calls[0][0]).searchParams)).toMatchObject({ type: 'channel', q: 'Dr Nozman' });
    expect(creatorFinder(undefined)).toBeNull();
  });
});

describe('creditedCreator', () => {
  let db: Db;
  let cache: Map<string, CreditedCreator>;
  beforeEach(async () => {
    db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    cache = new Map();
  });
  const finder = (channels: { id: string; title: string }[]): CreatorFinder => ({
    searchChannels: vi.fn(async () => channels),
    channels: vi.fn(async (ids: string[]) => new Map(ids.map(id => [id, { id, handle: '@drnozman', url: 'https://www.youtube.com/@drnozman', subscribers: 4_000_000 }]))),
  });

  it('ne crédite personne d’autre sans nom, ou quand le nom est celui de la chaîne', async () => {
    const youtube = finder([]);
    expect(await creditedCreator(db, youtube, '', 'Backed', cache)).toBeNull();
    expect(await creditedCreator(db, youtube, 'Backed', 'Backed', cache)).toBeNull();
    expect(youtube.searchChannels).not.toHaveBeenCalled();
  });

  it('reprend un créateur déjà en base sans rien chercher', async () => {
    const [known] = await db.insert(schema.creators).values({ slug: 'astronogeek', name: 'Astronogeek' }).returning();
    const youtube = finder([]);
    expect(await creditedCreator(db, youtube, 'Astronogeek', 'Backed', cache)).toEqual({ creatorId: known.id, name: 'Astronogeek', units: 0 });
    expect(youtube.searchChannels).not.toHaveBeenCalled();
  });

  it('trouve la chaîne du créateur, le crée sous le nom de sa chaîne et la relie, une seule fois par nom', async () => {
    const youtube = finder([{ id: 'UC-other', title: 'Les codes de Nozman ?' }, { id: 'UC-noz', title: 'Dr Nozman' }]);
    const first = await creditedCreator(db, youtube, 'Nozman', 'Backed', cache);
    expect(first).toMatchObject({ name: 'Dr Nozman', units: 101 });
    const [account] = await db.select().from(schema.creatorAccounts);
    expect(account).toMatchObject({ creatorId: first!.creatorId, platform: 'youtube', externalId: 'UC-noz', handle: '@drnozman' });
    expect(await creditedCreator(db, youtube, 'Nozman', 'Backed', cache)).toMatchObject({ creatorId: first!.creatorId, units: 0 });
    expect(youtube.searchChannels).toHaveBeenCalledTimes(1);
  });

  it('reprend le créateur qui a déjà cette chaîne, même sous un autre nom', async () => {
    const [owner] = await db.insert(schema.creators).values({ slug: 'nozman', name: 'Nozman' }).returning();
    await db.insert(schema.creatorAccounts).values({ creatorId: owner.id, platform: 'youtube', externalId: 'UC-noz', handle: '@drnozman', url: 'https://www.youtube.com/@drnozman' });
    expect(await creditedCreator(db, finder([{ id: 'UC-noz', title: 'Dr Nozman' }]), 'Dr Nozman', 'Backed', cache)).toMatchObject({ creatorId: owner.id, name: 'Nozman' });
  });

  it('sans chaîne qui porte ce nom, crée le créateur par son nom, sans chaîne', async () => {
    const credited = await creditedCreator(db, finder([{ id: 'UC-x', title: 'Autre chose' }]), 'Baptiste Pitois', 'Backed', cache);
    expect(credited).toMatchObject({ name: 'Baptiste Pitois', units: 100 });
    expect(await db.select().from(schema.creatorAccounts)).toEqual([]);
    const [creator] = await db.select().from(schema.creators);
    expect(creator.name).toBe('Baptiste Pitois');
  });
});
