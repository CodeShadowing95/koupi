import { describe, expect, it } from 'vitest';
import type { Code } from './data';
import { buildCommandIndex, highlightParts, searchCommands } from './admin-command';

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
    expect(searchCommands(index, 'editeur')[0].items[0]).toMatchObject({ label: 'Éditeur', detail: 'Création · archivé' });
    expect(searchCommands(index, 'csv')[0].items.map(item => item.href)).toEqual(['/api/admin/export?type=codes', '/api/admin/export?type=propositions']);
  });
  it('caps each group', () => {
    const many = buildCommandIndex({ codes: Array.from({ length: 9 }, (_, i) => code(String(i), `X${i}`, 'Notion')), tools: [], creators: [], proposals: [] });
    expect(searchCommands(many, 'notion', 5).find(group => group.kind === 'code')?.items).toHaveLength(5);
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
