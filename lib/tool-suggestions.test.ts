import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { followPodcast, listPodcasts } from './podcasts-admin';
import { acceptToolSuggestion, ignoreToolSuggestion, listToolSuggestions, openToolSuggestionCount } from './tool-suggestions';

const suggestion = (code: string, extra: Partial<typeof schema.toolSuggestions.$inferInsert> = {}) => ({
  name: 'Gradium', domain: 'gradium.ai', code, discount: '-10 %', evidence: `code ${code}`,
  sourceUrl: 'https://podcasts.apple.com/podcast/id42?i=1', sourceTitle: 'Épisode 1', ...extra,
});

describe('tool suggestions', () => {
  let db: Db;
  let podcastId: string;
  let creatorId: string;
  beforeEach(async () => {
    db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    await db.insert(schema.categories).values({ slug: 'ia', name: 'IA' });
    await db.insert(schema.tools).values({ slug: 'cuure', name: 'Cuure', categorySlug: 'ia', website: 'https://cuure.com' });
    await followPodcast(db, { id: 42, title: 'GDIY', author: '', feedUrl: '', link: '', image: '', episodeCount: 1, genre: '' });
    const [podcast] = await listPodcasts(db);
    podcastId = podcast.id;
    creatorId = podcast.creatorId!;
  });

  it('liste les suggestions ouvertes avec le podcast et le créateur', async () => {
    await db.insert(schema.toolSuggestions).values([suggestion('GDIY', { podcastId, creatorId }), suggestion('OLD', { status: 'ignored' })]);
    const list = await listToolSuggestions(db);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ name: 'Gradium', code: 'GDIY', podcastTitle: 'GDIY', creatorName: 'GDIY' });
    expect(await openToolSuggestionCount(db)).toBe(1);
  });

  it('ajoute le nouvel outil et met en attente les codes de toutes ses suggestions', async () => {
    const [first] = await db.insert(schema.toolSuggestions).values([
      suggestion('GDIY', { podcastId, creatorId }), suggestion('MATTHIEU', { podcastId, creatorId }), suggestion('AUTRE', { name: 'Other', domain: 'other.io' }),
    ]).returning();
    const result = await acceptToolSuggestion(db, first.id, { newTool: { name: 'Gradium', categorySlug: 'ia', website: 'https://gradium.ai', description: null, priority: 3 } });
    expect(result.ok && result.data.codeIds).toHaveLength(2);
    const codes = await db.select().from(schema.codes);
    expect(codes.map(code => code.code).sort()).toEqual(['GDIY', 'MATTHIEU']);
    expect(codes.every(code => code.status === 'pending' && code.creatorId === creatorId)).toBe(true);
    expect(await openToolSuggestionCount(db)).toBe(1);
    const [added] = (await db.select().from(schema.toolSuggestions)).filter(row => row.id === first.id);
    expect(added).toMatchObject({ status: 'added', codeId: expect.any(String), toolId: expect.any(String) });
  });

  it('relie une suggestion à un outil déjà au catalogue sans recréer un code connu', async () => {
    const [tool] = await db.select().from(schema.tools);
    await db.insert(schema.codes).values({ toolId: tool.id, creatorId, code: 'DOIT', discount: '-15 %', sourceUrl: 'https://example.com', status: 'pending' });
    const [row] = await db.insert(schema.toolSuggestions).values(suggestion('DOIT', { name: 'Cuure', domain: 'cuure.fr', podcastId, creatorId })).returning();
    const result = await acceptToolSuggestion(db, row.id, { toolSlug: 'cuure' });
    expect(result).toEqual({ ok: true, data: { toolId: tool.id, codeIds: [] } });
    expect(await db.select().from(schema.codes)).toHaveLength(1);
    expect(await acceptToolSuggestion(db, row.id, { toolSlug: 'cuure' })).toMatchObject({ ok: false });
  });

  it('refuse un outil inconnu et ignore une suggestion une seule fois', async () => {
    const [row] = await db.insert(schema.toolSuggestions).values(suggestion('GDIY')).returning();
    expect(await acceptToolSuggestion(db, row.id, { toolSlug: 'nope' })).toEqual({ ok: false, error: 'Outil introuvable.' });
    expect(await ignoreToolSuggestion(db, row.id)).toBe(true);
    expect(await ignoreToolSuggestion(db, row.id)).toBe(false);
    expect(await listToolSuggestions(db)).toEqual([]);
  });
});
