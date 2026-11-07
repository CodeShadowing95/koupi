import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aiConfigFrom } from './ai-extract';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { followPodcast, listPodcasts } from './podcasts-admin';
import { acceptToolSuggestion, analyzeToolSuggestion, ignoreToolSuggestion, listToolSuggestions, openToolSuggestionCount } from './tool-suggestions';

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

  it('repère un outil déjà au catalogue par son site ou son nom, actif avant archivé', async () => {
    await db.insert(schema.tools).values([
      { slug: 'planethoster', name: 'PlanetHoster', categorySlug: 'ia', website: 'https://www.planethoster.com/fr' },
      { slug: 'old-tool', name: 'Old Tool', categorySlug: 'ia', website: 'https://old.tool', archivedAt: new Date() },
    ]);
    await db.insert(schema.toolSuggestions).values([
      suggestion('PHA-10ECO', { name: 'Planethoster', domain: 'planethoster.com' }),
      suggestion('CUURE10', { name: 'cuure', domain: null }),
      suggestion('OLD10', { name: 'Old-Tool', domain: null }),
      suggestion('GDIY'),
    ]);
    const byCode = Object.fromEntries((await listToolSuggestions(db)).map(item => [item.code, item.existing]));
    expect(byCode).toEqual({
      'PHA-10ECO': { slug: 'planethoster', name: 'PlanetHoster', archived: false },
      CUURE10: { slug: 'cuure', name: 'Cuure', archived: false },
      OLD10: { slug: 'old-tool', name: 'Old Tool', archived: true },
      GDIY: null,
    });
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

  it('crée une offre sans code avec son lien depuis une suggestion par lien', async () => {
    const [row] = await db.insert(schema.toolSuggestions).values(suggestion('', { code: null, link: 'https://try.gradium.ai/ana', podcastId, creatorId })).returning();
    // Le même lien pour le même outil ne crée pas une deuxième suggestion.
    await db.insert(schema.toolSuggestions).values(suggestion('', { code: null, link: 'https://try.gradium.ai/ana' })).onConflictDoNothing();
    expect(await openToolSuggestionCount(db)).toBe(1);
    expect((await listToolSuggestions(db))[0]).toMatchObject({ code: '', link: 'https://try.gradium.ai/ana' });
    const result = await acceptToolSuggestion(db, row.id, { newTool: { name: 'Gradium', categorySlug: 'ia', website: 'https://gradium.ai', description: null, priority: 3 } });
    expect(result.ok && result.data.codeIds).toHaveLength(1);
    const [code] = await db.select().from(schema.codes);
    expect(code).toMatchObject({ code: null, creatorLink: 'https://try.gradium.ai/ana', status: 'pending', discount: '-10 %' });
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

  it('crée la catégorie demandée avec l’outil, ou reprend celle qui porte déjà ce nom', async () => {
    const [a, b] = await db.insert(schema.toolSuggestions).values([suggestion('DOIT', { name: 'Vitamix', domain: 'vitamix.fr' }), suggestion('GDIY')]).returning();
    const tool = { name: 'Vitamix', categorySlug: '', website: 'https://vitamix.fr', description: null, priority: 3 };
    expect(await acceptToolSuggestion(db, a.id, { newTool: tool, newCategory: 'Compléments alimentaires' })).toMatchObject({ ok: true });
    expect(await acceptToolSuggestion(db, b.id, { newTool: { ...tool, name: 'Gradium', website: 'https://gradium.ai' }, newCategory: 'compléments ALIMENTAIRES' })).toMatchObject({ ok: true });
    const rows = await db.select().from(schema.categories);
    expect(rows.map(row => row.name).sort()).toEqual(['Compléments alimentaires', 'IA']);
    const added = await db.select().from(schema.tools);
    expect(added.filter(row => row.categorySlug !== 'ia').map(row => row.name).sort()).toEqual(['Gradium', 'Vitamix']);
  });

  describe('analyse par l’IA', () => {
    const page = { url: 'https://gradium.ai/', title: 'Gradium', description: 'Voix par IA', text: 'Des voix de synthèse.' };
    const answer = { summary: 'Voix de synthèse par IA.', is_online_tool: true, category_slug: 'ia', new_category: '', reason: 'IA vocale.', tool_name: 'Gradium' };
    const create = vi.fn(async () => ({ model: 'claude-haiku-5-5', stop_reason: 'end_turn', usage: { input_tokens: 1000, output_tokens: 100 }, content: [{ type: 'text', text: JSON.stringify(answer) }] }));

    it('reste inactive sans clé et ne lit pas le site', async () => {
      const [row] = await db.insert(schema.toolSuggestions).values(suggestion('GDIY')).returning();
      const readSite = vi.fn();
      expect(await analyzeToolSuggestion(db, row.id, { ai: { config: aiConfigFrom({}), create: null }, readSite })).toEqual({ ok: false, error: 'L’IA n’est pas encore activée.' });
      expect(readSite).not.toHaveBeenCalled();
    });

    it('garde l’analyse et son coût, compté dans le plafond', async () => {
      const [row] = await db.insert(schema.toolSuggestions).values(suggestion('GDIY')).returning();
      const readSite = vi.fn(async () => ({ ok: true as const, page }));
      const deps = { ai: { config: aiConfigFrom({ ANTHROPIC_API_KEY: 'k' }), create: create as never }, readSite };
      const result = await analyzeToolSuggestion(db, row.id, deps);
      expect(result).toMatchObject({ ok: true, data: { categorySlug: 'ia', summary: 'Voix de synthèse par IA.' } });
      expect(readSite).toHaveBeenCalledWith('gradium.ai');
      await analyzeToolSuggestion(db, row.id, deps, { website: 'https://www.gradium.ai/fr' });
      expect(readSite).toHaveBeenLastCalledWith('https://www.gradium.ai/fr');
      const [list] = await listToolSuggestions(db);
      expect(list.analysis).toMatchObject({ toolName: 'Gradium' });
      const [stored] = await db.select().from(schema.toolSuggestions);
      expect(stored.analysisCostUsdMicros).toBe(300);
    });

    it('lit la description collée par l’admin quand le site refuse les robots', async () => {
      const [row] = await db.insert(schema.toolSuggestions).values(suggestion('GDIY')).returning();
      const readSite = vi.fn(async () => ({ ok: false as const, error: 'Le site gradium.ai a répondu 403.' }));
      create.mockClear();
      const deps = { ai: { config: aiConfigFrom({ ANTHROPIC_API_KEY: 'k' }), create: create as never }, readSite };
      expect(await analyzeToolSuggestion(db, row.id, deps, { description: 'Voix IA' })).toEqual({ ok: false, error: expect.stringContaining('trop courte') });
      const result = await analyzeToolSuggestion(db, row.id, deps, { description: '  Gradium crée des voix de synthèse réalistes\npour les vidéos et les podcasts.  ' });
      expect(result).toMatchObject({ ok: true, data: { categorySlug: 'ia', url: 'gradium.ai' } });
      expect(readSite).not.toHaveBeenCalled();
      const prompt = (create.mock.calls[0] as unknown as [{ messages: { content: string }[] }])[0].messages[0].content;
      expect(prompt).toContain('Description copiée par l’administrateur');
      expect(prompt).toContain('Gradium crée des voix de synthèse réalistes pour les vidéos et les podcasts.');
    });

    it('refuse au-delà du plafond et rend l’erreur de lecture du site', async () => {
      const [row] = await db.insert(schema.toolSuggestions).values(suggestion('GDIY')).returning();
      const config = { ...aiConfigFrom({ ANTHROPIC_API_KEY: 'k' }), monthlyBudgetUsdMicros: 0 };
      expect(await analyzeToolSuggestion(db, row.id, { ai: { config, create: create as never } })).toEqual({ ok: false, error: 'Le plafond de l’IA est atteint pour ce mois.' });
      const readSite = vi.fn(async () => ({ ok: false as const, error: 'Le site gradium.ai ne répond pas.' }));
      expect(await analyzeToolSuggestion(db, row.id, { ai: { config: aiConfigFrom({ ANTHROPIC_API_KEY: 'k' }), create: create as never }, readSite })).toEqual({ ok: false, error: expect.stringContaining('Le site gradium.ai ne répond pas. Copie ce que fait l’outil') });
    });
  });
});
