import { describe, expect, it } from 'vitest';
import type { Code, Tool } from './data';
import { browseCategory, categoryParams, DEFAULT_CATEGORY_FILTERS, hasCategoryFilter, parseCategoryFilters } from './category-browse';

const NOW = Date.parse('2026-11-03T12:00:00Z');
const tool = (slug: string): Tool => ({ slug, name: slug[0].toUpperCase() + slug.slice(1), category: 'VPN', website: '', description: '', priority: 1, codes: 1 });
const code = (id: string, toolSlug: string, over: Partial<Code> = {}): Code => ({
  id, tool: toolSlug[0].toUpperCase() + toolSlug.slice(1), toolSlug, creator: 'Léa', creatorSlug: 'lea', code: id.toUpperCase(), discount: '-10 %', status: 'verified',
  source: '', sourceTitle: '', votes: 10, success: 50, lastTestedAt: null, paymentTestedAt: null, expiresOn: null, createdAt: '2026-11-01', ...over,
});
const tools = [tool('nord'), tool('proton'), tool('surfshark')];
const codes = [
  code('a', 'nord', { success: 90 }),
  code('b', 'nord', { status: 'to_test', success: 20, createdAt: '2026-11-03' }),
  code('c', 'proton', { creator: 'Max', creatorSlug: 'max', success: 60 }),
  code('z', 'canva'), // autre catégorie
];
const run = (patch: Partial<typeof DEFAULT_CATEGORY_FILTERS>) => browseCategory(codes, tools, { ...DEFAULT_CATEGORY_FILTERS, ...patch }, NOW);

describe('browseCategory', () => {
  it('sans filtre, garde les codes de la catégorie, les plus fiables d’abord', () => {
    expect(run({}).codes.map(c => c.id)).toEqual(['a', 'c', 'b']);
  });
  it('range les outils du plus de codes au moins et cache ceux sans code', () => {
    expect(run({}).tools.map(t => t.slug)).toEqual(['nord', 'proton']);
  });
  it('filtre par statut et compte chaque statut', () => {
    const view = run({ status: 'to_test' });
    expect(view.codes.map(c => c.id)).toEqual(['b']);
    expect(view.tools.map(t => t.slug)).toEqual(['nord']);
    expect(view.counts.status).toEqual({ all: 3, verified: 2, to_test: 1 });
  });
  it('filtre par outil et compte les codes de chaque outil', () => {
    const view = run({ tool: 'proton' });
    expect(view.codes.map(c => c.id)).toEqual(['c']);
    expect(view.tools.map(t => t.slug)).toEqual(['proton']);
    expect(view.counts.tool).toEqual({ nord: 2, proton: 1 });
  });
  it('cherche dans le créateur et le code', () => {
    expect(run({ query: 'max' }).codes.map(c => c.id)).toEqual(['c']);
    expect(run({ query: 'B' }).codes.map(c => c.id)).toEqual(['b']);
  });
  it('garde un outil trouvé par son nom même sans code correspondant', () => {
    expect(run({ query: 'surf' }).tools.map(t => t.slug)).toEqual(['surfshark']);
  });
  it('trie par date', () => {
    expect(run({ sort: 'recent' }).codes[0].id).toBe('b');
  });
});

describe('parseCategoryFilters / categoryParams', () => {
  const slugs = tools.map(t => t.slug);
  it('lit les filtres valides', () => {
    expect(parseCategoryFilters({ q: 'nord', status: 'verified', tool: 'proton', sort: 'recent' }, slugs))
      .toEqual({ query: 'nord', status: 'verified', tool: 'proton', sort: 'recent' });
  });
  it('ignore les valeurs inconnues', () => {
    expect(parseCategoryFilters({ status: 'pending', tool: 'canva', sort: 'x', q: ['a', 'b'] }, slugs)).toEqual(DEFAULT_CATEGORY_FILTERS);
  });
  it('n’écrit dans l’adresse que ce qui change', () => {
    expect(categoryParams(DEFAULT_CATEGORY_FILTERS).toString()).toBe('');
    expect(categoryParams({ query: ' nord ', status: 'to_test', tool: 'nord', sort: 'votes' }).toString()).toBe('q=nord&status=to_test&tool=nord&sort=votes');
    expect(hasCategoryFilter(DEFAULT_CATEGORY_FILTERS)).toBe(false);
    expect(hasCategoryFilter({ ...DEFAULT_CATEGORY_FILTERS, tool: 'nord' })).toBe(true);
  });
});
