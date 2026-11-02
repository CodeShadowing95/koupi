import { describe, expect, it } from 'vitest';
import type { Code } from './data';
import { buildCommandIndex, countByKind, cycleFilter, highlightParts, parseRecent, pushRecent, searchCommands, suggestCommands } from './admin-command';

const code = (id: string, value: string, tool: string): Code => ({
  id, tool, toolSlug: tool.toLowerCase(), creator: 'Ali', creatorSlug: 'ali', code: value, discount: '-20 %', status: 'to_test',
  source: 'https://x.y', sourceTitle: '', votes: 0, success: 0, lastTestedAt: null, createdAt: '2026-10-01T00:00:00.000Z',
});

const index = buildCommandIndex({
  codes: [code('1', 'NOTION20', 'Notion'), code('2', 'CANVA', 'Canva')],
  tools: [{ name: 'Notion', category: 'Productivité', archived: false }, { name: 'Éditeur', category: 'Création', archived: true }],
  creators: [{ name: 'Ali Abdaal', codes: 2 }],
  proposals: [{ code: 'NOTIONX', toolName: 'Notion', creatorName: 'Bea' }],
});

describe('searchCommands', () => {
  it('shows nothing until something is typed', () => {
    expect(searchCommands(index, '')).toEqual([]);
    expect(searchCommands(index, '   ')).toEqual([]);
  });
  it('groups matches by kind in a fixed order and links to filtered lists', () => {
    const groups = searchCommands(index, 'notion');
    expect(groups.map(group => group.kind)).toEqual(['code', 'tool', 'proposal']);
    expect(groups[0].items[0]).toMatchObject({ label: 'NOTION20', href: '/admin/codes?q=NOTION20' });
    expect(groups[2].items[0].href).toBe('/admin/propositions?q=NOTIONX');
  });
  it('ignores accents and finds pages by keyword', () => {
    expect(searchCommands(index, 'editeur')[0].items[0]).toMatchObject({ label: 'Éditeur', detail: 'Création', status: 'archived' });
    expect(searchCommands(index, 'excel')[0].items.map(item => item.href)).toEqual(['codes', 'propositions', 'outils', 'createurs', 'categories'].map(type => `/api/admin/export?type=${type}&format=xlsx`));
  });
  it('caps each group', () => {
    const many = buildCommandIndex({ codes: Array.from({ length: 9 }, (_, i) => code(String(i), `X${i}`, 'Notion')), tools: [], creators: [], proposals: [] });
    const group = searchCommands(many, 'notion', 5).find(item => item.kind === 'code');
    expect(group?.items).toHaveLength(5);
    expect(group?.total).toBe(9);
  });
  it('shows more of one kind when a filter is chosen', () => {
    const many = buildCommandIndex({ codes: Array.from({ length: 9 }, (_, i) => code(String(i), `X${i}`, 'Notion')), tools: [{ name: 'Notion', category: 'P', archived: false }], creators: [], proposals: [] });
    const groups = searchCommands(many, 'notion', 5, 'code');
    expect(groups.map(group => group.kind)).toEqual(['code']);
    expect(groups[0].items).toHaveLength(9);
  });
  it('finds codes by status and shows it as a badge', () => {
    const codes = searchCommands(index, 'a tester').find(group => group.kind === 'code');
    expect(codes?.items[0]).toMatchObject({ detail: 'Notion · Ali', status: 'to_test' });
  });
});

describe('suggestions before typing', () => {
  it('shows recents first, then quick access, pages and exports, without duplicates', () => {
    const groups = suggestCommands(index, ['/admin/stats', '/admin/codes?q=NOTION20', '/gone']);
    expect(groups.map(group => group.id)).toEqual(['recent', 'quick', 'pages', 'actions']);
    expect(groups[0].items.map(item => item.label)).toEqual(['Statistiques', 'NOTION20']);
    expect(groups[1].items.map(item => item.href)).toEqual(['/admin/propositions', '/admin/codes?status=to_test', '/admin/codes?status=retest']);
    const hrefs = groups.flatMap(group => group.items.map(item => item.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(groups[3].items.every(item => item.href.startsWith('/api/'))).toBe(true);
  });
  it('skips the recent group when there is none', () => {
    expect(suggestCommands(index, [])[0].id).toBe('quick');
  });
  it('lets you browse one kind when a filter is chosen', () => {
    const groups = suggestCommands(index, [], 'tool');
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ kind: 'tool', total: 2 });
  });
});

describe('recents', () => {
  it('puts the last opened link first without duplicates and keeps five', () => {
    expect(pushRecent(['/a', '/b'], '/b')).toEqual(['/b', '/a']);
    expect(pushRecent(['1', '2', '3', '4', '5'], '6')).toEqual(['6', '1', '2', '3', '4']);
  });
  it('reads stored recents safely', () => {
    expect(parseRecent(null)).toEqual([]);
    expect(parseRecent('oops')).toEqual([]);
    expect(parseRecent('["/a",3,"/b"]')).toEqual(['/a', '/b']);
  });
});

describe('filters', () => {
  it('counts matches per kind', () => {
    expect(countByKind(index, 'notion')).toEqual({ all: 3, page: 0, code: 1, tool: 1, creator: 0, proposal: 1 });
    expect(countByKind(index, '')).toMatchObject({ all: index.length, code: 2, tool: 2, creator: 1, proposal: 1 });
  });
  it('cycles through filters both ways', () => {
    expect(cycleFilter('all', 1)).toBe('page');
    expect(cycleFilter('proposal', 1)).toBe('all');
    expect(cycleFilter('all', -1)).toBe('proposal');
  });
});

describe('highlightParts', () => {
  it('marks typed words, ignoring case and accents', () => {
    expect(highlightParts('Éditeur vidéo', 'edi VIDEO')).toEqual([
      { text: 'Édi', match: true }, { text: 'teur ', match: false }, { text: 'vidéo', match: true },
    ]);
  });
  it('returns the label untouched without a query or a match', () => {
    expect(highlightParts('Notion', ' ')).toEqual([{ text: 'Notion', match: false }]);
    expect(highlightParts('Notion', 'zz')).toEqual([{ text: 'Notion', match: false }]);
  });
  it('marks every occurrence', () => {
    expect(highlightParts('a-a', 'a').filter(part => part.match)).toHaveLength(2);
  });
});
