import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { aiConfigFrom } from './ai-extract';
import { loadCatalog } from './catalog-db';
import { publicCatalog } from './universes';
import { cleanSortItems, listUniverses, moveToolsToUniverses, setFamilyUniverse, setUniverseVisible, sortToolsByUniverse } from './universes-admin';

const reply = (body: Record<string, unknown>) => vi.fn(async () => ({ model: 'claude-haiku-5-5', stop_reason: 'end_turn', usage: { input_tokens: 900, output_tokens: 200 }, content: [{ type: 'text', text: JSON.stringify(body) }] }));
const on = (create: unknown) => ({ ai: { config: aiConfigFrom({ ANTHROPIC_API_KEY: 'k' }), create: create as never } });

let db: Db;
let ids: Record<string, string>;
beforeEach(async () => {
  db = drizzle(new PGlite(), { schema }) as unknown as Db;
  await migrate(db as never, { migrationsFolder: 'db/migrations' });
  await db.insert(schema.categories).values([{ slug: 'vpn', name: 'VPN', familySlug: 'securite' }, { slug: 'boutiques', name: 'Boutiques en ligne', familySlug: 'sites' }]).onConflictDoNothing();
  const rows = await db.insert(schema.tools).values([
    { slug: 'nordvpn', name: 'NordVPN', categorySlug: 'vpn', website: 'https://nordvpn.com' },
    { slug: 'shein', name: 'SHEIN', categorySlug: 'boutiques', website: 'https://shein.com' },
    { slug: 'huel', name: 'Huel', categorySlug: 'boutiques', website: 'https://huel.com' },
  ]).returning({ id: schema.tools.id, slug: schema.tools.slug });
  ids = Object.fromEntries(rows.map(row => [row.slug, row.id]));
  const [creator] = await db.insert(schema.creators).values({ slug: 'ana', name: 'Ana' }).returning({ id: schema.creators.id });
  await db.insert(schema.codes).values([ids.nordvpn, ids.shein].map(toolId => ({ toolId, creatorId: creator.id, code: 'ANA', discount: '-10 %', status: 'verified' as const, sourceUrl: 'https://youtube.com/watch?v=1' })));
});

describe('univers de départ', () => {
  it('seuls les outils en ligne sont visibles, et toutes les familles y sont', async () => {
    const list = await listUniverses(db);
    expect(list.map(item => [item.slug, item.visible])).toEqual([['outils-en-ligne', true], ['beaute-et-soins', false], ['mode', false], ['high-tech-et-maison', false], ['autres', false]]);
    expect(list[0]).toMatchObject({ families: 14, tools: 3 });
  });
});

describe('visibilité et rangement', () => {
  it('cache une marque déplacée dans un univers éteint, et la montre une fois l’univers allumé', async () => {
    expect(await moveToolsToUniverses(db, [{ toolId: ids.shein, universe: 'mode' }, { toolId: ids.nordvpn, universe: 'outils-en-ligne' }])).toEqual({ ok: true, data: { moved: 1 } });
    // L'univers vide reçoit sa famille et sa catégorie d'accueil ; un second rangement les reprend.
    const [home] = await db.select().from(schema.categories).where(eq(schema.categories.slug, 'mode'));
    expect(home.familySlug).toBe('mode');
    expect(await moveToolsToUniverses(db, [{ toolId: ids.huel, universe: 'autres' }])).toEqual({ ok: true, data: { moved: 1 } });
    expect((await db.select().from(schema.categories).where(eq(schema.categories.slug, 'autres-marques')))[0].familySlug).toBe('autres-marques');
    expect((await listUniverses(db)).find(item => item.slug === 'mode')).toMatchObject({ families: 1, tools: 1 });
    const catalog = await loadCatalog(db);
    expect(catalog.tools.find(tool => tool.slug === 'shein')?.universe).toBe('mode');
    expect(publicCatalog(catalog).tools.map(tool => tool.slug)).toEqual(['nordvpn']);
    expect(publicCatalog(catalog).codes.every(code => code.toolSlug === 'nordvpn')).toBe(true);
    expect(await setUniverseVisible(db, 'mode', true)).toMatchObject({ ok: true });
    expect(publicCatalog(await loadCatalog(db)).tools.map(tool => tool.slug).sort()).toEqual(['nordvpn', 'shein']);
    expect(await moveToolsToUniverses(db, [{ toolId: ids.nordvpn, universe: 'nulle-part' }])).toEqual({ ok: false, error: 'Univers introuvable.' });
  });
  it('les outils en ligne ne peuvent pas être cachés', async () => {
    expect(await setUniverseVisible(db, 'outils-en-ligne', false)).toEqual({ ok: false, error: 'Les outils en ligne restent toujours visibles.' });
    expect(await setUniverseVisible(db, 'inconnu', true)).toEqual({ ok: false, error: 'Univers introuvable.' });
  });
  it('une famille changée d’univers emporte ses outils', async () => {
    expect(await setFamilyUniverse(db, 'securite', 'autres')).toMatchObject({ ok: true, data: { universe: 'autres' } });
    expect((await loadCatalog(db)).tools.find(tool => tool.slug === 'nordvpn')?.universe).toBe('autres');
    expect(await setFamilyUniverse(db, 'securite', 'nulle-part')).toEqual({ ok: false, error: 'Univers introuvable.' });
  });
  it('refuse une liste mal formée', async () => {
    expect(await moveToolsToUniverses(db, [])).toMatchObject({ ok: false });
    expect(await moveToolsToUniverses(db, [{ toolId: 'x', universe: 'mode' }])).toEqual({ ok: false, error: 'Requête invalide.' });
  });
});

describe('cleanSortItems', () => {
  const batch = [{ id: 'a', name: 'SHEIN', category: 'Boutiques' }, { id: 'b', name: 'Notion', category: 'Notes' }];
  const known = new Set(['outils-en-ligne', 'mode']);
  it('garde les marques de la liste rangées dans un univers connu, sans doublon ni « Outils en ligne »', () => {
    expect(cleanSortItems({ items: [{ n: 1, universe: 'mode', reason: 'vêtements' }, { n: 1, universe: 'mode', reason: '' }, { n: 2, universe: 'outils-en-ligne', reason: '' }, { n: 3, universe: 'mode', reason: '' }, { n: 2, universe: 'cuisine', reason: '' }] }, batch, known))
      .toEqual([{ toolId: 'a', name: 'SHEIN', category: 'Boutiques', universe: 'mode', reason: 'vêtements' }]);
    expect(cleanSortItems('oops', batch, known)).toEqual([]);
  });
});

describe('sortToolsByUniverse', () => {
  it('a besoin de l’IA', async () => {
    expect(await sortToolsByUniverse(db, { ai: { config: aiConfigFrom({}), create: null } }, 0)).toEqual({ ok: false, error: 'L’IA n’est pas encore activée.' });
  });
  it('lit les outils en ligne par lot et note la dépense', async () => {
    const create = reply({ items: [{ n: 1, universe: 'beaute-et-soins', reason: 'compléments alimentaires' }, { n: 3, universe: 'mode', reason: 'vêtements' }] });
    const result = await sortToolsByUniverse(db, on(create), 0);
    expect(result).toMatchObject({ ok: true, data: { read: 3, total: 3, next: null } });
    if (!result.ok) return;
    expect(result.data.proposals.map(item => [item.name, item.universe])).toEqual([['Huel', 'beaute-et-soins'], ['SHEIN', 'mode']]);
    const prompt = JSON.stringify((create.mock.calls[0] as unknown[])[0]);
    expect(prompt).toContain('2. NordVPN');
    expect(await db.select().from(schema.aiUsage).where(eq(schema.aiUsage.purpose, 'universe_sort'))).toHaveLength(1);
  });
});
