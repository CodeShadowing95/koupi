import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { readableError, readableRunError } from './db-error';
import { addPendingCode } from './podcast-read';

describe('readableError', () => {
  it('dit quelle règle de la base a été refusée, sans la requête', async () => {
    const db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    await db.insert(schema.categories).values({ slug: 'vpn', name: 'VPN' });
    const [tool] = await db.insert(schema.tools).values({ slug: 'nordvpn', name: 'NordVPN', categorySlug: 'vpn', website: 'https://nordvpn.com' }).returning();
    const [creator] = await db.insert(schema.creators).values({ slug: 'ana', name: 'Ana' }).returning();
    const error = await db.insert(schema.codes).values({ toolId: tool.id, creatorId: creator.id, code: 'ANA10', discount: '  ', sourceUrl: 'https://youtu.be/x' }).then(() => null, (failure: unknown) => failure);
    expect(String((error as Error).message)).toContain('Failed query');
    const text = readableError(error);
    expect(text).toContain('réduction');
    expect(text).not.toContain('insert into');
    expect(text).not.toContain(tool.id);
  });
  it('cache la requête quand la cause est inconnue', () => {
    const error = new Error('Failed query: insert into "codes" ("id") values ($1) params: abc', { cause: new Error('fetch failed') });
    expect(readableError(error)).toBe('La base de données ne répond pas. Réessaie dans un moment.');
    expect(readableError(new Error('Failed query: select 1 params: '))).toContain('journaux Vercel');
    expect(readableError(new Error('YouTube 403'))).toBe('YouTube 403');
  });
  it('nettoie les erreurs déjà notées au journal', () => {
    expect(readableRunError('Failed query: insert into "codes" ("id") values (default) returning "id" params: e492f317')).toContain('journaux Vercel');
    expect(readableRunError('Pas de réponse pour : VPN')).toBe('Pas de réponse pour : VPN');
    expect(readableRunError(null)).toBeNull();
  });
});

describe('addPendingCode', () => {
  it('ignore un code mal lu au lieu de faire échouer le passage', async () => {
    const db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    await db.insert(schema.categories).values({ slug: 'vpn', name: 'VPN' });
    const [tool] = await db.insert(schema.tools).values({ slug: 'nordvpn', name: 'NordVPN', categorySlug: 'vpn', website: 'https://nordvpn.com' }).returning();
    const [creator] = await db.insert(schema.creators).values({ slug: 'ana', name: 'Ana' }).returning();
    const base = { toolId: tool.id, creatorId: creator.id, sourceUrl: 'https://www.youtube.com/watch?v=x', sourceTitle: 'Vidéo', note: 'Trouvé', origin: 'youtube_search' as const };
    expect(await addPendingCode(db, { ...base, code: 'X'.repeat(121), discount: '-10 %' }, 'test')).toBeNull();
    expect(await addPendingCode(db, { ...base, code: '   ', discount: '-10 %' }, 'test')).toBeNull();
    const id = await addPendingCode(db, { ...base, code: ' ANA10 ', discount: '   ' }, 'test');
    expect(id).toEqual(expect.any(String));
    const [row] = await db.select().from(schema.codes);
    expect(row).toMatchObject({ code: 'ANA10', discount: 'Voir la source', origin: 'youtube_search' });
  });
});
