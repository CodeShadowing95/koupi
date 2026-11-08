import { eq } from 'drizzle-orm';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import type { AdminTool } from './catalog-admin';
import type Anthropic from '@anthropic-ai/sdk';
import { aiConfigFrom } from './ai-extract';
import type { CreatorFinder } from './compilation-creator';
import { searchCategoryCodes, toolsToSearch, youtubeSearch, type FoundVideo, type YoutubeSearch } from './category-code-search';

const now = new Date('2026-11-04T05:00:00Z');

const tool = (name: string, categorySlug: string, extra: Partial<AdminTool> = {}): AdminTool => ({
  id: name, slug: name.toLowerCase(), name, categorySlug, category: categorySlug, website: `https://${name.toLowerCase()}.com`,
  description: null, priority: 3, codes: 0, visible: 0, archived: false, creators: 0, ...extra,
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
  });
  it('cherche aussi une catégorie déjà couverte quand on la choisit, les outils sans code d’abord', () => {
    expect(toolsToSearch(all, { categorySlug: 'vpn' }).tools.map(item => item.name)).toEqual(['Surfshark', 'NordVPN']);
  });
  it('cherche un seul outil choisi, même déjà couvert, jamais un outil archivé', () => {
    expect(toolsToSearch(all, { toolId: 'NordVPN' })).toMatchObject({ tools: [{ name: 'NordVPN' }], remaining: 0 });
    expect(toolsToSearch(all, { toolId: 'Vieux' }).tools).toEqual([]);
  });
});

describe('youtubeSearch', () => {
  it('cherche les vidéos de l’année puis lit leurs descriptions complètes', async () => {
    const fetchFn = vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('/search?')
      ? { items: [{ id: { videoId: 'abc' } }, { id: {} }] }
      : { items: [{ id: 'abc', snippet: { title: 'Avis', description: 'code X', channelTitle: 'Chaîne', channelId: 'UC1' } }] })));
    const youtube = youtubeSearch('KEY', fetchFn as unknown as typeof fetch)!;
    expect(await youtube.search('Notion code promo', { max: 8, publishedAfter: new Date('2025-11-04T00:00:00Z') })).toEqual(['abc']);
    const searchUrl = new URL(fetchFn.mock.calls[0][0]);
    expect(Object.fromEntries(searchUrl.searchParams)).toMatchObject({ q: 'Notion code promo', type: 'video', maxResults: '8', publishedAfter: '2025-11-04T00:00:00.000Z', key: 'KEY' });
    expect(await youtube.videos(['abc'])).toEqual([{ id: 'abc', title: 'Avis', description: 'code X', channelTitle: 'Chaîne', channelId: 'UC1' }]);
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
    videos: vi.fn(async (ids: string[]) => ids.map(id => Object.values(videos).flat().find(video => video.id === id)).filter((video): video is FoundVideo => Boolean(video))),
  });

  it('ajoute en attente les codes trouvés dans les vidéos, crédités à la chaîne, et propose les outils inconnus', async () => {
    const youtube = fake({
      'Notion code promo': [
        { id: 'v1', title: 'Mon setup', description: 'Notion : -50 % avec le code SETUP50\nGradium : gradium.ai code GRAD10', channelTitle: 'Tuto Prod' },
        { id: 'v2', title: 'Rien à voir', description: 'Pas de code ici', channelTitle: 'Autre' },
      ],
    });
    const report = await searchCategoryCodes(db, youtube, { now });
    expect(report).toMatchObject({ tools: 2, searches: 2, remaining: 0, videos: 2, units: 201, found: [{ tool: 'Notion', code: 'SETUP50', creator: 'Tuto Prod' }], suggested: [{ tool: 'gradium.ai', code: 'GRAD10' }], failed: [] });
    const [code] = await db.select().from(schema.codes);
    expect(code).toMatchObject({ code: 'SETUP50', discount: '-50 %', status: 'pending', sourceUrl: 'https://www.youtube.com/watch?v=v1', sourceTitle: 'Mon setup' });
    const [creator] = await db.select().from(schema.creators);
    expect(creator.name).toBe('Tuto Prod');
    const [log] = await db.select().from(schema.codeLogs);
    expect(log.note).toBe('Recherche des catégories vides : Notion');
    // Relancer ne recrée ni le code ni la suggestion, et change de formulation.
    const again = await searchCategoryCodes(db, youtube, { now });
    expect(again.variants).toEqual(['code réduction', 'code réduction']);
    expect(again.found).toEqual([]);
    expect(again.suggested).toEqual([]);
    expect(await db.select().from(schema.codes)).toHaveLength(1);
  });

  it('cherche une catégorie choisie : ses outils puis son nom, pour trouver des outils absents du catalogue', async () => {
    const youtube = fake({ 'VPN code promo': [{ id: 'v9', title: 'Top VPN', description: 'Mullvad : mullvad.net code MULL20\nNordVPN code NORD70', channelTitle: 'Geek' }] });
    const report = await searchCategoryCodes(db, youtube, { categorySlug: 'vpn', now });
    expect(report).toMatchObject({ tools: 1, searches: 2, units: 201, found: [{ tool: 'NordVPN', code: 'NORD70' }], suggested: [{ tool: 'mullvad.net', code: 'MULL20' }] });
    expect(vi.mocked(youtube.search).mock.calls.map(call => call[0])).toEqual(['NordVPN code promo', 'VPN code promo']);
    const [log] = await db.select().from(schema.codeLogs);
    expect(log.note).toBe('Recherche ciblée VPN : VPN');
  });

  it('cherche un seul outil : une seule recherche, notée dans le journal et dans l’origine du code', async () => {
    const [nord] = await db.select().from(schema.tools).where(eq(schema.tools.slug, 'nordvpn'));
    const youtube = fake({ 'NordVPN code promo': [{ id: 'v5', title: 'VPN', description: 'NordVPN code NORD70', channelTitle: 'Geek' }] });
    const report = await searchCategoryCodes(db, youtube, { toolId: nord.id, now });
    expect(report).toMatchObject({ tools: 1, searches: 1, units: 101, found: [{ tool: 'NordVPN', code: 'NORD70' }] });
    const [log] = await db.select().from(schema.codeLogs);
    expect(log.note).toBe('Recherche ciblée NordVPN : NordVPN');
  });

  it('écarte les vidéos déjà lues, change de formulation et compte les chaînes nouvelles ou connues', async () => {
    const [nord] = await db.select().from(schema.tools).where(eq(schema.tools.slug, 'nordvpn'));
    const [known] = await db.insert(schema.creators).values({ slug: 'geek', name: 'Geek' }).returning();
    await db.insert(schema.creatorAccounts).values({ creatorId: known.id, platform: 'youtube', externalId: 'UC-geek', handle: '@geek', url: 'https://youtube.com/@geek' });
    const v1 = { id: 'v1', title: 'VPN', description: 'NordVPN code NORD70', channelTitle: 'Geek', channelId: 'UC-geek' };
    const v2 = { id: 'v2', title: 'VPN 2', description: 'Rien', channelTitle: 'Neuf', channelId: 'UC-new' };
    const v3 = { id: 'v3', title: 'VPN 3', description: 'NordVPN promo code NEW30', channelTitle: 'Neuf', channelId: 'UC-new' };
    const youtube = fake({ 'NordVPN code promo': [v1, v2], 'NordVPN code réduction': [v1, v2, v3] });
    const first = await searchCategoryCodes(db, youtube, { toolId: nord.id, now });
    expect(first).toMatchObject({ variants: ['code promo'], videos: 2, skipped: 0, newChannels: 1, knownChannels: 1 });
    const second = await searchCategoryCodes(db, youtube, { toolId: nord.id, now: new Date(now.getTime() + 3600_000) });
    expect(second).toMatchObject({ variants: ['code réduction'], videos: 1, skipped: 2, newChannels: 0, knownChannels: 1, found: [{ code: 'NEW30' }] });
    expect(vi.mocked(youtube.videos).mock.calls.at(-1)?.[0]).toEqual(['v3']);
    const searches = await db.select().from(schema.youtubeSearches);
    expect(searches.map(row => [row.variant, row.videos, row.newVideos, row.codes])).toEqual([['code promo', 2, 2, 1], ['code réduction', 3, 1, 1]]);
    const seen = await db.select().from(schema.youtubeSeenVideos);
    expect(seen.map(row => [row.videoId, row.channelId, row.codes]).sort()).toEqual([['v1', 'UC-geek', 1], ['v2', 'UC-new', 0], ['v3', 'UC-new', 1]]);
  });

  it('crédite au créateur nommé les codes d’une vidéo « compilation », sans les classer clairs', async () => {
    const description = '1. NordVPN — code NOZMAN (Dr Nozman)\n2. Notion — code ASTRO (Astronogeek)\n3. NordVPN — code BACK10';
    const video = { id: 'vc', title: 'Les codes des YouTubeurs', description, channelTitle: 'Backed', channelId: 'UC-backed' };
    const youtube = fake({ 'Notion code promo': [video] });
    const create = vi.fn(async () => ({
      id: 'm', type: 'message', role: 'assistant', model: 'claude-haiku-5-5', stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 10 },
      content: [{ type: 'text', text: JSON.stringify({ codes: [
        { code: 'NOZMAN', tool: 'NordVPN', creator: 'Dr Nozman', discount: '', conditions: '', expires_on: '' },
        { code: 'ASTRO', tool: 'Notion', creator: 'Astronogeek', discount: '', conditions: '', expires_on: '' },
        { code: 'BACK10', tool: 'NordVPN', creator: '', discount: '', conditions: '', expires_on: '' },
      ] }) }],
    }) as unknown as Anthropic.Beta.BetaMessage);
    const creators: CreatorFinder = {
      searchChannels: vi.fn(async (name: string) => name === 'Dr Nozman' ? [{ id: 'UC-noz', title: 'Dr Nozman' }] : []),
      channels: vi.fn(async (ids: string[]) => new Map(ids.map(id => [id, { id, handle: '@drnozman', url: 'https://www.youtube.com/@drnozman', subscribers: 1 }]))),
    };
    const deps = { readSource: async () => ({ online: true, title: video.title, description }), ai: { config: aiConfigFrom({ ANTHROPIC_API_KEY: 'k' }), create } };
    const report = await searchCategoryCodes(db, youtube, { now, deps, creators });
    expect(report.found.map(item => [item.code, item.creator]).sort()).toEqual([['ASTRO', 'Astronogeek'], ['BACK10', 'Backed'], ['NOZMAN', 'Dr Nozman']]);
    const rows = await db.select({ code: schema.codes.code, note: schema.codes.note, creator: schema.creators.name }).from(schema.codes).innerJoin(schema.creators, eq(schema.creators.id, schema.codes.creatorId));
    const byCode = new Map(rows.map(row => [row.code, row]));
    expect(byCode.get('NOZMAN')).toMatchObject({ creator: 'Dr Nozman', note: expect.stringMatching(/^Repris d’une compilation de Backed/) });
    expect(byCode.get('BACK10')).toMatchObject({ creator: 'Backed', note: expect.stringMatching(/^Trouvé par la recherche/) });
    const checks = await db.select({ score: schema.verificationChecks.score, reasons: schema.verificationChecks.reasons, code: schema.codes.code }).from(schema.verificationChecks).innerJoin(schema.codes, eq(schema.codes.id, schema.verificationChecks.codeId));
    const nozman = checks.find(check => check.code === 'NOZMAN')!;
    expect(nozman.score).toBeLessThan(60);
    expect(nozman.reasons.map(reason => reason.label)).toContain('Code repris d’une compilation d’une autre chaîne : vérifie-le chez le créateur crédité avant de le valider.');
    expect(creators.searchChannels).toHaveBeenCalledTimes(2);
  });

  it('s’arrête au premier refus de YouTube (quota épuisé)', async () => {
    const youtube = fake({}, new Error('YouTube API search 403'));
    const report = await searchCategoryCodes(db, youtube, { now });
    expect(report.failed).toEqual(['Notion']);
    expect(youtube.search).toHaveBeenCalledTimes(1);
  });
});
