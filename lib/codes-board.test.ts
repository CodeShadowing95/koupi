import { describe, expect, it } from 'vitest';
import type { Code, Tool } from './data';
import { compactCount, DEFAULT_FILTERS, featuredCodes, filterCodes, parseFilters } from './codes-board';

const tool = (slug: string, category: string): Tool => ({ slug, name: slug, category, website: '', description: '', priority: 1, codes: 1 });
const code = (id: string, over: Partial<Code> = {}): Code => ({
  id, tool: 'nord', toolSlug: 'nord', creator: 'Léa', creatorSlug: 'lea', code: id.toUpperCase(), discount: '-10 %', status: 'verified',
  source: '', sourceTitle: '', votes: 10, success: 50, lastTestedAt: null, paymentTestedAt: null, expiresOn: null, createdAt: '2026-11-01', ...over,
});
const tools = [tool('nord', 'VPN'), tool('canva', 'Design')];

describe('featuredCodes', () => {
  it('met les vérifiés en premier, puis complète avec les codes à tester', () => {
    const codes = [code('a', { status: 'to_test', success: 99 }), code('b', { success: 60 }), code('c', { success: 80 })];
    expect(featuredCodes(codes, 3).map(c => c.id)).toEqual(['c', 'b', 'a']);
  });
  it('respecte la limite', () => {
    expect(featuredCodes([code('a'), code('b'), code('c')], 2)).toHaveLength(2);
  });
});

describe('filterCodes', () => {
  const codes = [
    code('a', { success: 90, votes: 5, createdAt: '2026-10-01' }),
    code('b', { tool: 'Canva', toolSlug: 'canva', creator: 'Max', success: 70, votes: 40, status: 'to_test', createdAt: '2026-11-02' }),
  ];
  it('cherche dans l\'outil, le créateur et le code, sans accents ni casse', () => {
    expect(filterCodes(codes, tools, { ...DEFAULT_FILTERS, query: 'lea' }).map(c => c.id)).toEqual(['a']);
    expect(filterCodes(codes, tools, { ...DEFAULT_FILTERS, query: 'canva' }).map(c => c.id)).toEqual(['b']);
    expect(filterCodes(codes, tools, { ...DEFAULT_FILTERS, query: 'B' }).map(c => c.id)).toEqual(['b']);
  });
  it('filtre par catégorie et par statut', () => {
    expect(filterCodes(codes, tools, { ...DEFAULT_FILTERS, category: 'VPN' }).map(c => c.id)).toEqual(['a']);
    expect(filterCodes(codes, tools, { ...DEFAULT_FILTERS, status: 'to_test' }).map(c => c.id)).toEqual(['b']);
  });
  it('trie par réussite, par votes ou par date', () => {
    expect(filterCodes(codes, tools, DEFAULT_FILTERS).map(c => c.id)).toEqual(['a', 'b']);
    expect(filterCodes(codes, tools, { ...DEFAULT_FILTERS, sort: 'votes' }).map(c => c.id)).toEqual(['b', 'a']);
    expect(filterCodes(codes, tools, { ...DEFAULT_FILTERS, sort: 'recent' }).map(c => c.id)).toEqual(['b', 'a']);
  });
});

describe('parseFilters', () => {
  it('garde les valeurs connues et ignore le reste', () => {
    expect(parseFilters({ q: 'nord', category: 'VPN', status: 'to_test', sort: 'votes' })).toEqual({ query: 'nord', category: 'VPN', status: 'to_test', sort: 'votes' });
    expect(parseFilters({ status: 'pending', sort: 'x', q: ['a', 'b'] })).toEqual(DEFAULT_FILTERS);
  });
});

describe('compactCount', () => {
  it('donne le nombre exact sous 100', () => {
    expect(compactCount(0)).toBe('0');
    expect(compactCount(31)).toBe('31');
    expect(compactCount(99)).toBe('99');
  });
  it('écrit +99 de 100 à 999', () => {
    expect(compactCount(100)).toBe('+99');
    expect(compactCount(999)).toBe('+99');
  });
  it('arrondit aux milliers puis aux millions, vers le bas', () => {
    expect(compactCount(1000)).toBe('+1K');
    expect(compactCount(2999)).toBe('+2K');
    expect(compactCount(999_999)).toBe('+999K');
    expect(compactCount(1_000_000)).toBe('+1M');
    expect(compactCount(2_500_000)).toBe('+2M');
  });
});
