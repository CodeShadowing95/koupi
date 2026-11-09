import { describe, expect, it } from 'vitest';
import type { Code, Family, Tool } from './data';
import { bestCodesByFamily, blackFridayDate, cyberMondayDate, frenchDay } from './black-friday';

describe('blackFridayDate', () => {
  it('tombe le lendemain du 4e jeudi de novembre', () => {
    expect(blackFridayDate(2026).toISOString().slice(0, 10)).toBe('2026-11-27');
    expect(blackFridayDate(2027).toISOString().slice(0, 10)).toBe('2027-11-26');
    expect(blackFridayDate(2024).toISOString().slice(0, 10)).toBe('2024-11-29');
    expect(cyberMondayDate(2026).toISOString().slice(0, 10)).toBe('2026-11-30');
  });
  it('se lit en français', () => {
    expect(frenchDay(blackFridayDate(2026))).toBe('vendredi 27 novembre 2026');
  });
});

const tool = (slug: string, family?: string): Tool => ({ slug, name: slug, category: 'c', website: '', description: '', priority: 1, codes: 1, family });
const code = (id: string, toolSlug: string, extra: Partial<Code> = {}): Code => ({
  id, tool: toolSlug, toolSlug, creator: 'x', creatorSlug: 'x', code: id, discount: '-10 %', status: 'verified', source: '', sourceTitle: '',
  votes: 0, success: 0, lastTestedAt: null, paymentTestedAt: null, expiresOn: null, createdAt: '2026-11-01', ...extra,
});

describe('bestCodesByFamily', () => {
  const families: Family[] = [{ slug: 'secu', name: 'Sécurité' }, { slug: 'web', name: 'Web' }];
  const tools = [tool('nordvpn', 'secu'), tool('surfshark', 'secu'), tool('hostinger', 'web'), tool('vide', 'web'), tool('seul')];
  const codes = [
    code('a', 'nordvpn', { status: 'to_test', success: 95 }),
    code('b', 'nordvpn', { success: 60 }),
    code('c', 'surfshark', { success: 80 }),
    code('d', 'hostinger', { status: 'pending', success: 99 }),
    code('e', 'hostinger', { status: 'to_test', success: 10 }),
    code('f', 'seul'),
  ];
  it('garde un code par outil, le vérifié avant le plus voté, et range par famille', () => {
    const groups = bestCodesByFamily(codes, tools, families);
    expect(groups.map(group => [group.family?.slug ?? null, group.picks.map(pick => pick.code.id)])).toEqual([
      ['secu', ['c', 'b']],
      ['web', ['e']],
      [null, ['f']],
    ]);
  });
});
