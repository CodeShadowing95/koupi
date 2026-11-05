// La migration 0024 donne une origine aux codes déjà en base : on rejoue ses mises à jour sur des codes « unknown ».
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';

const file = readFileSync('db/migrations/0024_happy_carmella_unuscione.sql', 'utf8');
const backfill = file.split('--> statement-breakpoint').map(part => part.replace(/^\s*--.*$/gm, '').trim()).filter(part => part.startsWith('UPDATE'));

describe('migration 0024 : origine des codes existants', () => {
  it('déduit l’origine de l’import, de la proposition, des suggestions et du journal', async () => {
    const db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    await db.insert(schema.categories).values({ slug: 'vpn', name: 'VPN' });
    const [tool] = await db.insert(schema.tools).values({ slug: 'nord', name: 'Nord', categorySlug: 'vpn', website: 'https://nord.com' }).returning();
    const [creator] = await db.insert(schema.creators).values({ slug: 'ana', name: 'Ana' }).returning();
    const [submission] = await db.insert(schema.submissions).values({ toolName: 'Nord', creatorName: 'Ana', code: 'SUB', discountLabel: '-10 %', sourceUrl: 'https://youtu.be/s', ipHash: 'x', fingerprint: 'f' }).returning();
    const code = (name: string, extra: Partial<typeof schema.codes.$inferInsert> = {}) => ({ toolId: tool.id, creatorId: creator.id, code: name, discount: '-10 %', sourceUrl: 'https://youtu.be/1', ...extra });
    const rows = await db.insert(schema.codes).values([
      code('IMP', { importKey: 'k1' }), code('SUB', { submissionId: submission.id }), code('SUGYT'), code('POD'), code('YT'), code('MAN'), code('NOLOG'),
    ]).returning({ id: schema.codes.id, code: schema.codes.code });
    const id = (name: string) => rows.find(row => row.code === name)!.id;
    await db.insert(schema.toolSuggestions).values({ name: 'Nord', code: 'SUGYT', discount: '-10 %', evidence: 'x', sourceUrl: 'https://www.youtube.com/watch?v=2', sourceTitle: '', codeId: id('SUGYT'), status: 'added' });
    await db.insert(schema.codeLogs).values([
      { codeId: id('POD'), action: 'create', nextStatus: 'pending', note: 'Lecture du podcast GDIY' },
      { codeId: id('YT'), action: 'create', nextStatus: 'pending', note: 'Recherche ciblée VPN : Nord' },
      { codeId: id('MAN'), action: 'create', nextStatus: 'to_test' },
    ]);
    for (const statement of backfill) await db.execute(sql.raw(statement));
    const after = await db.select({ code: schema.codes.code, origin: schema.codes.origin }).from(schema.codes);
    expect(Object.fromEntries(after.map(row => [row.code, row.origin]))).toEqual({
      IMP: 'import', SUB: 'submission', SUGYT: 'youtube_search', POD: 'podcast', YT: 'youtube_search', MAN: 'manual', NOLOG: 'unknown',
    });
  });
});
