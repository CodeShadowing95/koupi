import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { loadCatalog } from './catalog-db';
import { importCatalog } from './catalog-import';
import { buildCatalog } from '../scripts/build-catalog.mjs';

const input = {
  toolsCsv: readFileSync('data/outils-v0.csv', 'utf8'),
  candidatesCsv: readFileSync('data/candidats-tous.csv', 'utf8'),
  manual: JSON.parse(readFileSync('data/catalogue-manuel.json', 'utf8')),
};
const files = buildCatalog(input);

async function freshDb() {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: 'db/migrations' });
  return db as unknown as Db;
}

describe('catalogue en base', () => {
  let db: Db;
  beforeEach(async () => { db = await freshDb(); });

  it('importe data/ et relit le même catalogue que les fichiers', async () => {
    const result = await importCatalog(db, input);
    expect(result).toMatchObject({ categories: files.categories.length, tools: files.tracked, codes: files.codes.length });
    expect(result.creators).toBe(new Set(files.codes.map(code => code.creator)).size);
    const catalog = await loadCatalog(db);
    expect(catalog.tracked).toBe(files.tracked);
    expect(catalog.categories).toEqual(files.categories);
    expect(catalog.tools).toEqual(files.tools);
    expect(catalog.codes.map(code => [code.tool, code.code, code.status, code.creator, code.discount])).toEqual(
      files.codes.map(code => [code.tool, code.code, code.status, code.creator, code.discount]));
    // Les votes sont repris en « ça marche » / « ça ne marche pas » : le taux reste le même, à l'arrondi près.
    for (const [i, code] of catalog.codes.entries()) {
      expect(code.votes).toBe(files.codes[i].votes);
      expect(Math.abs(code.success - files.codes[i].success)).toBeLessThanOrEqual(code.votes ? Math.ceil(100 / code.votes) : 0);
    }
  });

  it('ne remplace jamais ce que l’admin a modifié, et ne recrée pas un code archivé', async () => {
    await importCatalog(db, input);
    const [first, second] = await db.select().from(schema.codes).limit(2);
    await db.update(schema.codes).set({ discount: '-50 % (corrigé)' }).where(eq(schema.codes.id, first.id));
    await db.update(schema.codes).set({ archivedAt: new Date() }).where(eq(schema.codes.id, second.id));

    expect(await importCatalog(db, input)).toEqual({ categories: 0, tools: 0, creators: 0, codes: 0 });
    const catalog = await loadCatalog(db);
    expect(catalog.codes.find(code => code.id === first.id)?.discount).toBe('-50 % (corrigé)');
    expect(catalog.codes.some(code => code.id === second.id)).toBe(false);
    expect(catalog.codes).toHaveLength(files.codes.length - 1);
  });

  it('ne publie un outil que s’il a un code visible', async () => {
    await importCatalog(db, input);
    const catalog = await loadCatalog(db);
    for (const tool of catalog.tools) expect(catalog.codes.some(code => code.toolSlug === tool.slug && (code.status === 'verified' || code.status === 'to_test'))).toBe(true);
  });
});
