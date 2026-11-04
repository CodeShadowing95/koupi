import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import type { AdminTool } from './catalog-admin';
import { searchCategoryCodes, toolsToSearch, youtubeSearch, type FoundVideo, type YoutubeSearch } from './category-code-search';

const now = new Date('2026-11-04T05:00:00Z');

const tool = (name: string, categorySlug: string, extra: Partial<AdminTool> = {}): AdminTool => ({
  id: name, slug: name.toLowerCase(), name, categorySlug, category: categorySlug, website: `https://${name.toLowerCase()}.com`,
  description: null, priority: 3, codes: 0, visible: 0, archived: false, ...extra,
});

describe('toolsToSearch', () => {
  const all = [
    tool('NordVPN', 'vpn', { visible: 1, codes: 1 }), tool('Surfshark', 'vpn'),
    tool('Notion', 'productivite', { priority: 2 }), tool('Asana', 'productivite', { priority: 2, codes: 2 }), tool('Todoist', 'productivite', { priority: 1 }),
    tool('Udemy', 'formation'), tool('Vieux', 'formation', { archived: true }),
  ];
  it('ne garde que les outils des catégories sans code visible, priorité 1 d’abord, puis les moins couverts', () => {
    expect(toolsToSearch(all).tools.map(item => item.name)).toEqual(['Todoist', 'Notion', 'Asana', 'Udemy']);
  });
  it('se limite à une catégorie et compte ce qui reste au-delà du plafond', () => {
    expect(toolsToSearch(all, { categorySlug: 'productivite', max: 2 })).toMatchObject({ tools: [{ name: 'Todoist' }, { name: 'Notion' }], remaining: 1 });
    expect(toolsToSearch(all, { categorySlug: 'vpn' }).tools).toEqual([]);
  });
});

describe('youtubeSearch', () => {
  it('cherche les vidéos de l’année puis lit leurs descriptions complètes', async () => {
    const fetchFn = vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('/search?')
      ? { items: [{ id: { videoId: 'abc' } }, { id: {} }] }
      : { items: [{ id: 'abc', snippet: { title: 'Avis', description: 'code X', channelTitle: 'Chaîne' } }] })));
    const youtube = youtubeSearch('KEY', fetchFn as unknown as typeof fetch)!;
    expect(await youtube.search('Notion code promo', { max: 8, publishedAfter: new Date('2025-11-04T00:00:00Z') })).toEqual(['abc']);
    const searchUrl = new URL(fetchFn.mock.calls[0][0]);
    expect(Object.fromEntries(searchUrl.searchParams)).toMatchObject({ q: 'Notion code promo', type: 'video', maxResults: '8', publishedAfter: '2025-11-04T00:00:00.000Z', key: 'KEY' });
    expect(await youtube.videos(['abc'])).toEqual([{ id: 'abc', title: 'Avis', description: 'code X', channelTitle: 'Chaîne' }]);
    expect(youtubeSearch(undefined)).toBeNull();
  });
});

describe('searchCategoryCodes', () => {
  let db: Db;
  beforeEach(async () => {
    db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    await db.insert(schema.categories).values([{ slug: 'productivite', name: 'Productivité' }, { slug: 'vpn', name: 'VPN' }]);
    await db.insert(schema.tools).values([
      { slug: 'notion', name: 'Notion', categorySlug: 'productivite', website: 'https://notion.so', priority: 1 },
      { slug: 'nordvpn', name: 'NordVPN', categorySlug: 'vpn', website: 'https://nordvpn.com' },
    ]);
  });

  const fake = (videos: Record<string, FoundVideo[]>, fail?: Error): YoutubeSearch => ({
    search: vi.fn(async (query: string) => { if (fail) throw fail; return (videos[query] ?? []).map(video => video.id); }),
    videos: vi.fn(async (ids: string[]) => Object.values(videos).flat().filter(video => ids.includes(video.id))),
  });

  it('ajoute en attente les codes trouvés dans les vidéos, crédités à la chaîne, et propose les outils inconnus', async () => {
    const youtube = fake({
      'Notion code promo': [
        { id: 'v1', title: 'Mon setup', description: 'Notion : -50 % avec le code SETUP50\nGradium : gradium.ai code GRAD10', channelTitle: 'Tuto Prod' },
        { id: 'v2', title: 'Rien à voir', description: 'Pas de code ici', channelTitle: 'Autre' },
      ],
    });
    const report = await searchCategoryCodes(db, youtube, { now });
    expect(report).toMatchObject({ tools: 2, remaining: 0, videos: 2, units: 201, found: [{ tool: 'Notion', code: 'SETUP50', creator: 'Tuto Prod' }], suggested: [{ tool: 'gradium.ai', code: 'GRAD10' }], failed: [] });
    const [code] = await db.select().from(schema.codes);
    expect(code).toMatchObject({ code: 'SETUP50', discount: '-50 %', status: 'pending', sourceUrl: 'https://www.youtube.com/watch?v=v1', sourceTitle: 'Mon setup' });
    const [creator] = await db.select().from(schema.creators);
    expect(creator.name).toBe('Tuto Prod');
    const [log] = await db.select().from(schema.codeLogs);
    expect(log.note).toBe('Recherche des catégories vides : Notion');
    // Relancer ne recrée ni le code ni la suggestion.
    const again = await searchCategoryCodes(db, youtube, { now });
    expect(again.found).toEqual([]);
    expect(again.suggested).toEqual([]);
    expect(await db.select().from(schema.codes)).toHaveLength(1);
  });

  it('ne cherche que la catégorie demandée', async () => {
    const youtube = fake({});
    const report = await searchCategoryCodes(db, youtube, { categorySlug: 'vpn', now });
    expect(report.tools).toBe(1);
    expect(youtube.search).toHaveBeenCalledWith('NordVPN code promo', expect.objectContaining({ max: 8 }));
  });

  it('s’arrête au premier refus de YouTube (quota épuisé)', async () => {
    const youtube = fake({}, new Error('YouTube API search 403'));
    const report = await searchCategoryCodes(db, youtube, { now });
    expect(report.failed).toEqual(['Notion']);
    expect(youtube.search).toHaveBeenCalledTimes(1);
  });
});
