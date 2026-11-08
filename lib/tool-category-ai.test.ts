import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { aiConfigFrom } from './ai-extract';
import { suggestToolCategory } from './tool-category-ai';

const page = { url: 'https://n8n.io/', title: 'n8n', description: 'Workflow automation', text: 'Automatise tes tâches en reliant tes applications.' };
const answer = (extra: Record<string, unknown> = {}) => ({ summary: 'Automatisation de tâches entre applications.', is_online_tool: true, category_slug: 'automatisation', new_category: '', reason: 'Outil d’automatisation.', tool_name: 'n8n', ...extra });
const reply = (body: Record<string, unknown>) => vi.fn(async () => ({ model: 'claude-haiku-5-5', stop_reason: 'end_turn', usage: { input_tokens: 1000, output_tokens: 100 }, content: [{ type: 'text', text: JSON.stringify(body) }] }));

describe('suggestToolCategory', () => {
  let db: Db;
  beforeEach(async () => {
    db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    await db.insert(schema.categories).values([{ slug: 'automatisation', name: 'Automatisation' }, { slug: 'vpn', name: 'VPN' }]);
  });
  const on = (create: unknown, readSite = vi.fn(async () => ({ ok: true as const, page }))) => ({ ai: { config: aiConfigFrom({ ANTHROPIC_API_KEY: 'k' }), create: create as never }, readSite });

  it('demande le site et une IA active, sans rien lire sinon', async () => {
    const readSite = vi.fn();
    expect(await suggestToolCategory(db, { ai: { config: aiConfigFrom({}), create: null }, readSite }, { name: 'n8n', website: 'n8n.io' })).toEqual({ ok: false, error: 'L’IA n’est pas encore activée.' });
    expect(await suggestToolCategory(db, on(reply(answer())), { name: 'n8n', website: '  ' })).toEqual({ ok: false, error: 'Indique d’abord le site officiel de l’outil.' });
    expect(readSite).not.toHaveBeenCalled();
  });

  it('refuse quand le plafond du mois est atteint', async () => {
    await db.insert(schema.aiUsage).values({ purpose: 'podcast_notes', model: 'm', costUsdMicros: 999_000_000 });
    expect(await suggestToolCategory(db, on(reply(answer())), { name: 'n8n', website: 'n8n.io' })).toEqual({ ok: false, error: 'Le plafond de l’IA est atteint pour ce mois.' });
  });

  it('choisit une catégorie existante et compte le coût dans le plafond', async () => {
    const create = reply(answer());
    const result = await suggestToolCategory(db, on(create), { name: 'N8N', website: 'n8n.io' });
    expect(result).toMatchObject({ ok: true, data: { categorySlug: 'automatisation', newCategory: '', toolName: 'n8n' } });
    const prompt = (create.mock.calls[0] as unknown as [{ messages: { content: string }[] }])[0].messages[0].content;
    expect(prompt).toContain('- automatisation : Automatisation');
    const [usage] = await db.select().from(schema.aiUsage);
    expect(usage).toMatchObject({ purpose: 'tool_category', costUsdMicros: 150, ref: 'https://n8n.io/' });
  });

  it('propose une nouvelle catégorie quand aucune ne convient', async () => {
    const result = await suggestToolCategory(db, on(reply(answer({ category_slug: '', new_category: 'Compléments alimentaires' }))), { name: 'Cuure', website: 'cuure.com' });
    expect(result).toMatchObject({ ok: true, data: { categorySlug: '', newCategory: 'Compléments alimentaires' } });
  });

  it('dit de choisir à la main quand le site ne se lit pas', async () => {
    const readSite = vi.fn(async () => ({ ok: false as const, error: 'Le site n8n.io a répondu 403.' }));
    expect(await suggestToolCategory(db, on(reply(answer()), readSite as never), { name: 'n8n', website: 'n8n.io' })).toEqual({ ok: false, error: 'Le site n8n.io a répondu 403. Choisis la catégorie à la main.' });
  });
});
